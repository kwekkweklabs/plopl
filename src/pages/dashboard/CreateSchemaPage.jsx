import { useAuth } from '@/providers/AuthProvider';
import { Button, Input, Textarea } from '@heroui/react'
import React, { useState } from 'react'

export default function CreateSchemaPage() {
  const { accessToken, me, chainId } = useAuth();
  // console.log('accessToken', accessToken);
  // console.log('me', me);
  // console.log('chainId', chainId);

  const [formData, setFormData] = useState({
    schemaName: '',
    description: '',
    apiEndpoint: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
  };

  return (
    <div className="mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
        <h1 className='text-3xl font-semibold mb-2'>
          Schema Details
        </h1>
        <p className="text-gray-600 mb-8">
          Define what API calls and responses should be verified.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-lg font-medium mb-2">Schema Name</label>
            <Input 
              name="schemaName"
              value={formData.schemaName}
              onChange={handleChange}
              placeholder="Twitter Verification"
              className="w-full"
            />
            <p className="text-gray-500 mt-2 text-sm">A descriptive name for your schema.</p>
          </div>

          <div className="mb-6">
            <label className="block text-lg font-medium mb-2">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Verify Twitter profile data including username, follower count, and verification status."
              className="w-full"
              rows={10}
            />
            <p className="text-gray-500 mt-2 text-sm">Explain what this schema verifies.</p>
          </div>

          <div className="mb-8">
            <label className="block text-lg font-medium mb-2">API Endpoint</label>
            <Input 
              name="apiEndpoint"
              value={formData.apiEndpoint}
              onChange={handleChange}
              placeholder="https://api.twitter.com/2/users/me"
              className="w-full"
            />
            <p className="text-gray-500 mt-2 text-sm">The API endpoint that will be called.</p>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit"
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Create Schema
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
