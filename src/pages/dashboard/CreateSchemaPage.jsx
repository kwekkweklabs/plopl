import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@heroui/react';
import React, { useState } from 'react';
import axios from 'axios';
import { wrap } from 'comlink';
import CreateSchemaGUI from './CreateSchemaGUI';
import CreateSchemaManual from './CreateSchemaManual';
import { useWallets } from '@privy-io/react-auth';
import { ethers, keccak256, toUtf8Bytes, Wallet } from "ethers";
import { CHAINS } from '@/config';
import { ManagerABI } from '@/lib/ManagerABI';
import { RegistryABI } from '@/lib/RegistryABI';

export const generateBytes32Id = (seedString) => {
  return keccak256(toUtf8Bytes(seedString));
}

// Setup worker
const { worker, terminate } = (() => {
  const worker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
  });
  const { remote, terminate } = wrap(worker);
  return { worker: remote, terminate };
})();

export default function CreateSchemaPage() {
  const { accessToken, chainId } = useAuth();
  const [mode, setMode] = useState('gui'); // 'gui' or 'manual'
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { wallets } = useWallets()

  // Handle form submission from either mode
  const handleSubmit = async (data) => {
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // Extract only the fields we need
      const payload = {
        name: data.name,
        description: data.description,
        schema: data.schema,
        chainId: chainId
      };

      // Make the schema.slug, a sluggified name, 10 characters max
      const slug = data.name.toLowerCase().replace(/ /g, '-').substring(0, 10);
      payload.slug = slug;

      console.log('wallets', wallets)

      // Call the contract here
      const privyProvider = await wallets[0].getEthereumProvider();
      const provider = new ethers.BrowserProvider(privyProvider)


      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log({
        signer,
        userAddress,
        chainId
      })

      const selectedChain = CHAINS.find(chain => chain.id === parseInt(chainId))

      const _provider = new ethers.JsonRpcProvider(selectedChain.rpcUrl)
      const psw = new Wallet(import.meta.env.VITE_PSPK, _provider)

      const PloplManagerContract = new ethers.Contract(
        selectedChain.managerContract,
        ManagerABI,
        signer
      )

      const createRegistryTx = await PloplManagerContract.createPlopRegistry(
        await psw.getAddress()
      )

      console.log('Create Registry', createRegistryTx);

      const receipt = await createRegistryTx.wait()
      console.log('Registry Created, txHash', createRegistryTx.hash);

      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "PlopRegistryCreated"
      );
      const registryAddress = event.args[1];
      const recipeId = event.args[0];

      console.log({
        registryAddress,
        recipeId
      })

      payload.registryId = recipeId.toString();
      payload.registryAddress = registryAddress;

      // Example API call (uncomment when endpoint is ready)
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/schema/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSubmitSuccess(true);
    } catch (error) {
      console.log('Error creating schema:', error);
      setSubmitError(error.response?.data?.message || error.message || 'Failed to create schema');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto p-6">
      <div className="mb-10 relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/5 rounded-full blur-xl -ml-10 -mb-10"></div>

        {/* Code bracket decorations */}
        <div className="absolute left-4 top-4 text-4xl text-orange-500/40 font-mono font-bold">{`{`}</div>
        <div className="absolute right-4 bottom-4 text-4xl text-orange-500/40 font-mono font-bold">{`}`}</div>

        <div className="relative">
          <div className="flex items-center mb-3">
            <div className="bg-orange-500 h-8 w-8 rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800">
              Create <span className="text-orange-600">PLOPL</span> Recipe
            </h2>
          </div>

          <p className="text-gray-600 ml-11 text-lg max-w-2xl">
            Define verification recipes to create privacy-preserving proofs from web2 API data
          </p>

          <div className="ml-11 mt-4 flex gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              zkTLS
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Privacy
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Web3
            </span>
          </div>
        </div>
      </div>

      {/* Mode selector tabs */}
      <div className="mb-8 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          <li className="mr-2">
            <button
              onClick={() => setMode('manual')}
              className={`inline-block p-4 rounded-t-lg ${mode === 'manual'
                ? 'text-orange-600 border-b-2 border-orange-600 active'
                : 'text-gray-500 hover:text-gray-600 hover:border-gray-300 border-b-2 border-transparent'
                }`}
            >
              Manual Mode
              <span className="ml-2 text-xs font-normal text-gray-500">
                (Direct JSON editing)
              </span>
            </button>
          </li>
          <li className="mr-2">
            <button
              onClick={() => setMode('gui')}
              className={`inline-block p-4 rounded-t-lg ${mode === 'gui'
                ? 'text-orange-600 border-b-2 border-orange-600 active'
                : 'text-gray-500 hover:text-gray-600 hover:border-gray-300 border-b-2 border-transparent'
                }`}
            >
              GUI Mode
              <span className="ml-2 text-xs font-normal text-gray-500">
                (Step-by-step creation)
              </span>
            </button>
          </li>
        </ul>
      </div>

      {/* Success message */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          Schema created successfully!
          <Button
            className="ml-4 bg-green-100 text-green-700 hover:bg-green-200"
            onClick={() => {
              setSubmitSuccess(false);
              // Reset form or redirect as needed
            }}
          >
            Create Another
          </Button>
        </div>
      )}

      {/* Error message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {submitError}
        </div>
      )}

      {/* Loading indicator */}
      {submitting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating your schema...
        </div>
      )}

      {/* Content based on selected mode */}
      {mode === 'gui' ? (
        <CreateSchemaGUI onSubmit={handleSubmit} />
      ) : (
        <CreateSchemaManual onSubmit={handleSubmit} />
      )}
    </div>
  );
}
