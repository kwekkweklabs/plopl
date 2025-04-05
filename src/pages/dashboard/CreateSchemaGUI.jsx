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
      
      // Improved data extraction to handle --data-raw and multiline data
      let dataMatch;
      if (curlCommand.includes('--data-raw')) {
        // Handle --data-raw specifically
        dataMatch = curlCommand.match(/--data-raw\s+(['"])(.*?)\1/s);
      } else if (curlCommand.includes('--data')) {
        // Handle --data flag
        dataMatch = curlCommand.match(/--data\s+(['"])(.*?)\1/s);
      } else if (curlCommand.includes(' -d ')) {
        // Handle -d flag
        dataMatch = curlCommand.match(/-d\s+(['"])(.*?)\1/s);
      }
      
      if (urlMatch) {
        const url = urlMatch[1];
        // Default to POST if there's data, otherwise GET
        const hasData = curlCommand.includes(' -d ') || 
                       curlCommand.includes(' --data ') || 
                       curlCommand.includes(' --data-raw ');
        const method = methodMatch ? methodMatch[1] : (hasData ? 'POST' : 'GET');
        
        // Try to parse the data payload if it exists
        let data = {};
        if (dataMatch && dataMatch[2]) {
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
            // If it fails to parse, still keep the raw data
            data = dataMatch[2];
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
  
  // Handle selecting a field from the JSON response
  const handleSelectField = (path, value) => {
    // Add field to selected fields if not already selected
    if (!selectedFields.includes(path)) {
      setSelectedFields([...selectedFields, path]);
      
      // Add default condition based on value type
      let defaultCondition = '';
      
      // Determine if this is a find operation
      const isFindOperation = path.includes('.find(');
      
      if (path.includes('length()')) {
        // Special handling for length fields - set default '>=' operator
        defaultCondition = `x >= ${value}`;
      } else if (Array.isArray(value)) {
        defaultCondition = `x.length() >= ${value.length}`;
      } else if (typeof value === 'number') {
        // For numeric values, default to equals but will have all numeric operators
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
    const operators = ['===', '!==', '>=', '<=', '>', '<', '==', '!='];
    let operator = '==='; // Default to triple equals
    let value = '';
    
    if (!condition) {
      return { operator, value };
    }
    
    // Special handling for array length() conditions
    if (condition.includes('length()')) {
      for (const op of operators) {
        if (condition.includes(op)) {
          operator = op;
          const parts = condition.split(op);
          value = parts[1]?.trim() || '';
          return { operator, value };
        }
      }
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
    
    // Handle special case methods - includes, startsWith, endsWith
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
          { value: '===', label: '==' },
          { value: '!==', label: '!=' },
          { value: 'contains', label: 'contains' },
          { value: 'startsWith', label: 'starts with' },
          { value: 'endsWith', label: 'ends with' }
        ];
      case 'number':
        return [
          { value: '===', label: '==' },
          { value: '!==', label: '!=' },
          { value: '>', label: '>' },
          { value: '>=', label: '>=' },
          { value: '<', label: '<' },
          { value: '<=', label: '<=' }
        ];
      case 'boolean':
        return [
          { value: '===', label: '==' },
          { value: '!==', label: '!=' }
        ];
      case 'array':
        return [
          { value: '>=', label: '>=' },
          { value: '>', label: '>' },
          { value: '===', label: '==' },
          { value: '<', label: '<' },
          { value: '<=', label: '<=' }
        ];
      case 'object':
        return [
          { value: '!==', label: '!= null' },
          { value: '===', label: '== null' }
        ];
      case 'null':
        return [
          { value: '===', label: '== null' },
          { value: '!==', label: '!= null' }
        ];
      default:
        return [
          { value: '===', label: '==' },
          { value: '!==', label: '!=' }
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

  // Clean JSON tree explorer component
  const JsonTreeExplorer = ({ data, path = '' }) => {
    // State for collapsed nodes
    const [collapsedPaths, setCollapsedPaths] = useState({});
    // State for truncated text values
    const [expandedValues, setExpandedValues] = useState({});
    // State for hovered elements to show actions
    const [hoveredPath, setHoveredPath] = useState(null);
    // State to track open find dropdowns
    const [openFindDropdown, setOpenFindDropdown] = useState(null);
    // State to track if we're currently interacting with a dropdown
    const [isInteractingWithDropdown, setIsInteractingWithDropdown] = useState(false);
    
    // Toggle collapse state
    const toggleCollapse = (nodePath) => {
      setCollapsedPaths(prev => ({
        ...prev,
        [nodePath]: !prev[nodePath]
      }));
    };
    
    // Toggle text expansion
    const toggleExpand = (e, valuePath) => {
      e.stopPropagation();
      setExpandedValues(prev => ({
        ...prev,
        [valuePath]: !prev[valuePath]
      }));
    };
    
    // Check if a node should be collapsed
    const isCollapsed = (nodePath) => {
      return !!collapsedPaths[nodePath];
    };
    
    // Check if a value should be expanded
    const isExpanded = (valuePath) => {
      return !!expandedValues[valuePath];
    };
    
    // Truncate a string if needed
    const truncateString = (str, maxLength = 50) => {
      if (!str || typeof str !== 'string') return str;
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength) + '...';
    };
    
    // Toggle find dropdown - completely rewritten
    const toggleFindDropdown = (e, path) => {
      e.stopPropagation();
      e.preventDefault();
      setIsInteractingWithDropdown(true);
      
      if (openFindDropdown === path) {
        setOpenFindDropdown(null);
      } else {
        setOpenFindDropdown(path);
      }
      
      // Add a small delay to avoid immediate closing
      setTimeout(() => {
        setIsInteractingWithDropdown(false);
      }, 100);
    };
    
    // Reset find dropdown when user clicks elsewhere
    useEffect(() => {
      const handleClickOutside = () => {
        if (!isInteractingWithDropdown) {
          setOpenFindDropdown(null);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [isInteractingWithDropdown]);
    
    // Render JSON value with proper formatting
    const renderValue = (value, path, indent = 0) => {
      // For null or undefined
      if (value === null || value === undefined) {
        return (
          <div className="flex items-center py-0.5">
            <span 
              className="text-gray-500 font-mono text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelectField(path, value)}
              onMouseEnter={() => setHoveredPath(path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              null
            </span>
          </div>
        );
      }
      
      // For primitive values (string, number, boolean)
      if (typeof value !== 'object') {
        let displayValue;
        let valueClass;
        let isLongText = false;
        
        if (typeof value === 'string') {
          isLongText = value.length > 50;
          displayValue = isExpanded(path) || !isLongText 
            ? `"${value.replace(/&quot;/g, '"')}"` 
            : `"${truncateString(value)}"`;
          valueClass = "text-primary-600";
        } else if (typeof value === 'number') {
          displayValue = value.toString();
          valueClass = "text-blue-600";
        } else if (typeof value === 'boolean') {
          displayValue = value.toString();
          valueClass = "text-purple-600";
        } else {
          displayValue = String(value);
          valueClass = "text-gray-700";
        }
        
        return (
          <div className="flex items-center py-0.5">
            <span 
              className={`font-mono text-xs ${valueClass} px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-100 hover:border-gray-200`}
              onClick={() => handleSelectField(path, value)}
              onMouseEnter={() => setHoveredPath(path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              {displayValue}
              {isLongText && (
                <button 
                  onClick={(e) => toggleExpand(e, path)} 
                  className="ml-1 text-gray-500 underline text-[10px]"
                >
                  {isExpanded(path) ? "show less" : "show more"}
                </button>
              )}
            </span>
          </div>
        );
      }
      
      // For arrays and objects
      const isArray = Array.isArray(value);
      const bracketColor = isArray ? "text-amber-500" : "text-indigo-500";
      const isEmpty = Object.keys(value).length === 0;
      const nodeCollapsed = isCollapsed(path);
      const isHovered = hoveredPath === path;
      const hasFindOpen = openFindDropdown === path;
      
      // Empty arrays/objects
      if (isEmpty) {
        return (
          <div className="flex items-center py-0.5">
            <span 
              className={`font-mono text-xs ${bracketColor} px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-100`}
              onClick={() => handleSelectField(path, value)}
              onMouseEnter={() => setHoveredPath(path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              {isArray ? '[]' : '{}'}
            </span>
          </div>
        );
      }
      
      // For non-empty objects/arrays
      return (
        <div className="my-0.5 relative">
          <div 
            className="flex items-center"
            onMouseEnter={() => setHoveredPath(path)}
            onMouseLeave={() => !hasFindOpen && setHoveredPath(null)}
          >
            <button 
              onClick={() => toggleCollapse(path)}
              className="mr-1 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-3 w-3 transition-transform duration-200 ${nodeCollapsed ? 'transform rotate-0' : 'transform rotate-90'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <span 
              className={`font-mono text-xs ${bracketColor} cursor-pointer px-1.5 py-0.5 hover:bg-gray-100 rounded`}
              onClick={() => handleSelectField(path, value)}
            >
              {isArray ? '[' : '{'}
              <span className="mx-1 text-xs text-gray-500">
                {isArray ? `Array(${value.length})` : `Object(${Object.keys(value).length})`}
              </span>
              {isArray && (isHovered || hasFindOpen) && (
                <span className="ml-1 inline-flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectField(`${path}.length()`, value.length);
                    }}
                    className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded hover:bg-amber-100"
                  >
                    length()
                  </button>
                  {value.length > 0 && typeof value[0] === 'object' && value[0] !== null && (
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); 
                          e.preventDefault();
                          toggleFindDropdown(e, path);
                        }}
                        className={`text-[10px] ${hasFindOpen ? 'bg-amber-200' : 'bg-amber-50'} text-amber-600 px-1.5 py-0.5 rounded hover:bg-amber-100 relative`}
                      >
                        find(...)
                      </button>
                      
                      {/* Always render the dropdown, but conditionally show it */}
                      <div 
                        className={`absolute left-0 top-6 bg-white shadow-md border border-gray-200 rounded-md p-2 z-20 min-w-[200px] ${hasFindOpen ? 'block' : 'hidden'}`}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] text-gray-500 mb-1 px-1">Find by property:</div>
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5 max-w-xs">
                          {Object.keys(value[0]).slice(0, 9).map(propKey => {
                            // Get the first non-null value of this property
                            const sampleValue = value.find(item => item[propKey] !== undefined && item[propKey] !== null)?.[propKey];
                            const valueType = typeof sampleValue;
                            const bgColor = valueType === 'string' 
                              ? 'bg-primary-50 hover:bg-primary-100' 
                              : valueType === 'number' 
                                ? 'bg-blue-50 hover:bg-blue-100' 
                                : valueType === 'boolean'
                                  ? 'bg-purple-50 hover:bg-purple-100'
                                  : 'bg-gray-50 hover:bg-gray-100';
                            
                            return (
                              <button
                                key={propKey}
                                className={`text-[10px] ${bgColor} px-2 py-1 rounded-md text-left truncate`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  
                                  const foundItem = value.find(item => item[propKey]);
                                  let foundValue = foundItem?.[propKey];
                                  
                                  // Just add the field, the condition editor will handle the rest
                                  const fieldPath = `${path}.find(${propKey})`;
                                  handleSelectField(fieldPath, foundValue);
                                  setOpenFindDropdown(null);
                                }}
                                title={`Find by ${propKey}`}
                              >
                                {propKey}
                                <span className="ml-1 opacity-50 text-[8px]">
                                  {valueType === 'string' ? 'abc' : 
                                   valueType === 'number' ? '123' :
                                   valueType === 'boolean' ? 'T/F' : '{}'}
                                </span>
                              </button>
                            );
                          })}
                          {Object.keys(value[0]).length > 9 && (
                            <span className="text-[10px] text-gray-400 col-span-2 text-center mt-1 italic">
                              + {Object.keys(value[0]).length - 9} more properties
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </span>
              )}
            </span>
          </div>
          
          {!nodeCollapsed && (
            <div className="ml-4 pl-2 border-l border-gray-200">
              {isArray ? (
                // Array items
                value.map((item, index) => (
                  <div key={index} className="py-0.5">
                    <div className="flex items-start">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 rounded px-1 mr-1 leading-loose">
                        [{index}]
                      </span>
                      {renderValue(item, `${path}[${index}]`, indent + 1)}
                    </div>
                  </div>
                ))
              ) : (
                // Object properties
                Object.entries(value).map(([key, propValue]) => {
                  const propPath = path ? `${path}.${key}` : key;
                  const isPropHovered = hoveredPath === propPath;
                  const isArrayValue = Array.isArray(propValue) && propValue.length > 0;
                  
                  return (
                    <div key={key} className="py-0.5">
                      <div 
                        className="flex items-start"
                        onMouseEnter={() => setHoveredPath(propPath)}
                        onMouseLeave={() => setHoveredPath(null)}
                      >
                        <span className="text-xs font-mono text-indigo-600 mr-1 leading-loose">
                          {key}:
                        </span>
                        {renderValue(propValue, propPath, indent + 1)}
                        
                        {/* Show array helpers inline when hovering over array properties */}
                        {isArrayValue && isPropHovered && (
                          <div className="ml-2 inline-flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectField(`${propPath}.length()`, propValue.length);
                              }}
                              className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded hover:bg-amber-100"
                            >
                              length()
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          
          <span className={`font-mono text-xs ${bracketColor}`}>
            {isArray ? ']' : '}'}
          </span>
        </div>
      );
    };

    return (
      <div className="bg-white rounded-xl p-4 overflow-auto">
        {renderValue(data, path)}
      </div>
    );
  };
  
  // Compact array helper for bottom display
  const CompactArrayHelperBar = ({ arrays }) => {
    if (!arrays || !arrays.length) return null;
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <span className="bg-amber-100 text-amber-600 p-1 rounded mr-2 text-xs">[]</span>
            Array Helpers
          </h3>
          <span className="text-xs text-gray-500">{arrays.length} arrays found</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          {arrays.map(({ path, data }) => (
            <div key={path} className="border border-gray-100 rounded-lg bg-gray-50 p-2">
              <div className="text-xs font-medium font-mono text-gray-700 mb-1 truncate" title={path}>
                {path} <span className="text-gray-500">({data.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full hover:bg-primary-100 transition-colors"
                  onClick={() => handleSelectField(`${path}.length()`, data.length)}
                >
                  length()
                </button>
                
                {data.length > 0 && typeof data[0] === 'object' && data[0] !== null &&
                  Object.keys(data[0]).slice(0, 3).map(propKey => {
                    // Get the first non-null value of this property
                    const sampleValue = data.find(item => item[propKey] !== undefined && item[propKey] !== null)?.[propKey];
                    const valueType = typeof sampleValue;
                    
                    return (
                      <button
                        key={propKey}
                        className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full hover:bg-primary-100 transition-colors"
                        onClick={() => {
                          const foundItem = data.find(item => item[propKey]);
                          let value = foundItem?.[propKey];
                          
                          // Just add the field, the condition editor will handle the rest
                          const fieldPath = `${path}.find(${propKey})`;
                          handleSelectField(fieldPath, value);
                        }}
                      >
                        find({propKey})
                      </button>
                    );
                  })
                }
                
                {data.length > 0 && typeof data[0] === 'object' && Object.keys(data[0]).length > 3 && (
                  <span className="text-[10px] text-gray-500">...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simplified version of the ConditionEditor component
  const ConditionEditor = ({ field, condition, onChange, onRemove }) => {
    // Determine value type from the condition and field path
    const fieldPath = field?.toLowerCase() || '';
    const isArray = fieldPath.includes('length()');
    const isFindOperation = fieldPath.includes('.find(');
    const isBoolean = condition?.includes('true') || condition?.includes('false');
    const isString = condition?.includes("'");
    const isNull = condition?.includes("null");
    
    // Parse the current condition to get the operator and value
    const { operator: initialOperator, value: initialValue } = parseCondition(condition || 'x === ');
    
    // Use local state to avoid re-renders during typing
    const [localValue, setLocalValue] = useState(initialValue);
    const [localOperator, setLocalOperator] = useState(initialOperator);
    
    // Keep local state in sync with props when condition changes externally
    useEffect(() => {
      const { operator, value } = parseCondition(condition || 'x === ');
      setLocalOperator(operator);
      setLocalValue(value);
    }, [condition]);
    
    // Determine value type - prioritize detecting the actual type of the value
    let valueType = 'string';
    
    // Try to infer type based on the value
    if (!isString && !isNaN(initialValue)) {
      valueType = 'number';
    } else if (isArray) {
      valueType = 'array';
    } else if (isBoolean) {
      valueType = 'boolean';
    } else if (isNull) {
      valueType = 'null';
    } else if (isString) {
      valueType = 'string';
    }
    
    // For find operations, we need to check if it's a find by number or by string
    // and ensure appropriate operators are available
    if (isFindOperation) {
      // For find operations, if value is numeric, make sure it's treated as number
      if (!isNaN(initialValue) && !isString) {
        valueType = 'number';
      }
    }
    
    // Get appropriate operators for this value type
    const operators = getOperatorsForType(valueType);
    
    // Create the human-readable explanation
    const explanation = getConditionExplanation(field, localOperator, localValue, valueType);
    
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
    
    // Update the parent only when focus is lost or operator changes
    const handleValueBlur = () => {
      const newCondition = buildConditionString(localOperator, localValue);
      onChange(newCondition);
    };
    
    // Change operator and immediately update parent
    const handleOperatorChange = (op) => {
      setLocalOperator(op);
      const newCondition = buildConditionString(op, localValue);
      onChange(newCondition);
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
            <div className="w-10">
              <Input
                value="x"
                disabled
                className="w-full text-sm rounded-lg bg-gray-100 text-gray-500 text-center"
              />
            </div>
            
            {/* Replace Select with simple button group */}
            <div className="w-[40%]">
              <div className="flex flex-wrap gap-1 h-full items-center">
                {operators && operators.length > 0 ? operators.map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => handleOperatorChange(op.value)}
                    className={`px-2 py-1 text-xs rounded-md ${
                      localOperator === op.value 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {op.label}
                  </button>
                )) : (
                  <button
                    type="button"
                    className="px-2 py-1 text-xs rounded-md bg-blue-500 text-white"
                  >
                    ==
                  </button>
                )}
              </div>
            </div>
            
            {/* Value input */}
            <div className="flex-1">
              <Input
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleValueBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur();
                  }
                }}
                placeholder={valueType === 'string' ? 'Text value' : valueType === 'number' || valueType === 'array' ? '123' : 'Value'}
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
                        <div className="flex gap-2 flex-wrap">
                          {['GET', 'POST', 'PUT', 'DELETE'].map(method => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => {
                                handleChange({
                                  target: { name: 'request.method', value: method }
                                });
                              }}
                              className={`px-3 py-1.5 text-sm rounded-md ${
                                formData.request.method === method
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Response Method</label>
                        <div className="flex gap-2 flex-wrap">
                          {['GET', 'POST', 'PUT', 'DELETE'].map(method => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => {
                                handleChange({
                                  target: { name: 'response.request.method', value: method }
                                });
                              }}
                              className={`px-3 py-1.5 text-sm rounded-md ${
                                formData.response.request.method === method
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
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
        
        {/* Step 2: Response Matching - With fullscreen functionality */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className={`${fullscreenExplorer ? 'fixed inset-0 z-50 bg-white p-4' : 'bg-gray-50 p-6 rounded-lg border border-gray-200'}`} ref={fullscreenRef}>
              <div className="flex justify-between items-center mb-4">
                {!fullscreenExplorer ? (
                  <>
                    <h2 className="text-xl font-semibold">Select fields to match</h2>
                    <button 
                      onClick={toggleFullscreen}
                      className="bg-gray-500 text-white text-sm px-3 py-1 rounded hover:bg-gray-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      View Fullscreen
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <h2 className="text-xl font-semibold">Response Explorer</h2>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded ml-3">
                        {selectedFields.length} fields selected
                      </span>
                    </div>
                    <button 
                      onClick={toggleFullscreen}
                      className="bg-gray-500 text-white text-sm px-3 py-1 rounded hover:bg-gray-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Exit Fullscreen
                    </button>
                  </>
                )}
              </div>
              
              {!fullscreenExplorer && (
                <p className="text-gray-600 mb-4">
                  Click on fields in the response that you want to validate. You can then set conditions for each field.
                </p>
              )}
              
              {/* Fullscreen Layout - Split into main area (JSON) and sidebar (selected fields) */}
              <div className="flex flex-col h-[calc(100vh-80px)]">
                {/* Main content area with JSON explorer */}
                <div className="flex flex-grow gap-4 overflow-hidden">
                  {/* JSON Explorer Area */}
                  <div className="flex-grow overflow-auto pr-4">
                    {testResponse ? (
                      <div className="space-y-3">
                        <h3 className="text-lg font-medium text-gray-800">Response Data</h3>
                        
                        {/* JSON tree explorer */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 overflow-auto h-[calc(100%-50px)]">
                          <JsonTreeExplorer data={testResponse} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center p-8 max-w-md">
                          <div className="text-6xl mb-4">🔍</div>
                          <h3 className="text-2xl font-medium text-gray-700 mb-2">No Response Data</h3>
                          <p className="text-gray-500">
                            Execute the API call in the first step to see and select response data for your schema.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Fields Panel */}
                  <div className="w-[320px] flex-shrink-0 overflow-auto">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h4 className="font-medium text-gray-700 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
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
                            <p className="text-xs">Click on any value in the response to add it as a condition field</p>
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
                
                {/* Array helpers - fixed at bottom */}
                {testResponse && (
                  <div className="mt-3 flex-shrink-0">
                    <CompactArrayHelperBar arrays={findArrays(testResponse)} />
                  </div>
                )}
              </div>
            </div>
            
            {!fullscreenExplorer && (
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
            )}
          </div>
        )}
        
        {/* Step 3: Recipe Details */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Recipe Details</h2>
              
              <div className="space-y-4">
                <div>
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
                
                <div>
                  <label className="block text-sm font-medium mb-2">Prepare URL</label>
                  <Input 
                    name="prepareUrl"
                    value={formData.prepareUrl}
                    onChange={handleChange}
                    placeholder="https://ethglobal.com/home"
                    className="w-full"
                  />
                  <p className="text-gray-500 mt-1 text-xs">URL the user must visit to log in before the API call</p>
                </div>
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