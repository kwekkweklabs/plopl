import "./dotenv.js";

import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import { exec } from "child_process";
import { authRoutes } from "./src/routes/authRoutes.js";
import { schemaRoute } from "./src/routes/schemaRoutes.js";
import { schemaWorker } from "./src/workers/schemaWorkers.js";

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

fastify.register(schemaWorker)

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

// fastify.post("/verify", async (request, reply) => {
//   try {
//     const body = JSON.parse(request.body);

//     const { schemaId } = request.query;
//     console.log('schemaId', schemaId)

//     const headers = body.request.headers
//     const url = body.request.url
//     const method = body.request.method
//     const bodyData = body.request.body

//     // // Simulate the request
//     // console.log('Calling')
//     const res = await axios({
//       method: method,
//       headers: headers,
//       url: url,
//       data: bodyData
//     })

//     const schema = await prismaQuery.schema.findFirst({
//       where: {
//         id: schemaId
//       }
//     })

//     console.log('schema', JSON.stringify(schema.schema))
//     console.log('res', JSON.stringify(res.data))

//     // Validate using our schema validation function
//     const validationResult = handleSchemaValidation(schema.schema, res.data);
//     console.log('validationResult:', validationResult);

//     // random sleep from 7 to 12 seconds
//     const sleepTime = Math.floor(Math.random() * (12 - 7 + 1)) + 7;
//     await sleep(sleepTime * 1000);

//     if (validationResult.isValid === false) {
//       return reply.status(200).send({
//         message: "Verification completed",
//         error: null,
//         data: {
//           isValid: validationResult.isValid,
//           extractedData: validationResult.data
//         },
//       });
//     }

//     const stringifiedData = JSON.stringify(res.data)
//     const plop = generateBytes32Id(stringifiedData)

//     const pWallet = new ethers.Wallet(process.env.NOTARY_PK)
//     const nWallet = new ethers.Wallet(process.env.NOTARY_PK)

//     const pSig = await pWallet.signMessage(ethers.getBytes(plop))
//     const nSig = await nWallet.signMessage(ethers.getBytes(plop))

//     const combinedHash = ethers.keccak256(
//       ethers.solidityPacked(
//         ["bytes32", "bytes", "bytes"],
//         [plop, pSig, nSig]
//       )
//     )
//     // Make the data (currently object, as an array instead( removing the keys))
//     const dataArray = Object.values(res.data)
//     console.log('dataArray', dataArray)

//     let datas;
//     for (let i = 0; i < dataArray.length; i++) {
//       // If it's a string
//       if (typeof dataArray[i] === 'string') {
//         const _data = AbiCoder.encode(["string"], [dataArray[i]])
//         datas.push(_data)
//       } else if (typeof dataArray[i] === 'number') {
//         const _data = AbiCoder.encode(["uint256"], [dataArray[i]])
//         datas.push(_data)
//       } else if (typeof dataArray[i] === 'boolean') {
//         const _data = AbiCoder.encode(["bool"], [dataArray[i]])
//         datas.push(_data)
//       }
//     }

//     const returnData = {
//       isValid: true,
//       extractedData: datas,
//       s: {
//         pSig: pSig,
//         nSig: nSig,
//         combinedHash: combinedHash,
//         plop: plop
//       }
//     }

//     return reply.status(200).send(returnData)
//   } catch (error) {
//     console.log('error', error)
//     reply.status(500).send({
//       message: "Error verifying request",
//       error: error,
//       data: null,
//     });
//   }
// });

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