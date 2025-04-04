import fastify from "fastify";
import { prismaQuery } from "../lib/prisma.js";
import { privy } from "../lib/privy.js";
/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {Function} done
 */
export const authRoutes = (app, _, done) => {
  app.post('/login', async (request, reply) => {
    try {
      const token = request.headers.authorization.split(' ')[1];

      let authData = null;
      let twitterAuthData = null;
      let userData = null;
      try {
        const verifiedClaims = await privy.verifyAuthToken(token);
        authData = verifiedClaims;

        userData = await privy.getUserById(authData.userId);
      } catch (error) {
        console.log(`Token verification failed with error ${error}.`);
        return reply.code(401).send({
          error: 'Invalid token'
        });
      }

      // Get wallet address from Privy
      const walletAddress = userData?.wallet?.address;

      // Wallet address is now required
      if (!walletAddress) {
        return reply.code(400).send({
          error: 'Wallet address is required. Please connect a wallet in Privy.'
        });
      }

      const user = await prismaQuery.user.findFirst({
        where: {
          walletAddress: walletAddress
        }
      });

      if (!user) {
        console.log('User not found, creating new user', authData);

        // Create new user with wallet address (required) and Twitter data (if available)
        const newUser = await prismaQuery.user.create({
          data: {
            walletAddress: walletAddress,
            lastSignIn: new Date(),
          }
        });

        return reply.status(200).send(newUser);
      } else {
        // Prepare update data
        const updateData = {
          walletAddress: walletAddress,
          lastSignIn: new Date()
        };

        // Update existing user
        const updatedUser = await prismaQuery.user.update({
          where: {
            id: user.id
          },
          data: updateData
        });

        return reply.status(200).send(updatedUser);
      }
    } catch (error) {
      console.log('Error on /login', error);
      return reply.status(500).send({
        message: 'Internal server error',
        error: error,
        data: null,
      });
    }
  });

  done();
}