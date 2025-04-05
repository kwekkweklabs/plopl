import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router';
import Plopl from '../../utils/PloplSDK';

export default function RecipePage() {
  // recipe id params
  const { id } = useParams();
  const [schema, setSchema] = useState(null);
  const [activeTab, setActiveTab] = useState('implementation');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const handleGetRecipe = async () => {
    try {
      setLoading(true);
      const res = await axios({
        method: 'GET',
        url: `${import.meta.env.VITE_BACKEND_URL}/schema/${id}`
      });
      
      setSchema(res.data);
      console.log('Schema', res.data);
    } catch (error) {
      console.error('Error fetching schema:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleGeneratePLOPL = async () => {
    setGenerating(true);
    
    try {
      // Create a new Plopl instance with the schema ID
      const plopl = new Plopl({
        schemaId: schema.id,
        chainId: schema.chainId
      });
      
      // Generate the proof by redirecting to the prepare URL
      await plopl.generateProof({ newTab: true });
      
      // Reset generating state after a short delay
      setTimeout(() => {
        setGenerating(false);
      }, 1000);
    } catch (error) {
      console.error('Error redirecting to prepare URL:', error);
      setGenerating(false);
    }
  };

  useEffect(() => {
    handleGetRecipe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Schema not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-8">
        <button 
          onClick={() => window.history.back()} 
          className="mr-4 text-gray-600 hover:text-gray-900"
          type="button"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold flex-1">{schema.name || schema.schema?.name}</h1>
        <div className="bg-gray-100 rounded-full px-4 py-1 text-gray-700">
          Chain ID: {schema.chainId}
        </div>
        <div className="bg-green-100 rounded-full px-4 py-1 ml-2 text-green-700">
          active
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Schema Details</h2>
        <p className="text-gray-600 mb-6">{schema.description || schema.schema?.description}</p>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="flex items-start">
            <div className="bg-orange-100 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Creator</h3>
              <p className="text-gray-600">PLOPL Team</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-orange-100 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Created</h3>
              <p className="text-gray-600">{new Date(schema.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-orange-100 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">API Endpoint</h3>
              <p className="text-gray-600 break-words">{schema.schema?.request?.url || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-orange-100 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Proof Count</h3>
              <p className="text-gray-600">{schema._count.usages || 0} {schema._count.usages === 1 ? 'proof' : 'proofs'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Generate this PLOPL</h2>
            <p className="text-gray-600">Create a verification proof for this schema</p>
          </div>
          <button 
            onClick={handleGeneratePLOPL}
            disabled={generating}
            type="button"
            className={`px-6 py-3 rounded-md text-white font-medium ${generating ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-600'} transition-colors duration-200 flex items-center`}
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>Generate PLOPL</>
            )}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'implementation' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('implementation')}
            type="button"
          >
            Implementation
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'webhooks' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('webhooks')}
            type="button"
          >
            Webhooks
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'examples' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('examples')}
            type="button"
          >
            Examples
          </button>
        </div>
      </div>

      {activeTab === 'implementation' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Implementation Guide</h2>
          <p className="text-gray-600 mb-8">Follow these steps to implement this schema in your application.</p>

          <div className="mb-10">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-full w-8 h-8 flex items-center justify-center text-orange-500 font-bold mr-3">1</div>
              <h3 className="text-xl font-semibold">Initialize Plopl</h3>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 ml-11 font-mono relative">
              <pre className="whitespace-pre-wrap">
{`const plopl = new Plopl({
  schemaId: '${schema.id}',
  chainId: ${schema.chainId}
});`}
              </pre>
              <button className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" onClick={() => navigator.clipboard.writeText(`const plopl = new Plopl({\n  schemaId: '${schema.id}',\n  chainId: ${schema.chainId}\n});`)} type="button">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-full w-8 h-8 flex items-center justify-center text-orange-500 font-bold mr-3">2</div>
              <h3 className="text-xl font-semibold">Generate Proof</h3>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 ml-11 font-mono relative">
              <pre className="whitespace-pre-wrap">
{`// In your frontend
const proof = await plopl.generateProof();

// Send the proof to your smart contract
const tx = await yourContract.verify${schema.name || schema.schema?.name || 'Data'}(proof);`}
              </pre>
              <button className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" onClick={() => navigator.clipboard.writeText(`// In your frontend\nconst proof = await plopl.generateProof();\n\n// Send the proof to your smart contract\nconst tx = await yourContract.verify${schema.name || schema.schema?.name || 'Data'}(proof);`)} type="button">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Webhooks</h2>
          <p className="text-gray-600 mb-4">Configure webhooks to receive updates about verifications.</p>
          
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">No webhooks configured yet</p>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600" type="button">
              Add Webhook
            </button>
          </div>
        </div>
      )}

      {activeTab === 'examples' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Examples</h2>
          <p className="text-gray-600 mb-6">Here are some example integrations with this schema.</p>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">React Example</h3>
            <div className="bg-gray-100 rounded-lg p-4 font-mono relative">
              <pre className="whitespace-pre-wrap">
{`function VerifyButton() {
  const [isVerifying, setIsVerifying] = useState(false);
  
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const plopl = new Plopl({
        schemaId: '${schema.id}',
        chainId: ${schema.chainId}
      });
      
      const proof = await plopl.generateProof();
      
      // Send to your backend or smart contract
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proof }),
      });
      
      const result = await response.json();
      console.log('Verification result:', result);
      
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <button
      onClick={handleVerify}
      disabled={isVerifying}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      {isVerifying ? 'Verifying...' : 'Verify with PLOPL'}
    </button>
  );
}`}
              </pre>
              <button className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" onClick={() => navigator.clipboard.writeText(`function VerifyButton() {\n  const [isVerifying, setIsVerifying] = useState(false);\n  \n  const handleVerify = async () => {\n    setIsVerifying(true);\n    try {\n      const plopl = new Plopl({\n        schemaId: '${schema.id}',\n        chainId: ${schema.chainId}\n      });\n      \n      const proof = await plopl.generateProof();\n      \n      // Send to your backend or smart contract\n      const response = await fetch('/api/verify', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n        },\n        body: JSON.stringify({ proof }),\n      });\n      \n      const result = await response.json();\n      console.log('Verification result:', result);\n      \n    } catch (error) {\n      console.error('Verification failed:', error);\n    } finally {\n      setIsVerifying(false);\n    }\n  };\n  \n  return (\n    <button\n      onClick={handleVerify}\n      disabled={isVerifying}\n      className="bg-blue-500 text-white px-4 py-2 rounded"\n    >\n      {isVerifying ? 'Verifying...' : 'Verify with PLOPL'}\n    </button>\n  );\n}`)} type="button">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Solidity Example</h3>
            <div className="bg-gray-100 rounded-lg p-4 font-mono relative">
              <pre className="whitespace-pre-wrap">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContract is IPLOPLConsumer {
    PLOPLVerifier public verifier;
    mapping(address => bool) public verified;
    
    constructor(address _verifierAddress) {
        verifier = PLOPLVerifier(_verifierAddress);
    }
    
    function verify${schema.name || schema.schema?.name || 'Data'}(bytes calldata proof) external {
        // Call the PLOPL verifier
        verifier.verify(
            "${schema.id}",
            proof,
            address(this)
        );
        
        // Mark user as verified
        verified[msg.sender] = true;
    }
    
    // This function is called by the PLOPL verifier after successful verification
    function ploplCallback(bytes calldata /* result */) external override {
        require(msg.sender == address(verifier), "Only verifier can call");
        // Additional custom logic after verification
    }
}`}
              </pre>
              <button className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" onClick={() => navigator.clipboard.writeText(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContract is IPLOPLConsumer {
    PLOPLVerifier public verifier;
    mapping(address => bool) public verified;
    
    constructor(address _verifierAddress) {
        verifier = PLOPLVerifier(_verifierAddress);
    }
    
    function verify${schema.name || schema.schema?.name || 'Data'}(bytes calldata proof) external {
        // Call the PLOPL verifier
        verifier.verify(
            "${schema.id}",
            proof,
            address(this)
        );
        
        // Mark user as verified
        verified[msg.sender] = true;
    }
    
    // This function is called by the PLOPL verifier after successful verification
    function ploplCallback(bytes calldata /* result */) external override {
        require(msg.sender == address(verifier), "Only verifier can call");
        // Additional custom logic after verification
    }
}`)} type="button">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
