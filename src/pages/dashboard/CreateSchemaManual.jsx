import React, { useState } from 'react';
import { Button, Input, Textarea } from '@heroui/react';

export default function CreateSchemaManual({ onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    schema: initialData.schema ? JSON.stringify(initialData.schema, null, 2) : '{\n  "id": "",\n  "slug": "",\n  "description": "",\n  "prepareUrl": "",\n  "request": {\n    "url": "",\n    "method": "GET",\n    "args": {\n      "json": {},\n      "urlParams": ""\n    }\n  },\n  "response": {\n    "request": {\n      "method": "GET"\n    },\n    "match": {\n      "fields": [],\n      "expected": []\n    }\n  }\n}'
  });

  const [schemaError, setSchemaError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear schema error if user is editing it
    if (name === 'schema') {
      setSchemaError('');
    }
  };

  const validateSchema = (schemaStr) => {
    try {
      const parsedSchema = JSON.parse(schemaStr);
      
      // Basic validation to ensure required fields exist
      if (!parsedSchema.id && parsedSchema.id !== 0) return 'Schema must include an id field';
      if (!parsedSchema.slug) return 'Schema must include a slug field';
      if (!parsedSchema.description) return 'Schema must include a description field';
      if (!parsedSchema.request?.url) return 'Schema must include a request URL';
      if (!parsedSchema.request?.method) return 'Schema must include a request method';
      
      return null; // No errors
    } catch (error) {
      return `Invalid JSON: ${error.message}`;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate the schema JSON
    const validationError = validateSchema(formData.schema);
    if (validationError) {
      setSchemaError(validationError);
      return;
    }
    
    // Parse the schema string to JSON
    const schema = JSON.parse(formData.schema);
    
    // Call the parent's onSubmit with the form data
    onSubmit({
      name: formData.name,
      description: formData.description,
      schema
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Manual Schema Creation</h2>
        <p className="text-gray-600 mb-6">
          Directly enter your schema details in JSON format. This is for advanced users who prefer to edit the schema manually.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Schema"
              className="w-full"
              required
            />
            <p className="text-gray-500 mt-1 text-xs">A short, descriptive name for your schema</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Prove you've attended at least two ETHGlobal events, one of which must be ETHGlobal Singapore."
              className="w-full"
              rows={3}
              required
            />
            <p className="text-gray-500 mt-1 text-xs">A detailed explanation of what this schema proves</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Schema JSON</label>
            <Textarea
              name="schema"
              value={formData.schema}
              onChange={handleChange}
              className="w-full font-mono text-sm"
              rows={20}
              required
            />
            {schemaError && (
              <p className="text-red-500 mt-1 text-sm">{schemaError}</p>
            )}
            <p className="text-gray-500 mt-1 text-xs">Enter your complete schema in JSON format</p>
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Create Recipe
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 