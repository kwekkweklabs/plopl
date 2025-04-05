import "./dotenv.js";

import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import { exec } from "child_process";
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

fastify.post("/simulate-curl", async (request, reply) => {
  // The body is in text format, so we need to parse it
  const curl = request.body;
  console.log(curl);

  // Wrap exec in a Promise to properly handle the async operation
  const execPromise = new Promise((resolve, reject) => {
    exec(curl, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl: ${error}`);
        reject({ error: 'Failed to execute curl', stderr });
      } else {
        console.log('Curl stdout:', stdout);
        
        // Try to parse the output as JSON
        try {
          const parsedData = JSON.parse(stdout);
          resolve(parsedData);
        } catch (parseError) {
          // If it's not valid JSON, return the raw output
          console.log('Could not parse output as JSON:', parseError.message);
          resolve({ data: stdout, parsedError: parseError.message });
        }
      }
    });
  });

  try {
    const result = await execPromise;
    return reply.status(200).send(result);
  } catch (err) {
    return reply.status(500).send(err);
  }
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