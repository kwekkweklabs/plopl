import * as Comlink from 'comlink';
// Import only init at first to ensure proper WASM initialization
import init, { Prover, Presentation } from 'tlsn-js';

console.log('worker.js loaded');

// Factory functions to create objects in the worker context
async function createProver(options) {
  return new Prover(options);
}

async function createPresentation(options) {
  return new Presentation(options);
}

async function initialize(options) {
  await init(options);
  return true;
}

// Expose factory functions instead of constructors
Comlink.expose({
  initialize,
  createProver,
  createPresentation
});