import { exec } from "child_process";
import { prismaQuery } from "../lib/prisma.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { generateBytes32Id, getAlphanumericId } from "../utils/miscUtils.js";
import axios from "axios";
import { CHAINS } from '../../config.js';
import { RegistryABI } from '../lib/RegistryABI.js';

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
      where: { id }
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


  app.get('/index-plopls', async (request, reply) => {
    try {
      const { chainId, registryAddress } = request.query;

    const selectedChain = CHAINS.find(chain => chain.id === parseInt(chainId));

    if (!selectedChain) {
      return reply.status(400).send({ error: 'Chain not found' });
    }

    if (parseInt(chainId) === 84532 || parseInt(chainId) === 80002) {
      let protocol = ''
      let network = ''
      if (parseInt(chainId) === 84532) {
        protocol = 'base'
        network = 'sepolia'
      } else {
        protocol = 'polygon'
        network = 'amoy'
      }

      console.log(`Indexing ${protocol} ${network} plopls`)
      const res = await axios({
        method: 'POST',
        url: `https://web3.nodit.io/v1/${protocol}/${network}/blockchain/searchEvents`,
        headers: {
          'X-API-KEY': process.env.NODIT_API_KEY
        },
        data: {
          contractAddress: registryAddress,
          eventNames: [
            "PlopSubmitted"
          ],
          abi: RegistryABI
        },
        // 2 days ago
        fromDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        toDate: new Date().toISOString()
      })

      console.log(res.data)
    }

      return reply.status(200).send('Indexing completed')
    } catch (error) {
      console.log(error)
      return reply.status(500).send({ error: 'Error indexing plopls' })
    }
  })

  done();
}
