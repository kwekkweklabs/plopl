import React, { useEffect, useState } from 'react'
import * as Comlink from 'comlink';
import {
  Prover as TProver,
  Presentation as TPresentation,
  Commit,
  NotaryServer,
  Transcript,
  mapStringToRange,
  subtractRanges,
} from 'tlsn-js';
import { Button } from '@heroui/react';

console.log('url', import.meta.url);
const { init, Prover } = Comlink.wrap(
  new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module',
  }),
);

const notaryUrl = 'https://notary.pse.dev/v0.1.0-alpha.8'
const websocketProxyUrl = 'wss://notary.pse.dev/proxy?token=swapi.dev'
const loggingLevel = 'Info'; 

const serverUrl = 'https://swapi.dev/api/people/1';
const serverDns = 'swapi.dev';

// Installation: npm i tlsn-js tlsn-wasm comlink
export default function ExperimentPage() {
  const [initialized, setInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    (async () => {
      await init({ loggingLevel: loggingLevel });
      setInitialized(true);
    })();
  }, []);

  const handleTlsNotary = async () => {
    try {
      setIsProcessing(true);

      // const client = await window.tlsn.connect();
      // const accountProof = await client.getProof(
      //   (
      //     await client.getHistory(
      //       "get",
      //       "https://api.x.com/1.1/account/settings.json"
      //     )
      //   )[0].id
      // );
      // console.log('accountProof', accountProof);


      console.log('starting notary');
      const notary = NotaryServer.from(notaryUrl);
      console.log('notary', notary);

      console.log('starting prover');
      const prover = (await new Prover({
        serverDns: serverDns,
        serverUrl: serverUrl
      }));

      console.log('setting up prover');
      await prover.setup(await notary.sessionUrl());
      console.log('prover', prover);


    const resp = await prover.sendRequest(websocketProxyUrl, {
      url: serverUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        secret: 'test_secret',
      },
      body: {
        hello: 'world',
        one: 1,
      },
    });

    console.log('resp', resp);


    } catch (error) {
      console.log('tls notary error', error);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <h1 className='text-2xl font-bold'>
        Experiment Page
      </h1>

      <Button
        onPress={handleTlsNotary}
        disabled={!initialized || isProcessing}
        isLoading={isProcessing}
        color='primary'
      >
        {isProcessing ? 'Processing...' : 'Start TLS Notary'}
      </Button>
    </div>
  )
}
