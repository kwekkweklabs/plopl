import { exec } from "child_process";
import { prismaQuery } from "../lib/prisma.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { generateBytes32Id, getAlphanumericId } from "../utils/miscUtils.js";
import axios from "axios";
import { CHAINS } from '../../config.js';
import { RegistryABI } from '../lib/RegistryABI.js';
import { ethers } from "ethers";

/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {Function} done
 */
export const schemaRoute = (app, _, done) => {
  // To get all the schemas, for the explore page
  app.get('/explore', async (request, reply) => {
    const schemas = await prismaQuery.schema.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return reply.status(200).send(schemas)
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params;

    const schema = await prismaQuery.schema.findUnique({
      where: { id },
      include: {
        usages: true,
        _count: {
          select: {
            usages: true
          }
        }
      }
    })

    return reply.status(200).send(schema)
  })

  app.post('/create', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    const { name, description, schema, chainId, registryId, registryAddress } = request.body;

    const sluggedName = name.toLowerCase().replace(/ /g, '-');
    const seedString = `plopl-${chainId}-${sluggedName}-${getAlphanumericId(4)}`

    schema.id = `${chainId}-${registryId}`

    const newSchema = await prismaQuery.schema.create({
      data: {
        id: seedString,
        name: name,
        description: description,
        schema: schema,
        userId: request.user.id,
        registryId: registryId,
        registryAddress: registryAddress,
        chainId: parseInt(chainId)
      }
    })

    return reply.status(200).send(newSchema)
  })

  app.get('/my-schemas', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    const schemas = await prismaQuery.schema.findMany({
      where: { userId: request.user.id }
    })

    return reply.status(200).send(schemas)
  })

  app.get('/my-schemas-usage', async (request, reply) => {
    const { address } = request.query;

    const usages = await prismaQuery.schemaUsages.findMany({
      where: { userAddress: address },
      include: {
        schema: {
          select: {
            id: true,
            name: true,
            chainId: true,
            registryId: true,
            registryAddress: true,
            description: true
          }
        }
      }
    })

    return reply.status(200).send(usages)
  })

  app.get('/log-tx', async (request, reply) => {
    try {
      const { txHash, chainId } = request.query;

      const checkExists = await prismaQuery.schemaUsages.findFirst({
        where: {
          txHash
        }
      })

      if (checkExists) {
        return reply.status(200).send({ error: 'Tx already exists' })
      }



      const selectedChain = CHAINS.find(chain => chain.id === parseInt(chainId));
      if (!selectedChain) {
        return reply.status(400).send({ error: 'Chain not found' });
      }

      const provider = new ethers.JsonRpcProvider(selectedChain.rpc);
      const tx = await provider.getTransactionReceipt(txHash);

      console.log(tx)

      const log = tx.logs[0];
      const user = tx.from;

      const schema = await prismaQuery.schema.findFirst({
        where: {
          registryAddress: tx.to
        }
      })

      if (!schema) {
        return reply.status(400).send({ error: 'Schema not found' })
      }

      // If there is already a userAddress with the same  registryAddress, then need to update the previous one,
      // update the txHash, blockNumber, and timestamp
      const existingUsage = await prismaQuery.schemaUsages.findFirst({
        where: {
          userAddress: user,
          schemaId: schema.id
        }
      })

      if (existingUsage) {
        await prismaQuery.schemaUsages.update({
          where: { id: existingUsage.id },
          data: { txHash: txHash, blockNumber: tx.blockNumber }
        })
      } else {
        await prismaQuery.schemaUsages.create({
          data: {
            userAddress: user,
            schemaId: schema.id,
            txHash: txHash,
            blockNumber: tx.blockNumber,
          }
        })
      }

      return reply.status(200).send({ success: true })
    } catch (error) {
      console.log(error)
      return reply.status(500).send({ error: 'Error indexing plopls' })
    }
  })

  done();
}
