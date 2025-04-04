// Auth middleware reading token
import jwt from 'jsonwebtoken';
import { prismaQuery } from '../lib/prisma.js';
import { privy } from '../lib/privy.js';
import { ethers } from 'ethers';
import axios from 'axios';

export const authMiddleware = async (request, reply) => {
  try {
    const token = request.headers.authorization?.split(' ')[1];
    
    if (!token) {
      reply.code(401).send({
        error: 'No authorization token provided'
      });
      return false;
    }

    let authData = null;
    try {
      const verifiedClaims = await privy.verifyAuthToken(token);
      authData = verifiedClaims;
    } catch (error) {
      console.log(`Token verification failed with error ${error}.`);
      return reply.code(401).send({
        error: 'Invalid token'
      });
    }

    const user = await prismaQuery.user.findUnique({
      where: {
        walletAddress: authData.walletAddress
      }
    });

    if (!user) {
      reply.code(401).send({
        error: 'Unauthorized'
      });
      return false;
    }

    // Set user in request for route handlers to access
    request.user = user;
    return true;
  } catch (error) {
    console.error('Auth middleware error:', error);
    reply.code(500).send({ error: 'Internal server error during authentication' });
    return false;
  }
}