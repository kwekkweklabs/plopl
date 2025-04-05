import { CHAINS } from "../../config.js";
import { prismaQuery } from "../lib/prisma.js";
import { ethers } from "ethers";
import axios from "axios";
import { RegistryABI } from "../lib/RegistryABI.js";
import { getAlphanumericId } from "../utils/miscUtils.js";

/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {Function} done
 */
export const schemaWorker = (app, _, done) => {
  // Keep track of the latest processed block for each chain
  const latestProcessedBlocks = new Map();
  
  // Track running jobs to prevent overlap
  const runningJobs = new Map();
  
  // Interface for parsing logs
  const registryInterface = new ethers.Interface(RegistryABI);
  
  // Function to fetch the current block number for a chain
  const getCurrentBlockNumber = async (chainConfig) => {
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      return await provider.getBlockNumber();
    } catch (error) {
      console.error(`Failed to get current block number for ${chainConfig.name}:`, error);
      return null;
    }
  };
  
  // Function to fetch and process transactions from a block range
  const fetchAndProcessTransactions = async (chainConfig, fromBlock, toBlock) => {
    // Skip if there's already a job running for this chain
    if (runningJobs.get(chainConfig.id)) {
      console.log(`Job already running for ${chainConfig.name}, skipping`);
      return;
    }
    
    // Mark this chain as having a running job
    runningJobs.set(chainConfig.id, true);
    
    try {
      // Get the addresses we're interested in for this chain
      const plopls = await prismaQuery.schema.findMany({
        where: { chainId: chainConfig.id }
      });
      
      // Create a map of addresses to schema IDs for faster lookups
      const ploplAddressToId = new Map();
      for (const plopl of plopls) {
        ploplAddressToId.set(plopl.registryAddress.toLowerCase(), plopl.id);
      }
      
      const ploplsAddresses = Array.from(ploplAddressToId.keys());
      
      if (ploplsAddresses.length === 0) {
        console.log(`No registry addresses found for chain ${chainConfig.name} (${chainConfig.id})`);
        return;
      }
      
      console.log(`Processing blocks ${fromBlock} to ${toBlock} on ${chainConfig.name} for ${ploplsAddresses.length} contracts`);
      
      // Determine chunk size based on whether we're doing historical or recent blocks
      const isHistorical = (toBlock - fromBlock) > 100;
      // Use larger chunks for historical processing to speed things up
      const CHUNK_SIZE = isHistorical ? 50 : 10;
      
      // Process in chunks to avoid timeouts/rate limits
      for (let currentBlock = fromBlock; currentBlock <= toBlock; currentBlock += CHUNK_SIZE) {
        const endBlock = Math.min(currentBlock + CHUNK_SIZE - 1, toBlock);
        
        // For historical processing, use batch processing
        if (isHistorical) {
          await processBlockRange(chainConfig, currentBlock, endBlock, ploplsAddresses, ploplAddressToId);
        } else {
          // For recent blocks, process each block individually for more detailed logging
          for (let block = currentBlock; block <= endBlock; block++) {
            await processBlock(chainConfig, block, ploplsAddresses, ploplAddressToId);
          }
        }
      }
      
      // Update the latest processed block
      latestProcessedBlocks.set(chainConfig.id, toBlock);
      console.log(`Updated latest processed block for ${chainConfig.name} to ${toBlock}`);
    } catch (error) {
      console.error(`Error processing transactions for ${chainConfig.name}:`, error);
    } finally {
      // Mark job as complete
      runningJobs.set(chainConfig.id, false);
    }
  };
  
  // Function to process a range of blocks at once (optimized for historical processing)
  const processBlockRange = async (chainConfig, fromBlock, toBlock, ploplsAddresses, ploplAddressToId) => {
    try {
      console.log(`Processing block range ${fromBlock}-${toBlock} on ${chainConfig.name}`);
      
      // Process multiple blocks at once for historical data
      const response = await axios.post(
        `https://web3.nodit.io/v1/${chainConfig.name.toLowerCase().replace(' ', '-')}/blockchain/getBlocksInRange`,
        {
          fromBlock: fromBlock.toString(),
          toBlock: toBlock.toString(),
          withTransactions: true,
          withLogs: true,
          withDecode: true
        },
        {
          headers: {
            'X-API-KEY': process.env.NODIT_API_KEY || 'nodit-demo',
            'content-type': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.items || response.data.items.length === 0) {
        console.log(`No blocks found in range ${fromBlock}-${toBlock} on ${chainConfig.name}`);
        return;
      }
      
      // Collect all usage events for batch database insert
      const usageEvents = [];
      
      // Process each block's transactions
      for (const block of response.data.items) {
        if (!block.transactions || block.transactions.length === 0) continue;
        
        // Filter for transactions to our contracts
        for (const tx of block.transactions) {
          if (!tx.to) continue;
          if (!ploplsAddresses.includes(tx.to.toLowerCase())) continue;
          if (!tx.logs || tx.logs.length === 0) continue;
          
          const schemaId = ploplAddressToId.get(tx.to.toLowerCase());
          
          // Process each log
          for (const log of tx.logs) {
            if (!ploplsAddresses.includes(log.contractAddress.toLowerCase())) continue;
            
            try {
              // Parse the log
              const parsedLog = registryInterface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              if (!parsedLog) continue;
              
              // Only track PlopSubmitted events
              if (parsedLog.name === 'PlopSubmitted') {
                usageEvents.push({
                  id: getAlphanumericId(),
                  schemaId: schemaId,
                  transactionHash: tx.transactionHash,
                  blockNumber: block.number,
                  timestamp: new Date()
                });
              }
            } catch (error) {
              // Skip logs that can't be parsed
              continue;
            }
          }
        }
      }
      
      // Batch insert usage events if we found any
      if (usageEvents.length > 0) {
        console.log(`Found ${usageEvents.length} usage events in block range ${fromBlock}-${toBlock}`);
        
        // Create them in batches of 100
        const BATCH_SIZE = 100;
        for (let i = 0; i < usageEvents.length; i += BATCH_SIZE) {
          const batch = usageEvents.slice(i, i + BATCH_SIZE);
          await prismaQuery.schemaUsages.createMany({
            data: batch,
            skipDuplicates: true
          });
        }
        
        console.log(`Saved ${usageEvents.length} usage events to database`);
      }
    } catch (error) {
      console.error(`Error processing block range ${fromBlock}-${toBlock} on ${chainConfig.name}:`, error);
    }
  };
  
  // Function to process a single block
  const processBlock = async (chainConfig, blockNumber, ploplsAddresses, ploplAddressToId) => {
    try {
      const response = await axios.post(
        `https://web3.nodit.io/v1/${chainConfig.name.toLowerCase().replace(' ', '-')}/blockchain/getTransactionsInBlock`,
        {
          block: blockNumber.toString(),
          withLogs: true,
          withDecode: true
        },
        {
          headers: {
            'X-API-KEY': process.env.NODIT_API_KEY || 'nodit-demo',
            'content-type': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.items) {
        return; // No transactions found
      }
      
      const transactions = response.data.items;
      
      // Filter transactions for those that interact with our contracts
      const relevantTransactions = transactions.filter(tx => {
        if (!tx.to) return false;
        return ploplsAddresses.includes(tx.to.toLowerCase());
      });
      
      if (relevantTransactions.length === 0) {
        return; // No relevant transactions in this block
      }
      
      console.log(`Found ${relevantTransactions.length} relevant transactions in block ${blockNumber} on ${chainConfig.name}`);
      
      // Collect usage events for this block
      const usageEvents = [];
      
      // Process each relevant transaction
      for (const tx of relevantTransactions) {
        if (!tx.logs) continue;
        
        const schemaId = ploplAddressToId.get(tx.to.toLowerCase());
        
        // Process logs for events
        for (const log of tx.logs) {
          if (!ploplsAddresses.includes(log.contractAddress.toLowerCase())) continue;
          
          try {
            // Parse the log
            const parsedLog = registryInterface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (!parsedLog) continue;
            
            const eventData = {
              chain: {
                id: chainConfig.id,
                name: chainConfig.name
              },
              contract: log.contractAddress,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              eventName: parsedLog.name,
              args: Object.fromEntries(
                Object.entries(parsedLog.args)
                  .filter(([key]) => isNaN(parseInt(key)))
                  .map(([key, val]) => [key, val.toString()])
              ),
              timestamp: new Date().toISOString()
            };
            
            console.log(`Event detected on ${chainConfig.name}:`);
            console.log(JSON.stringify(eventData, null, 2));
            
            // If this is a PlopSubmitted event, record usage
            if (parsedLog.name === 'PlopSubmitted') {
              const usageEvent = {
                id: getAlphanumericId(),
                schemaId: schemaId,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber,
                timestamp: new Date()
              };
              
              usageEvents.push(usageEvent);
            }
          } catch (error) {
            // Skip logs that can't be parsed with our interface
            continue;
          }
        }
      }
      
      // Save usage events to database
      if (usageEvents.length > 0) {
        await prismaQuery.schemaUsages.createMany({
          data: usageEvents,
          skipDuplicates: true
        });
        
        console.log(`Saved ${usageEvents.length} schema usages to database from block ${blockNumber}`);
      }
    } catch (error) {
      console.error(`Error processing block ${blockNumber} on ${chainConfig.name}:`, error);
    }
  };
  
  // Main polling function that runs every 15 seconds
  const setupPolling = async () => {
    // Initialize by getting the current block for each chain
    for (const chain of CHAINS) {
 
      if(chain.id ===48899){
        continue
      }
      
      const currentBlock = await getCurrentBlockNumber(chain);
      if (currentBlock) {
        // Start from 1000 blocks ago or block 0, whichever is greater
        const startBlock = Math.max(0, currentBlock - 1000);
        latestProcessedBlocks.set(chain.id, startBlock);
        console.log(`Initialized ${chain.name} to start from block ${startBlock}`);
      }
    }
    
    // Set up the polling interval
    const POLLING_INTERVAL = 15 * 1000; // 15 seconds
    
    setInterval(async () => {
      for (const chain of CHAINS) {
        // Skip Zircuit Testnet
        if (chain.id === 48899) continue;
        
        // Skip if there's already a job running for this chain
        if (runningJobs.get(chain.id)) continue;
        
        const currentBlock = await getCurrentBlockNumber(chain);
        if (!currentBlock) continue;
        
        const lastProcessedBlock = latestProcessedBlocks.get(chain.id) || 0;
        
        // Only process if there are new blocks
        if (currentBlock > lastProcessedBlock) {
          console.log(`New blocks detected on ${chain.name}: ${lastProcessedBlock+1} to ${currentBlock}`);
          fetchAndProcessTransactions(chain, lastProcessedBlock + 1, currentBlock);
        }
      }
    }, POLLING_INTERVAL);
    
    console.log(`Polling setup complete. Will check for new transactions every ${POLLING_INTERVAL/1000} seconds`);
  };
  
  // Start the polling process
  setupPolling();
  done();
}