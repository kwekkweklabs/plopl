import "./dotenv.js";

import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import { authRoutes } from "./src/routes/authRoutes.js";
import { schemaRoute } from "./src/routes/schemaRoutes.js";

console.log(
  "======================\n======================\nPLOPL SYSTEM STARTED!\n======================\n======================\n"
);

const fastify = Fastify({
  logger: false,
});

fastify.register(FastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", 'token'],
});

fastify.get("/", async (request, reply) => {
  return reply.status(200).send({
    message: "Hello there!",
    error: null,
    data: null,
  });
});

fastify.register(authRoutes, {
  prefix: "/auth",
});

fastify.register(schemaRoute, {
  prefix: "/schema",
});

const start = async () => {
  try {
    const port = process.env.APP_PORT || 3710;
    await fastify.listen({
      port: port,
      host: "0.0.0.0",
    });

    console.log(
      `Server started successfully on port ${fastify.server.address().port}`
    );
    console.log(`http://localhost:${fastify.server.address().port}`);
  } catch (error) {
    console.log("Error starting server: ", error);
    process.exit(1);
  }
};

start();