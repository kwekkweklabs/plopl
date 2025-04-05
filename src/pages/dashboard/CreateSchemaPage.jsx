import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@heroui/react';
import React, { useState } from 'react';
import CreateSchemaGUI from './CreateSchemaGUI';
import CreateSchemaManual from './CreateSchemaManual';

export default function CreateSchemaPage() {
  const { accessToken } = useAuth();
  const [mode, setMode] = useState('gui'); // 'gui' or 'manual'
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
        schema: data.schema
      };

      // Here would be the actual API call to create the schema
      console.log('Submitting schema:', payload);

      // Example API call (uncomment when endpoint is ready)
      // const response = await axios.post(
      //   `${import.meta.env.VITE_BACKEND_URL}/schema/create`, 
      //   payload,
      //   {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //       'Content-Type': 'application/json'
      //     }
      //   }
      // );

      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error creating schema:', error);
      setSubmitError(error.response?.data?.message || error.message || 'Failed to create schema');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
        <h1 className='text-3xl font-semibold mb-2'>
          Create PLOPL Recipe
        </h1>
        <p className="text-gray-600 mb-8">
          Define a recipe to verify web2 API data for privacy-preserving proofs.
        </p>

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
    </div>
  );
}
