import { CHAINS } from "../../config.js";
import { prismaQuery } from "../lib/prisma.js";



/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {Function} done
 */
export const schemaWorker = (app, _, done) => {

  const handleSubscribeAllPlopl = async () => {
    for (const chain of CHAINS) {
      const plopls = await prismaQuery.schema.findMany({
        where: {
          chainId: chain.id
        }
      })

      console.log({
        chainId: chain.id,
        plopls: plopls.length
      })

      // TODO: Subscribe, all plopls addresses as filters
    }
  }

  handleSubscribeAllPlopl();
  done();
}