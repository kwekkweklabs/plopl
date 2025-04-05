import { useAuth } from '@/providers/AuthProvider';
import { Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function CreateSchemaGUI({ onSubmit, initialData = {} }) {
  const { accessToken, me, chainId } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  const [curlCommand, setCurlCommand] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [testResponseError, setTestResponseError] = useState('');
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldConditions, setFieldConditions] = useState([]);
  const [parsedCurl, setParsedCurl] = useState(null);
  const [fullscreenExplorer, setFullscreenExplorer] = useState(false);
  const fullscreenRef = useRef(null);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [hoveredValue, setHoveredValue] = useState(null);
  
  const [formData, setFormData] = useState({
    id: initialData.id || '',
    slug: initialData.slug || '',
    description: initialData.description || '',
    prepareUrl: initialData.prepareUrl || '',
    request: {
      url: initialData.request?.url || '',
      method: initialData.request?.method || 'GET',
      args: {
        json: initialData.request?.args?.json || {},
        urlParams: initialData.request?.args?.urlParams || ''
      }
    },
    response: {
      request: {
        method: initialData.response?.request?.method || 'GET'
      },
      match: {
        fields: initialData.response?.match?.fields || [],
        expected: initialData.response?.match?.expected || []
      }
    }
  });

  // Parse curl command to fill request details
  const parseCurlCommand = async () => {
    setLoadingResponse(true);
    setTestResponseError('');
    
    try {
      // Call backend to simulate curl instead of parsing it ourselves
      const backendUrl = `${import.meta.env.VITE_BACKEND_URL}/simulate-curl`;
      
      const response = await axios.post(backendUrl, curlCommand, {
        headers: {
          'Content-Type': 'text/plain',
        }
      });
      
      // The API returns the data directly
      const result = response.data;
      
      // Extract request details from the curl command
      // Since we don't get parsed info back, we'll use a simplified approach
      const urlMatch = curlCommand.match(/curl ['"]([^'"]+)['"]/);
      const methodMatch = curlCommand.match(/-X ([A-Z]+)/);
      const dataMatch = curlCommand.match(/(-d|--data|--data-raw) ['"](.+?)['"]/s);
      
      if (urlMatch) {
        const url = urlMatch[1];
        // Default to POST if there's data, otherwise GET
        const hasData = curlCommand.includes(' -d ') || 
                       curlCommand.includes(' --data ') || 
                       curlCommand.includes(' --data-raw ');
        const method = methodMatch ? methodMatch[1] : (hasData ? 'POST' : 'GET');
        
        // Try to parse the data payload if it exists
        let data = {};
        if (dataMatch) {
          try {
            const dataString = dataMatch[2];
            // Try to parse as JSON if it looks like JSON
            if (dataString.trim().startsWith('{') || dataString.trim().startsWith('[')) {
              data = JSON.parse(dataString);
            } else {
              // Could be form data or other format, store as string
              data = dataString;
            }
          } catch (e) {
            console.warn('Failed to parse data as JSON:', e);
          }
        }
        
        const parsedInfo = {
          url,
          method,
          headers: {},
          data
        };
        
        setParsedCurl(parsedInfo);
        
        // Update form data with extracted info
        setFormData(prev => ({
          ...prev,
          request: {
            ...prev.request,
            url,
            method,
            args: {
              ...prev.request.args,
              json: data || {}
            }
          },
          response: {
            ...prev.response,
            request: {
              ...prev.response.request,
              method
            }
          }
        }));
      }
      
      // Set the direct response from the simulated curl command
      setTestResponse(result);
      
    } catch (error) {
      console.error('Error simulating curl command:', error);
      setTestResponseError('Failed to simulate curl command: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingResponse(false);
    }
  };
  
  // Execute the actual request instead of mock
  const testRequest = async () => {
    setLoadingResponse(true);
    setTestResponseError('');
    
    try {
      if (!parsedCurl) {
        throw new Error('Please parse a curl command first');
      }
      
      // Use the same backend endpoint to re-execute the curl command
      const backendUrl = `${import.meta.env.VITE_BACKEND_URL}/simulate-curl`;
      
      const response = await axios.post(backendUrl, curlCommand, {
        headers: {
          'Content-Type': 'text/plain',
        }
      });
      
      // Direct response from the API
      const result = response.data;
      setTestResponse(result);
      
    } catch (error) {
      setTestResponseError(error.response?.data?.message || error.message);
    } finally {
      setLoadingResponse(false);
    }
  };
  
  // Rest of the component functions remain the same...
  // Handle selecting a field from the JSON response
  const handleSelectField = (path, value) => {
    // Add field to selected fields if not already selected
    if (!selectedFields.includes(path)) {
      setSelectedFields([...selectedFields, path]);
      
      // Add default condition based on value type
      let defaultCondition = '';
      if (Array.isArray(value)) {
        defaultCondition = `x.length() >= ${value.length}`;
      } else if (typeof value === 'number') {
        defaultCondition = `x === ${value}`;
      } else if (typeof value === 'string') {
        defaultCondition = `x === '${value}'`;
      } else if (typeof value === 'boolean') {
        defaultCondition = `x === ${value}`;
      } else if (value === null) {
        defaultCondition = 'x === null';
      } else if (typeof value === 'object') {
        defaultCondition = 'x !== null';
      }
      
      setFieldConditions([...fieldConditions, defaultCondition]);
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        response: {
          ...prev.response,
          match: {
            fields: [...prev.response.match.fields, path],
            expected: [...prev.response.match.expected, defaultCondition]
          }
        }
      }));
    }
  };
  
  // Remove a field from selection
  const removeSelectedField = (index) => {
    const newFields = [...selectedFields];
    const newConditions = [...fieldConditions];
    
    newFields.splice(index, 1);
    newConditions.splice(index, 1);
    
    setSelectedFields(newFields);
    setFieldConditions(newConditions);
    
    setFormData(prev => ({
      ...prev,
      response: {
        ...prev.response,
        match: {
          fields: newFields,
          expected: newConditions
        }
      }
    }));
  };
  
  // Update condition for a field
  const updateCondition = (index, condition) => {
    const newConditions = [...fieldConditions];
    newConditions[index] = condition;
    
    setFieldConditions(newConditions);
    
    setFormData(prev => ({
      ...prev,
      response: {
        ...prev.response,
        match: {
          ...prev.response.match,
          expected: newConditions
        }
      }
    }));
  };
  
  // Parse condition string into operator and value
  const parseCondition = (condition) => {
    // Order is important - check triple equals first
    const operators = ['===', '!==', '>=', '<=', '==', '!=', '>', '<'];
    let operator = '==='; // Default to triple equals
    let value = '';
    
    if (!condition) {
      return { operator, value };
    }
    
    // Try to find an operator in the condition
    for (const op of operators) {
      if (condition.includes(op)) {
        operator = op;
        // Split only on the first occurrence to handle cases where value contains the operator
        const parts = condition.split(op);
        value = parts.slice(1).join(op).trim();
        break;
      }
    }
    
    // Handle special cases like length()
    if (condition.includes('length()')) {
      operator = '>=';
      value = condition.split('>=')[1]?.trim() || '';
    }
    
    // Handle includes, startsWith, endsWith
    if (condition.includes('.includes(')) {
      operator = 'contains';
      const match = condition.match(/\.includes\('([^']*)'\)/);
      value = match ? match[1] : '';
    } else if (condition.includes('.startsWith(')) {
      operator = 'startsWith';
      const match = condition.match(/\.startsWith\('([^']*)'\)/);
      value = match ? match[1] : '';
    } else if (condition.includes('.endsWith(')) {
      operator = 'endsWith';
      const match = condition.match(/\.endsWith\('([^']*)'\)/);
      value = match ? match[1] : '';
    }
    
    // Remove quotes for string values
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    
    return { operator, value };
  };
  
  // Get appropriate operators based on value type
  const getOperatorsForType = (type) => {
    switch (type) {
      case 'string':
        return [
          { value: '===', label: 'equals (===)' },
          { value: '!==', label: 'not equals (!==)' },
          { value: 'contains', label: 'contains' },
          { value: 'startsWith', label: 'starts with' },
          { value: 'endsWith', label: 'ends with' }
        ];
      case 'number':
        return [
          { value: '===', label: 'equals (===)' },
          { value: '!==', label: 'not equals (!==)' },
          { value: '>', label: 'greater than (>)' },
          { value: '>=', label: 'greater than or equals (>=)' },
          { value: '<', label: 'less than (<)' },
          { value: '<=', label: 'less than or equals (<=)' }
        ];
      case 'boolean':
        return [
          { value: '===', label: 'equals (===)' },
          { value: '!==', label: 'not equals (!==)' }
        ];
      case 'object':
      case 'array':
        return [
          { value: '!==', label: 'is not null (!==)' },
          { value: '===', label: 'is null (===)' }
        ];
      case 'null':
        return [
          { value: '===', label: 'is null (===)' },
          { value: '!==', label: 'is not null (!==)' }
        ];
      default:
        return [
          { value: '===', label: 'equals (===)' },
          { value: '!==', label: 'not equals (!==)' }
        ];
    }
  };
  
  // Generate human-readable explanation for a condition
  const getConditionExplanation = (field, operator, value, valueType) => {
    const fieldName = field.split('.').pop();
    const isFindOperation = field.includes('.find(');
    
    // Special handling for find operations
    if (isFindOperation) {
      const arrayPath = field.split('.find(')[0];
      const propName = field.match(/\.find\(([^)]+)\)/)?.[1];
      
      switch (operator) {
        case '===':
        case '==':
          if (valueType === 'null') return `Find item in ${arrayPath} where ${propName} is null`;
          if (valueType === 'boolean') return `Find item in ${arrayPath} where ${propName} is ${value}`;
          if (valueType === 'string') return `Find item in ${arrayPath} where ${propName} equals "${value}"`;
          return `Find item in ${arrayPath} where ${propName} equals ${value}`;
        case '!==':
        case '!=':
          if (valueType === 'null') return `Find item in ${arrayPath} where ${propName} is not null`;
          if (valueType === 'boolean') return `Find item in ${arrayPath} where ${propName} is not ${value}`;
          if (valueType === 'string') return `Find item in ${arrayPath} where ${propName} is not "${value}"`;
          return `Find item in ${arrayPath} where ${propName} is not ${value}`;
        default:
          return `Find item in ${arrayPath} where ${propName} ${operator} ${value}`;
      }
    }
    
    // Normal field handling (non-find operations)
    switch (operator) {
      case '===':
      case '==':
        if (valueType === 'null') return `${fieldName} must be null`;
        if (valueType === 'boolean') return `${fieldName} must be ${value}`;
        if (valueType === 'string') return `${fieldName} must be exactly "${value}"`;
        return `${fieldName} must equal ${value}`;
      case '!==':
      case '!=':
        if (valueType === 'null') return `${fieldName} must not be null`;
        if (valueType === 'boolean') return `${fieldName} must not be ${value}`;
        if (valueType === 'string') return `${fieldName} must not be "${value}"`;
        return `${fieldName} must not equal ${value}`;
      case '>':
        return `${fieldName} must be greater than ${value}`;
      case '>=':
        if (field.includes('length()')) return `Array must have at least ${value} items`;
        return `${fieldName} must be at least ${value}`;
      case '<':
        return `${fieldName} must be less than ${value}`;
      case '<=':
        return `${fieldName} must be at most ${value}`;
      case 'contains':
        return `${fieldName} must contain "${value}"`;
      case 'startsWith':
        return `${fieldName} must start with "${value}"`;
      case 'endsWith':
        return `${fieldName} must end with "${value}"`;
      default:
        return `${fieldName} ${operator} ${value}`;
    }
  };

  // Toggle expansion state of a JSON path
  const toggleExpand = (path) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Helper to determine if a path should be expanded
  const isExpanded = (path) => {
    return expandedPaths.has(path);
  };

  // Function to format a value for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `"${value.replace(/&quot;/g, '"')}"`;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return `Array[${value.length}]`;
      return `Object{${Object.keys(value).length}}`;
    }
    return String(value);
  };

  // Extract arrays from response
  const findArrays = (obj, path = '', result = []) => {
    if (!obj || typeof obj !== 'object') return result;
    
    if (Array.isArray(obj) && obj.length > 0) {
      result.push({ path, data: obj });
    }
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        findArrays(value, newPath, result);
      });
    }
    
    return result;
  };
  
  // Fullscreen mode control for JSON explorer
  const toggleFullscreen = () => {
    if (!fullscreenExplorer) {
      if (fullscreenRef.current && fullscreenRef.current.requestFullscreen) {
        fullscreenRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    
    setFullscreenExplorer(!fullscreenExplorer);
  };
  
  // Listen for ESC key to exit fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExplorer(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev };
      
      if (name.includes('.')) {
        const parts = name.split('.');
        let current = newData;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) current[part] = {};
          current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
      } else {
        newData[name] = value;
      }
      
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Pass only the schema to the parent component
    onSubmit({
      name: formData.description, // Use description as name for now
      description: formData.description,
      schema: formData
    });
  };

  // Step navigation
  const goToNextStep = () => {
    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  // Prettify JSON
  const formatJson = (json) => {
    if (!json) return '';
    try {
      if (typeof json === 'string') {
        return JSON.stringify(JSON.parse(json), null, 2);
      } else {
        return JSON.stringify(json, null, 2);
      }
    } catch (e) {
      return json.toString();
    }
  };

  // Auto-generate slug from description if empty
  useEffect(() => {
    if (formData.description && !formData.slug) {
      setFormData(prev => ({
        ...prev,
        slug: formData.description
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 30)
      }));
    }
  }, [formData.description]);

  // For brevity, we'll create a simplified JsonTreeExplorer component
  const JsonTreeExplorer = ({ data, path = '' }) => {
    return (
      <div className="bg-white rounded-xl p-4 overflow-auto">
        <pre className="text-sm">{formatJson(data)}</pre>
        <div className="mt-3 text-sm text-gray-500">
          Click on values in the response to add match conditions
        </div>
      </div>
    );
  };
  
  // Simplified version of the ConditionEditor component
  const ConditionEditor = ({ field, condition, onChange, onRemove }) => {
    // Determine value type from the condition
    const fieldPath = field.toLowerCase();
    const isArray = fieldPath.includes('length()');
    const isBoolean = condition?.includes('true') || condition?.includes('false');
    const isString = condition?.includes("'");
    const isNull = condition?.includes("null");
    
    // Parse the current condition first to get the operator and value
    const { operator, value } = parseCondition(condition || 'x === ');
    
    let valueType = 'string';
    if (isArray) valueType = 'array';
    else if (isBoolean) valueType = 'boolean';
    else if (isNull) valueType = 'null';
    else if (!isString && !isNaN(value)) valueType = 'number';
    
    // Get appropriate operators for this value type
    const operators = getOperatorsForType(valueType);
    
    // Create the human-readable explanation
    const explanation = getConditionExplanation(field, operator, value, valueType);
    
    // Helper to build the full condition string
    const buildConditionString = (op, val) => {
      let formattedValue = val;
      
      // Format the value based on type
      if (valueType === 'string' && !['===', '!=='].includes(op)) {
        if (op === 'contains') return `x.includes('${val}')`;
        if (op === 'startsWith') return `x.startsWith('${val}')`;
        if (op === 'endsWith') return `x.endsWith('${val}')`;
      }
      
      if (valueType === 'string' && val && !val.startsWith("'") && !val.endsWith("'")) {
        formattedValue = `'${val}'`;
      }
      
      if (valueType === 'boolean') {
        formattedValue = val === 'true' ? 'true' : 'false';
      }
      
      if (valueType === 'null') {
        formattedValue = 'null';
      }
      
      return `x ${op} ${formattedValue}`;
    };
    
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <div className="font-medium text-sm text-primary-700 font-mono break-all pr-2">
            {field}
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-red-500 transition-colors"
            onClick={onRemove}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Condition</label>
          
          <div className="flex space-x-2 mb-2">
            {/* Fixed 'x' input */}
            <div className="w-12">
              <Input
                value="x"
                disabled
                className="w-full text-sm rounded-lg bg-gray-100 text-gray-500 text-center"
              />
            </div>
            
            {/* Operator dropdown */}
            <div className="w-1/3">
              <Select
                value={operator || '==='}
                onChange={(e) => {
                  const newOp = e.target.value;
                  const newCondition = buildConditionString(newOp, value);
                  onChange(newCondition);
                }}
                className="w-full text-sm rounded-lg"
              >
                {operators && operators.length > 0 ? operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                )) : (
                  <SelectItem value="===">equals (===)</SelectItem>
                )}
              </Select>
            </div>
            
            {/* Value input */}
            <div className="flex-1">
              <Input
                value={value}
                onChange={(e) => {
                  const newVal = e.target.value;
                  const newCondition = buildConditionString(operator, newVal);
                  onChange(newCondition);
                }}
                placeholder={valueType === 'string' ? 'Text value' : valueType === 'number' ? '123' : 'Value'}
                disabled={valueType === 'null'}
                className="w-full text-sm rounded-lg"
              />
            </div>
          </div>
          
          {/* Natural language explanation */}
          <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded mt-1 italic">
            {explanation}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: API Call */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Paste your curl command</h2>
              <p className="text-gray-600 mb-4">
                Paste a curl command to auto-fill the request details. We&apos;ll parse it and execute the API call.
              </p>
              
              <div className="mb-4">
                <Textarea
                  value={curlCommand}
                  onChange={(e) => setCurlCommand(e.target.value)}
                  placeholder={`curl 'https://api2.ethglobal.com/graphql' \\
-X POST \\
-H 'Content-Type: application/json' \\
--data '{"query":"{getAttendeeSelf{id name}}"}'`}
                  className="w-full font-mono text-sm"
                  rows={8}
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <Button 
                  type="button" 
                  onClick={parseCurlCommand}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!curlCommand || loadingResponse}
                >
                  {loadingResponse ? 'Processing...' : 'Parse & Execute'}
                </Button>
                <Button 
                  type="button" 
                  onClick={testRequest}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  disabled={!parsedCurl || loadingResponse}
                >
                  {loadingResponse ? 'Loading...' : 'Execute Again'}
                </Button>
              </div>
            </div>
            
            {parsedCurl && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Parsed Request Details</h3>
                
                <div className="mb-4">
                  <h4 className="font-medium">Request</h4>
                  <div className="space-y-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">URL</label>
                      <Input 
                        name="request.url"
                        value={formData.request.url}
                        onChange={handleChange}
                        className="w-full font-mono text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Method</label>
                        <Select 
                          name="request.method"
                          value={formData.request.method}
                          onChange={handleChange}
                          className="w-full"
                        >
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Response Method</label>
                        <Select 
                          name="response.request.method"
                          value={formData.response.request.method}
                          onChange={handleChange}
                          className="w-full"
                        >
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </Select>
                      </div>
                    </div>
                    
                    {(parsedCurl.data || formData.request.args.json) && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Request Body</label>
                        <Textarea
                          value={formatJson(formData.request.args.json)}
                          onChange={(e) => {
                            try {
                              const json = JSON.parse(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                request: {
                                  ...prev.request,
                                  args: {
                                    ...prev.request.args,
                                    json
                                  }
                                }
                              }));
                            } catch (error) {
                              // Allow invalid JSON during editing
                            }
                          }}
                          className="w-full font-mono text-sm"
                          rows={6}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Response</h4>
                  {testResponseError ? (
                    <div className="p-4 bg-red-50 text-red-800 rounded-md">
                      {testResponseError}
                    </div>
                  ) : testResponse ? (
                    <div>
                      <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-md">
                        Response received successfully! You can select fields to match in the next step.
                      </div>
                      <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                        <pre className="text-sm">{formatJson(testResponse)}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50 text-blue-800 rounded-md">
                      Click &quot;Parse & Execute&quot; to execute the API call and see the response.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={!testResponse}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continue to Response Matching
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Response Matching - Simplified version */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Select fields to match</h2>
              </div>
              
              <p className="text-gray-600 mb-4">
                Click on fields in the response that you want to validate. You can then set conditions for each field.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4">
                {/* JSON Explorer Area - simplified */}
                <div className="flex-grow">
                  {testResponse ? (
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-gray-800">Response Data</h3>
                      <JsonTreeExplorer data={testResponse} />
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl">
                      <div className="text-center p-8 max-w-md">
                        <h3 className="text-xl font-medium text-gray-700 mb-2">No Response Data</h3>
                        <p className="text-gray-500">
                          Execute the API call in the first step to see response data.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected Fields Panel */}
                <div className="md:w-1/3 flex-shrink-0">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h4 className="font-medium text-gray-700">
                        Selected Fields
                      </h4>
                      <span className="bg-primary-50 text-primary-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {selectedFields.length} selected
                      </span>
                    </div>
                    
                    <div className="p-3">
                      {selectedFields.length === 0 ? (
                        <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
                          <div className="mb-2">No fields selected yet</div>
                          <p className="text-xs">Click on values in the response to add conditions</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedFields.map((field, index) => (
                            <ConditionEditor
                              key={index}
                              field={field}
                              condition={fieldConditions[index]}
                              onChange={(newCondition) => updateCondition(index, newCondition)}
                              onRemove={() => removeSelectedField(index)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button
                type="button"
                onClick={goToPrevStep}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Back to API Call
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={selectedFields.length === 0}
              >
                Continue to Recipe Details
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Recipe Details */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Basic Recipe Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipe ID</label>
                  <Input 
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="1"
                    type="number"
                    className="w-full"
                  />
                  <p className="text-gray-500 mt-1 text-xs">Unique numeric identifier</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Slug</label>
                  <Input 
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="ethglobal-event-check"
                    className="w-full"
                  />
                  <p className="text-gray-500 mt-1 text-xs">Readable unique identifier (auto-generated from description)</p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Prove you've attended at least two ETHGlobal events, one of which must be ETHGlobal Singapore."
                  className="w-full"
                  rows={3}
                />
                <p className="text-gray-500 mt-1 text-xs">A short explanation of what this recipe proves</p>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Prepare URL</label>
                <Input 
                  name="prepareUrl"
                  value={formData.prepareUrl}
                  onChange={handleChange}
                  placeholder="https://ethglobal.com/home"
                  className="w-full"
                />
                <p className="text-gray-500 mt-1 text-xs">URL the user can visit to log in before the API call</p>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button
                type="button"
                onClick={goToPrevStep}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Back to Response Matching
              </Button>
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Create Recipe
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 