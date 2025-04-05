import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL, USER_WALLET_ADDRESS, CHAINS, UW_PK } from '../../constants';
import { ethers } from 'ethers';
import { RegistryABI } from './lib/RegistryABI';
import { Prover, Presentation, NotaryServer, Transcript, mapStringToRange, subtractRanges } from 'tlsn-js';
import { HTTPParser } from 'http-parser-js';

// Schema types
interface SchemaResponse {
  id: string;
  bytes32Id: string;
  name: string;
  description: string;
  registryAddress: string;
  schema: {
    id: number;
    slug: string;
    request: {
      url: string;
      args: {
        json: {
          query: string;
          variables: Record<string, unknown>;
        };
      };
      method: string;
    };
    response: {
      match: {
        fields: string[][];
        expected: string[];
      };
      request: {
        method: string;
      };
    };
    prepareUrl: string;
    description: string;
  };
}

interface MessageWithAction {
  action: string;
  data?: unknown;
}

interface CapturedApiData {
  timestamp: string;
  url: string;
  method: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
    timestamp: string;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    timestamp: string;
  };
}

const SidePanel = () => {
  const [ploplSchemaId, setPloplSchemaId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<SchemaResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedTargetPage, setVisitedTargetPage] = useState(false);
  const [apiMonitoringActive, setApiMonitoringActive] = useState(false);
  const [capturedApiData, setCapturedApiData] = useState<CapturedApiData | null>(null);
  const [isCurrentlyOnTargetPage, setIsCurrentlyOnTargetPage] = useState(false);
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSubmittingOnchain, setIsSubmittingOnchain] = useState(false);
  const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);

  // Use a ref to prevent repetitive state updates during a single render cycle
  const processedUrlsRef = useRef<Set<string>>(new Set());
  // Track the last processed schema data for target URL matching
  const schemaDataRef = useRef<SchemaResponse | null>(null);
  // Keep track of the last URL to detect page refreshes
  const lastUrlRef = useRef<string | null>(null);
  // Keep track of the last timestamp to identify refreshes vs. navigation
  const lastTimestampRef = useRef<number>(Date.now());
  // Track if we've already sent schema data to avoid repeated sends
  const hasSentSchemaRef = useRef<boolean>(false);
  // Track message listener to avoid duplicate listeners
  const messageListenerRef = useRef<((message: MessageWithAction) => void) | null>(null);

  // Update schema data ref when schema data changes
  useEffect(() => {
    schemaDataRef.current = schemaData;
  }, [schemaData]);

  const resetState = () => {
    setCurrentStep(1);
    setVisitedTargetPage(false);
    setApiMonitoringActive(false);
    processedUrlsRef.current.clear();
    hasSentSchemaRef.current = false;
    setCompletedTxHash(null);
    // Keep ploplSchemaId and schemaData if they exist in the URL
    // Keep capturedApiData for reference but require the user to be on the target page again
  };

  const cancelFlow = () => {
    resetState();
    setPloplSchemaId(null);
    setSchemaData(null);
    setCapturedApiData(null);

    // Also clear from localStorage if present
    try {
      localStorage.removeItem('ploplCurrentSchemaId');
    } catch (e) {
      console.error('Failed to remove schema ID from localStorage:', e);
    }

    // Reset any active tabs if possible
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id && currentTab.url && currentTab.url.includes('ploplSchemaId')) {
        // Remove ploplSchemaId from URL if present
        try {
          const url = new URL(currentTab.url);
          url.searchParams.delete('ploplSchemaId');
          chrome.tabs.update(currentTab.id, { url: url.toString() });
        } catch (e) {
          console.error('Failed to update tab URL:', e);
        }
      }
    });

    // Tell background script to clear captured data
    chrome.runtime.sendMessage({
      action: 'clearApiData',
    });
  };

  const fetchSchemaData = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/schema/${id}`);
      const data = await response.json();
      setSchemaData(data);

      // After fetching schema data, immediately check current tab
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (currentTab?.url) {
          const isOnTarget = checkIsTargetPage(currentTab.url, data);
          // If we're already on the target page, ensure we move to step 2
          if (isOnTarget && currentStep === 1) {
            setVisitedTargetPage(true);
            setCurrentStep(2);
          }
        }
      });

      // Also send the schema data to the background script for monitoring
      sendSchemaToBackgroundScript(data);
    } catch (error) {
      console.error('Error fetching schema data:', error);
    }
  };

  const checkIsTargetPage = (url: string, schema: SchemaResponse | null) => {
    if (!schema?.schema?.prepareUrl) return false;

    try {
      const parsedUrl = new URL(url);
      const targetUrl = new URL(schema.schema.prepareUrl);

      // Check if we're on the target page by comparing hostnames
      // and possibly path if it's specific
      const hostnameMatches = parsedUrl.hostname === targetUrl.hostname;
      const pathMatches = targetUrl.pathname === '/' || parsedUrl.pathname.startsWith(targetUrl.pathname);

      const isOnTargetPage = hostnameMatches && pathMatches;

      // Update state to reflect if we're currently on target page
      setIsCurrentlyOnTargetPage(isOnTargetPage);

      if (isOnTargetPage) {
        // Always mark as visited if we're on the target page
        if (!visitedTargetPage) {
          setVisitedTargetPage(true);
        }

        // Advance to step 2 if we're currently on step 1
        if (currentStep === 1) {
          setCurrentStep(2);
        }

        return true;
      }

      // If we're not on the target page anymore but we were in a later step,
      // reset back to step 1 with a warning
      if (!isOnTargetPage && currentStep > 1) {
        console.log('No longer on target page, resetting to step 1');
        setCurrentStep(1);
        setVisitedTargetPage(false);
      }

      return isOnTargetPage;
    } catch (e) {
      console.error('Error checking target page:', e);
      return false;
    }
  };

  const checkForSchemaId = (url: string) => {
    // Skip if we've already processed this exact URL recently
    // but don't skip target page detection
    const currentSchema = schemaDataRef.current;
    const shouldCheckTargetPage = currentSchema && currentStep === 1;

    if (processedUrlsRef.current.has(url) && !shouldCheckTargetPage) {
      return;
    }

    // Mark this URL as processed
    processedUrlsRef.current.add(url);

    // Limit the size of processed URLs set to avoid memory leaks
    if (processedUrlsRef.current.size > 10) {
      const iterator = processedUrlsRef.current.values();
      const firstValue = iterator.next().value;
      if (firstValue) {
        processedUrlsRef.current.delete(firstValue);
      }
    }

    try {
      const parsedUrl = new URL(url);
      const id = parsedUrl.searchParams.get('ploplSchemaId');

      // Detect page refresh
      const currentTimestamp = Date.now();
      const isSameUrl = url === lastUrlRef.current;
      const isRefresh = isSameUrl && currentTimestamp - lastTimestampRef.current < 1000;

      // Update timestamps and URL for future checks
      lastTimestampRef.current = currentTimestamp;
      lastUrlRef.current = url;

      // Only reset on refresh if we have a schema ID
      if (isRefresh && id) {
        resetState();
      }

      setCurrentUrl(url);

      // Always check if we've visited the target page
      if (currentSchema) {
        checkIsTargetPage(url, currentSchema);
      }

      // Only update schema ID if it's different
      if (id !== ploplSchemaId) {
        setPloplSchemaId(id);
        if (id) {
          fetchSchemaData(id);
          // Only reset state if schema ID changes, not on initial load
          if (ploplSchemaId !== null && ploplSchemaId !== id) {
            resetState();
          }
        } else {
          setSchemaData(null);
        }
      }
    } catch (e) {
      console.error('Failed to parse URL', e);
    }
  };

  const openPrepareUrl = () => {
    if (schemaData?.schema?.prepareUrl) {
      // Create URL and ensure ploplSchemaId is included
      const prepareUrl = new URL(schemaData.schema.prepareUrl);

      // Add the current ploplSchemaId as a parameter if it exists
      if (ploplSchemaId && !prepareUrl.searchParams.has('ploplSchemaId')) {
        prepareUrl.searchParams.set('ploplSchemaId', ploplSchemaId);
      }

      // Also store the schema ID in local storage for persistence
      if (ploplSchemaId) {
        try {
          localStorage.setItem('ploplCurrentSchemaId', ploplSchemaId);
        } catch (e) {
          console.error('Failed to store schema ID in localStorage:', e);
        }
      }

      // After opening the URL, force advance to step 2 in case the tab update listener doesn't catch it
      setCurrentStep(2);
      setVisitedTargetPage(true);

      chrome.tabs.create({ url: prepareUrl.toString() });
    }
  };

  const mintProof = async () => {
    console.log('Minting proof');
    setIsVerifying(true);
    setVerificationError(null);

    try {
      if (capturedApiData) {
        console.log('Captured API data:', capturedApiData);
        console.log('chainId:', selectedChain.id);
        console.log('schemaData:', schemaData);

        const bodyData = schemaData?.schema?.request?.args?.json;
        capturedApiData.request.body = bodyData;

        // Use TLSNotary for verification
        const notaryUrl = 'http://localhost:7047';
        const websocketProxyUrl = 'http://localhost:7047/proxy';
        const serverUrl = capturedApiData.url;
        const serverDns = new URL(serverUrl).hostname;

        console.time('tlsn-verification');

        try {
          // Initialize TLSNotary components
          const notary = NotaryServer.from(notaryUrl);

          // Direct approach using tlsn-js
          // Step 1: Create a prover instance
          const prover = await new Prover({
            serverDns: serverDns,
            maxRecvData: 4096, // Increase buffer size for larger responses
          });

          // Step 2: Set up the prover with the notary
          await prover.setup(await notary.sessionUrl());

          // Step 3: Send the request using the captured API data
          const response = await prover.sendRequest(websocketProxyUrl, {
            url: serverUrl,
            method: capturedApiData.request.method as any, // Cast to any to avoid type error
            headers: capturedApiData.request.headers || {},
            body: capturedApiData.request.body || {},
          });

          console.log('TLSNotary response:', response);

          // Step 4: Get the transcript from the exchange
          const transcript = await prover.transcript();
          const { sent, recv } = transcript;

          // Step 5: Create a commit for the entire message (we're not selectively revealing)
          const commit = {
            sent: [{ start: 0, end: sent.length }],
            recv: [{ start: 0, end: recv.length }],
          };

          // Step 6: Notarize the commit
          const notarizationOutputs = await prover.notarize(commit);

          if (!notarizationOutputs) {
            throw new Error('Failed to notarize TLS session');
          }

          // Step 7: Create a presentation from the notarization outputs
          const presentation = await new Presentation({
            attestationHex: notarizationOutputs.attestation,
            secretsHex: notarizationOutputs.secrets,
            notaryUrl: notarizationOutputs.notaryUrl,
            websocketProxyUrl: notarizationOutputs.websocketProxyUrl,
            reveal: commit,
          });

          // Step 8: Verify the presentation
          const verificationResult = await presentation.verify();
          console.log('Verification result:', verificationResult);

          if (!verificationResult) {
            throw new Error('TLSNotary proof verification failed');
          }

          // Step 9: Extract the data needed for contract submission
          const verifyingKeyBytes = await presentation.verifyingKey();

          // Create hash from transcript data for contract parameters
          const sentData = Buffer.from(sent);
          const recvData = Buffer.from(recv);

          // Create combined hash from the proof data
          const combinedData = Buffer.concat([sentData, recvData]);
          const combinedHash = ethers.keccak256(combinedData);

          // Generate the PLOP identifier from the proof
          // Get server info from verification result instead
          const serverName = verificationResult.server_name || serverDns;
          const connectionTime = verificationResult.connection_info?.time || Date.now();
          const plopData = Buffer.concat([
            Buffer.from(serverName),
            Buffer.from(String(connectionTime)),
            Buffer.from(verifyingKeyBytes.data || []),
          ]);
          const plopId = ethers.keccak256(plopData);

          // Generate signatures
          const signingKey = new ethers.SigningKey(UW_PK);
          const pSig = await signingKey.sign(combinedHash);
          const nSig = await signingKey.sign(
            ethers.keccak256(
              Buffer.concat([Buffer.from(plopId.slice(2), 'hex'), Buffer.from(combinedHash.slice(2), 'hex')]),
            ),
          );

          // Format for contract submission
          const proofResult = {
            isValid: true,
            s: {
              pSig: pSig.serialized,
              nSig: nSig.serialized,
              combinedHash,
              plop: plopId,
            },
          };

          console.timeEnd('tlsn-verification');
          console.log('Prepared proof data for contract:', proofResult);

          if (proofResult.isValid) {
            // Start the on-chain submission process
            setIsSubmittingOnchain(true);

            const _selectedChain = CHAINS.find(chain => chain.id === parseInt(selectedChain.id.toString()));
            const provider = new ethers.JsonRpcProvider(_selectedChain?.rpcUrl);
            const signer = new ethers.Wallet(UW_PK, provider);

            const mySig = await signer.signMessage(ethers.getBytes(proofResult.s.combinedHash));

            const PlopRegistryContract = new ethers.Contract(schemaData?.registryAddress || '', RegistryABI, signer);

            console.log('PlopRegistryContract:', PlopRegistryContract);
            const tx = await PlopRegistryContract.submitPlop(
              proofResult.s.plop,
              proofResult.s.pSig,
              proofResult.s.nSig,
              mySig,
              [],
            );

            console.log('Minting tx:', tx);
            const receipt = await tx.wait();

            // Store the transaction hash
            setCompletedTxHash(receipt.hash);
            console.log('Minting tx confirmed', tx);

            // Log transaction hash to the local server
            try {
              await fetch(`http://localhost:3710/schema/log-tx?txHash=${receipt.hash}&chainId=${selectedChain.id}`);
              console.log('Transaction logged to server');
            } catch (logError) {
              console.error('Failed to log transaction:', logError);
            }

            setCurrentStep(4); // Done
          } else {
            // Verification failed
            setVerificationError("You don't meet the current data requirements needed for this PLOP");
          }
        } catch (error) {
          console.error('TLSNotary error:', error);
          setVerificationError(
            'Error during TLSNotary verification: ' + (error instanceof Error ? error.message : String(error)),
          );
        }
      } else {
        console.log('No API data captured');
        setVerificationError(
          'No API data was captured. Please interact with the page to trigger the necessary API calls.',
        );
      }
    } catch (error) {
      console.error('Error minting proof:', error);
      setVerificationError('An error occurred during verification. Please try again.');
    } finally {
      setIsVerifying(false);
      setIsSubmittingOnchain(false);
    }
  };

  // Helper function to parse HTTP messages
  const parseHttpMessage = (buffer: Buffer, type: 'request' | 'response') => {
    const parser = new HTTPParser(type === 'request' ? HTTPParser.REQUEST : HTTPParser.RESPONSE);
    const info: Record<string, unknown> = {};
    const headers: string[] = [];
    const body: Buffer[] = [];

    parser.onHeadersComplete = function (response: Record<string, unknown>) {
      Object.keys(response).forEach(key => {
        info[key] = response[key];
      });
    };

    // Using onHeaders instead of onHeader as per linter
    parser.onHeaders = function (headerList: string[]) {
      headers.push(...headerList);
    };

    parser.onBody = function (chunk: unknown, offset: number, length: number) {
      if (Buffer.isBuffer(chunk)) {
        body.push(chunk.slice(offset, offset + length));
      }
    };

    parser.execute(buffer, 0, buffer.length);
    parser.finish();

    return { info, headers, body };
  };

  // Helper function to display request body data in a readable format
  const formatRequestBody = (body: unknown): string => {
    if (!body) return 'No body data';
    try {
      if (typeof body === 'object') {
        // For simple objects, stringify with indentation
        return JSON.stringify(body, null, 2);
      } else if (typeof body === 'string') {
        // For strings, try to parse as JSON first for pretty display
        try {
          const parsed = JSON.parse(body);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return body; // If not valid JSON, return as is
        }
      }
      return String(body);
    } catch (e) {
      return `Error formatting body: ${String(e)}`;
    }
  };

  // Simulate API data capture (for testing only - remove in production)
  const simulateApiCapture = () => {
    const mockData: CapturedApiData = {
      timestamp: new Date().toISOString(),
      url: schemaData?.schema?.request?.url || 'https://api.example.com',
      method: schemaData?.schema?.request?.method || 'POST',
      request: {
        url: schemaData?.schema?.request?.url || 'https://api.example.com',
        method: schemaData?.schema?.request?.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: { query: 'example query' },
        timestamp: new Date().toISOString(),
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: { data: { example: 'response data' } },
        timestamp: new Date().toISOString(),
      },
    };
    setCapturedApiData(mockData);

    // Only proceed to step 3 if currently on target page
    if (isCurrentlyOnTargetPage) {
      setCurrentStep(3);
    } else {
      setCurrentStep(1);
      console.log("Can't proceed to next step: Not on verification page");
    }
  };

  // Send schema data to background script for API monitoring
  const sendSchemaToBackgroundScript = (schema: SchemaResponse) => {
    // Set flag to prevent sending the same schema data repeatedly
    hasSentSchemaRef.current = true;

    // Try to send message to background with retry logic
    const attemptSend = (retries = 3, delay = 500) => {
      chrome.runtime
        .sendMessage({
          action: 'setSchemaData',
          data: schema,
        })
        .then(() => {
          setApiMonitoringActive(true);
        })
        .catch(err => {
          console.error('Error sending schema data to background:', err);

          // If error indicates receiving end doesn't exist and we have retries left
          if (err.message?.includes('Receiving end does not exist') && retries > 0) {
            console.log(`Retrying in ${delay}ms... (${retries} attempts left)`);
            // Wait and retry with exponential backoff
            setTimeout(() => attemptSend(retries - 1, delay * 1.5), delay);
          } else {
            // Max retries reached or different error
            hasSentSchemaRef.current = false;
          }
        });
    };

    // Ping the background script first to wake it up
    chrome.runtime.sendMessage({ action: 'ping' }).finally(() => {
      // Start the send attempts whether the ping succeeds or fails
      attemptSend();
    });
  };

  // Listen for messages from the background script
  useEffect(() => {
    // Cleanup any previous listener to avoid duplicates
    if (messageListenerRef.current) {
      chrome.runtime.onMessage.removeListener(messageListenerRef.current);
    }

    // Create new message listener
    const messageListener = (message: MessageWithAction) => {
      console.log('SidePanel received message:', message);

      // Only process relevant messages
      if (!message || typeof message !== 'object' || !message.action) {
        console.log('Invalid message format received');
        return;
      }

      if (message.action === 'apiDataCaptured' && message.data) {
        console.log('API data captured message received with data:', message.data);

        // Always update the data regardless of URL format
        setCapturedApiData(message.data as CapturedApiData);

        // Get current URL to check if we're still on the target page
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const currentTab = tabs[0];
          if (currentTab?.url && schemaDataRef.current) {
            const stillOnTargetPage = checkIsTargetPage(currentTab.url, schemaDataRef.current);

            // Only move to step 3 if currently on the verification page
            if (currentStep === 2 && stillOnTargetPage) {
              console.log('Still on target page, moving from step 2 to step 3');
              setCurrentStep(3);
            } else if (!stillOnTargetPage) {
              console.log('No longer on verification page, staying at step 1');
              setCurrentStep(1);
            } else {
              console.log('Not changing step because current step is', currentStep);
            }
          } else {
            console.log('Could not determine current URL or schema data, staying at current step');
          }
        });
      }
    };

    // Store the listener ref for cleanup
    messageListenerRef.current = messageListener;

    // Add the listener
    chrome.runtime.onMessage.addListener(messageListener);
    console.log('Side panel message listener registered');

    // Ping the background script to check connection
    chrome.runtime
      .sendMessage({ action: 'ping' })
      .then(response => {
        console.log('Background script ping response:', response);
      })
      .catch(err => {
        console.error('Failed to ping background script:', err);
      });

    // Cleanup on unmount
    return () => {
      if (messageListenerRef.current) {
        chrome.runtime.onMessage.removeListener(messageListenerRef.current);
        console.log('Side panel message listener removed');
      }
    };
  }, [currentStep]);

  // Send schema data to background when it changes
  useEffect(() => {
    if (schemaData && !hasSentSchemaRef.current) {
      sendSchemaToBackgroundScript(schemaData);
    }
  }, [schemaData]);

  // Initial URL check and tab update listener
  useEffect(() => {
    // Initial check on current tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.url) {
        checkForSchemaId(currentTab.url);

        // Also check if we're already on the target page with existing schema
        if (schemaDataRef.current) {
          checkIsTargetPage(currentTab.url, schemaDataRef.current);
        }
      }
    });

    // Listen for tab updates to detect URL changes
    const tabUpdateListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active && tab.url) {
        checkForSchemaId(tab.url);
      }
    };

    chrome.tabs.onUpdated.addListener(tabUpdateListener);

    // Listen for tab activation to detect when user switches tabs
    const tabActivatedListener = (activeInfo: chrome.tabs.TabActiveInfo) => {
      chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url) {
          checkForSchemaId(tab.url);
        }
      });
    };

    chrome.tabs.onActivated.addListener(tabActivatedListener);

    // Cleanup listener on unmount
    return () => {
      chrome.tabs.onUpdated.removeListener(tabUpdateListener);
      chrome.tabs.onActivated.removeListener(tabActivatedListener);
    };
  }, []);

  // Calculate the target URL with ploplSchemaId preserved
  const getTargetUrlWithSchema = () => {
    if (!schemaData?.schema?.prepareUrl) return '';

    const prepareUrl = new URL(schemaData.schema.prepareUrl);
    if (ploplSchemaId) {
      prepareUrl.searchParams.set('ploplSchemaId', ploplSchemaId);
    }
    return prepareUrl.toString();
  };

  return (
    <div className="App bg-white p-3 min-h-screen text-sm">
      {/* Blockchain transaction overlay */}
      {isSubmittingOnchain && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-4 relative">
                <div className="absolute inset-0 bg-[#ff541e]/20 rounded-full animate-ping"></div>
                <div className="relative bg-gradient-to-br from-[#ff541e] to-[#ff8a44] rounded-full w-full h-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white animate-pulse">
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
                    <line x1="16" x2="2" y1="8" y2="22" />
                    <line x1="17.5" x2="9" y1="15" y2="15" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#ff541e] mb-2">Submitting your PLOP!</h3>
              <p className="text-gray-600 text-sm mb-4">Your proof is being minted on-chain. Please wait...</p>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-[#ff541e] animate-progress"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction completed dialog */}
      {completedTxHash && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">PLOP Submitted Successfully!</h3>
              <p className="text-gray-600 text-sm mb-3">Your proof has been minted on-chain.</p>

              <div className="bg-gray-50 p-3 rounded-md w-full mb-4">
                <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                <p className="text-xs font-mono break-all text-gray-800">{completedTxHash}</p>
              </div>

              <button
                onClick={cancelFlow}
                className="bg-[#ff541e] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#ff541e]/90 transition w-full">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Logo and wallet section */}
        <div className="flex flex-col gap-2">
          {/* App logo and title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={chrome.runtime.getURL('side-panel/icon.png')} alt="logo" className="w-6 h-6" />
              <h1 className="text-lg font-semibold text-[#ff541e]">PLOPL</h1>
            </div>

            {/* Global cancel button */}
            {schemaData && (
              <button
                onClick={cancelFlow}
                className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-md px-2 py-1 transition-colors">
                Cancel
              </button>
            )}
          </div>

          {/* Wallet and chain section - compact version */}
          <div className="bg-gray-50 rounded-md p-2 border border-gray-100 text-left">
            <div className="flex items-center gap-2 mb-1.5">
              {/* Wallet icon and address */}
              <div className="w-5 h-5 bg-gradient-to-br from-[#ff541e] to-[#ff8a44] rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="text-xs text-gray-500">Wallet</div>
                <div className="flex items-center">
                  <code className="text-xs font-mono text-gray-700">
                    {USER_WALLET_ADDRESS.slice(0, 6)}...{USER_WALLET_ADDRESS.slice(-4)}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(USER_WALLET_ADDRESS)}
                    className="text-gray-400 hover:text-gray-600 ml-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Network selector - compact */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">Network:</div>
              <div className="relative flex-1">
                <select
                  id="chain-select"
                  aria-label="Select blockchain network"
                  value={selectedChain.id}
                  onChange={e => {
                    const chain = CHAINS.find(c => c.id === parseInt(e.target.value));
                    if (chain) setSelectedChain(chain);
                  }}
                  className="appearance-none w-full bg-white text-xs py-1 pl-6 pr-4 border border-gray-200 rounded-md">
                  {CHAINS.map(chain => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
                <img
                  src={selectedChain.logo}
                  alt={selectedChain.name}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                />
                <div className="pointer-events-none absolute right-0 top-0 flex items-center h-full pr-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-500">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {schemaData ? (
          <div className="flex flex-col gap-3 text-left">
            {/* Schema information */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#ff541e] to-[#ff8a44] border-0 rounded-xl p-4 shadow-lg">
              {/* Shiny reflection effect */}
              <div className="absolute -inset-1/4 w-[150%] h-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-12 opacity-40 pointer-events-none"></div>
              <div className="relative flex flex-row items-start gap-4 z-10">
                {/* Image with glow effect */}
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 blur-md rounded-full"></div>
                  <img
                    src={chrome.runtime.getURL('side-panel/proof-3d.png')}
                    alt="3d"
                    className="w-12 h-12 relative z-10 drop-shadow-lg"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold mb-1 text-white">✨ {schemaData.name}</h2>
                  <p className="text-white/80 text-xs">{schemaData.schema.description}</p>
                  <div className="flex flex-col mt-2 bg-white/10 rounded-md px-2 py-1">
                    <span className="text-white/70 text-[10px] mr-1">recipeID:</span>
                    <span className="text-white text-[10px] font-mono">{schemaData.id}</span>
                  </div>
                </div>
              </div>
              {/* Bottom shine accent */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
            </div>

            {/* Status bar */}
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-md ${
                isCurrentlyOnTargetPage ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
              }`}>
              <div
                className={`w-2 h-2 rounded-full ${isCurrentlyOnTargetPage ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className="text-xs">
                {isCurrentlyOnTargetPage
                  ? '✅ On verification page'
                  : '🔍 Not on verification page - please return to proceed'}
              </p>
            </div>

            {/* API monitoring status */}
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-md ${
                apiMonitoringActive ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
              }`}>
              <div className={`w-2 h-2 rounded-full ${apiMonitoringActive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className="text-xs">
                {apiMonitoringActive ? 'Network monitoring active' : 'Preparing network monitoring...'}
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-[#ff541e] text-left">Steps to Complete ✨</h3>

              {/* Step 1 */}
              <div
                className={`border rounded-lg p-2 ${currentStep === 1 ? 'border-[#ff541e]/50 bg-[#ff541e]/5' : 'border-black/10 opacity-70'}`}>
                <div className="flex gap-2 mb-1">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-medium text-xs ${
                      currentStep > 1 ? 'bg-green-100 text-green-600' : 'bg-[#ff541e] text-white'
                    }`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </div>
                  <div className="font-medium text-xs mt-0.5 text-left">Go to Verification URL</div>
                </div>
                <p className="text-xs text-gray-600 ml-7 mb-1 text-left">
                  Visit this URL to begin the verification process
                </p>
                {currentStep === 1 && (
                  <>
                    <div className="ml-7 mb-1.5 bg-gray-50 p-1.5 rounded-md overflow-hidden">
                      <p className="text-xs break-all font-mono text-left">{getTargetUrlWithSchema()}</p>
                    </div>
                    <button
                      onClick={openPrepareUrl}
                      className="ml-7 bg-[#ff541e] text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-[#ff541e]/90 transition">
                      Open URL
                    </button>

                    {!isCurrentlyOnTargetPage && capturedApiData && (
                      <div className="ml-7 mt-2 text-yellow-600 text-xs">
                        <p>⚠️ You've left the verification page. Please return to continue.</p>
                      </div>
                    )}
                  </>
                )}
                {currentStep > 1 && (
                  <p className="text-xs text-green-600 ml-7 text-left">✓ Verification page visited</p>
                )}
              </div>

              {/* Step 2 */}
              <div
                className={`border rounded-lg p-2 ${currentStep === 2 ? 'border-[#ff541e]/50 bg-[#ff541e]/5' : 'border-black/10 opacity-70'}`}>
                <div className="flex gap-2 mb-1">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-medium text-xs ${
                      currentStep > 2
                        ? 'bg-green-100 text-green-600'
                        : currentStep === 2
                          ? 'bg-[#ff541e] text-white'
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                    {currentStep > 2 ? '✓' : '2'}
                  </div>
                  <div className={`font-medium text-xs mt-0.5 text-left ${currentStep < 2 ? 'text-gray-400' : ''}`}>
                    Capture the Data Sauce
                  </div>
                </div>
                <p className="text-xs text-gray-600 ml-7 mb-1 text-left">
                  {schemaData.schema.request.method} {schemaData.schema.request.url}
                </p>
                {currentStep === 2 && (
                  <div className="ml-7 flex flex-col gap-1">
                    <div className="text-gray-500 flex items-center gap-1 text-xs">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#ff541e]"></div>
                      <span>Monitoring network requests...</span>
                    </div>
                    <div className="text-xs text-gray-500">Interact with the page to trigger API calls</div>

                    {!isCurrentlyOnTargetPage && (
                      <div className="text-yellow-600 text-xs mt-1">⚠️ Return to verification page to continue</div>
                    )}

                    {/* <button onClick={simulateApiCapture} className="text-xs text-[#ff541e] underline mt-1">
                      Debug: Simulate API capture
                    </button> */}
                  </div>
                )}
                {currentStep > 2 && (
                  <p className="text-xs text-green-600 ml-7 text-left">✓ API data captured successfully</p>
                )}
              </div>

              {/* Step 3 */}
              <div
                className={`border rounded-lg p-2 ${currentStep === 3 ? 'border-[#ff541e]/50 bg-[#ff541e]/5' : 'border-black/10 opacity-70'}`}>
                <div className="flex gap-2 mb-1">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-medium text-xs ${
                      currentStep > 3
                        ? 'bg-green-100 text-green-600'
                        : currentStep === 3
                          ? 'bg-[#ff541e] text-white'
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                    {currentStep > 3 ? '✓' : '3'}
                  </div>
                  <div className={`font-medium text-xs mt-0.5 text-left ${currentStep < 3 ? 'text-gray-400' : ''}`}>
                    Create your PLOP
                  </div>
                </div>
                <p className="text-xs text-gray-600 ml-7 mb-1 text-left">Once data is collected, mint your proof</p>
                {currentStep === 3 && (
                  <>
                    {/* Request body data display */}
                    {capturedApiData?.request?.body && (
                      <div className="ml-7 mb-2 bg-gray-50 p-2 rounded-md overflow-auto max-h-40 text-xs">
                        <details>
                          <summary className="cursor-pointer font-medium text-xs text-gray-700">
                            Request Data Details
                          </summary>
                          <pre className="text-xs mt-1 whitespace-pre-wrap break-all">
                            {formatRequestBody(capturedApiData.request.body)}
                          </pre>
                        </details>
                      </div>
                    )}

                    {isCurrentlyOnTargetPage ? (
                      <>
                        <button
                          onClick={mintProof}
                          disabled={isVerifying}
                          className="ml-7 bg-[#ff541e] text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-[#ff541e]/90 transition disabled:opacity-70 flex items-center">
                          {isVerifying ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              <span>Verifying...</span>
                            </>
                          ) : (
                            'Submit PLOP'
                          )}
                        </button>

                        {verificationError && (
                          <div className="ml-7 mt-2 bg-red-50 border border-red-100 rounded-md p-2 text-xs text-red-600">
                            ⚠️ {verificationError}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="ml-7 text-yellow-600 text-xs">⚠️ Return to verification page to mint proof</div>
                    )}
                  </>
                )}
                {currentStep > 3 && (
                  <p className="text-xs text-green-600 ml-7 text-left">✓ Proof minted successfully</p>
                )}
              </div>

              {/* Success message when all steps completed */}
              {currentStep > 3 && (
                <div className="mt-2 bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                  <div className="text-green-600 font-medium">✨ Verification Complete!</div>
                  <p className="text-xs text-green-600 mt-1">Your PLOP has been successfully minted</p>
                </div>
              )}

              {/* Debug information about captured data */}
              {capturedApiData && (
                <div
                  className={`border rounded-lg p-2 mt-3 ${currentStep === 3 ? 'border-blue-300 bg-blue-50' : 'border-black/10'}`}>
                  <div className="font-medium text-xs mb-1">Captured API Data</div>
                  <div className="text-xs space-y-1">
                    <div>
                      <strong>URL:</strong> {capturedApiData.url}
                    </div>
                    <div>
                      <strong>Method:</strong> {capturedApiData.method}
                    </div>
                    <div>
                      <strong>Status:</strong> {capturedApiData.response?.status} {capturedApiData.response?.statusText}
                    </div>
                    <div>
                      <strong>Request Data:</strong>
                      <span className="ml-1 text-blue-600">
                        {capturedApiData.request?.body ? 'Captured' : 'Not captured'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border border-black/10 rounded-lg p-3 text-left">
            <div className="text-[#ff541e] text-sm font-medium">No Schema Found</div>
            <p className="text-gray-600 text-xs">
              Visit a website with a ploplSchemaId parameter to get started with verification.
            </p>
          </div>
        )}

        {/* Debug Info (hidden in production) */}
        <div className="mt-3 border-t border-gray-200 pt-2">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <div className="mt-1 space-y-1">
              <div>
                <strong>Current URL:</strong> {currentUrl || 'None'}
              </div>
              <div>
                <strong>recipeID:</strong> {ploplSchemaId || 'None'}
              </div>
              <div>
                <strong>Current Step:</strong> {currentStep}
              </div>
              <div>
                <strong>Visited Target:</strong> {visitedTargetPage ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Currently On Target:</strong> {isCurrentlyOnTargetPage ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>API Monitoring:</strong> {apiMonitoringActive ? 'Active' : 'Inactive'}
              </div>
              <div>
                <strong>Has Sent Schema:</strong> {hasSentSchemaRef.current ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Processed URLs Count:</strong> {processedUrlsRef.current.size}
              </div>
              <div>
                <strong>Target URL:</strong> {schemaData?.schema?.prepareUrl || 'None'}
              </div>
              <div>
                <strong>Schema Request URL:</strong> {schemaData?.schema?.request?.url || 'None'}
              </div>
              <div>
                <strong>API Data Captured:</strong> {capturedApiData ? 'Yes' : 'No'}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
