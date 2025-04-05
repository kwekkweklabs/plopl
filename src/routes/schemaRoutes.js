import { exec } from "child_process";
import { prismaQuery } from "../lib/prisma.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { generateBytes32Id, getAlphanumericId } from "../utils/miscUtils.js";

/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {Function} done
 */
export const schemaRoute = (app, _, done) => {
  // To get all the schemas, for the explore page
  app.get('/explore', async (request, reply) => {
    const schemas = await prismaQuery.schema.findMany({})

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
    const { name, description, schema, chainId } = request.body;

    const sluggedName = name.toLowerCase().replace(/ /g, '-');
    const seedString = `plopl-${chainId}-${sluggedName}-${getAlphanumericId(4)}`
    const bytes32Id = generateBytes32Id(seedString);

    const newSchema = await prismaQuery.schema.create({
      data: {
        id: seedString,
        bytes32Id: bytes32Id,
        name: name,
        description: description,
        schema: schema,
        userId: request.user.id
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


  done();
}
