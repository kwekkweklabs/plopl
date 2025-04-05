/**
 * Extract and parse values from data using JSON path
 * @param {Object} data - Response data 
 * @param {String} path - JSON path with dot notation, supports array selectors
 * @param {String} expectedValue - Expected value for .find() operation (optional)
 * @returns {any} - Extracted value
 */
const extractValue = (data, path) => {
  // Check if we need to apply special array functions
  if (path.includes('.length()')) {
    const arrayPath = path.replace('.length()', '');
    const array = extractValue(data, arrayPath);
    return Array.isArray(array) ? array.length : 0;
  }
  
  // Handle array.find(fieldName) function
  if (path.includes('.find(')) {
    const matches = path.match(/(.+)\[\]\.find\(([^)]+)\)$/);
    if (matches && matches.length === 3) {
      const [_, arrayPath, fieldName] = matches;
      const array = extractValue(data, arrayPath);
      
      if (Array.isArray(array)) {
        // For .find(), return the value of the specified field from the first item where it exists
        // The actual matching happens later in evaluateCondition
        const item = array.find(item => item && typeof item === 'object' && fieldName in item);
        return item ? item[fieldName] : null;
      }
      return null;
    }
  }
  
  // Regular path navigation
  return path.split('.').reduce((obj, key) => {
    // Handle array selector with [] notation
    if (key.includes('[]')) {
      const plainKey = key.replace('[]', '');
      return obj && obj[plainKey] ? obj[plainKey] : [];
    }
    
    return obj && obj[key] !== undefined ? obj[key] : null;
  }, data);
};

/**
 * Create a specialized function implementation for array.find to check if a specific value exists
 * @param {String} fieldPath - Path to extract from
 * @param {String} expectedValue - Value to look for
 * @param {Object} data - Response data
 * @returns {Boolean} - Whether the value exists in the array
 */
const checkArrayFindValue = (fieldPath, expectedValue, data) => {
  if (!fieldPath.includes('.find(')) {
    return false;
  }
  
  const matches = fieldPath.match(/(.+)\[\]\.find\(([^)]+)\)$/);
  if (matches && matches.length === 3) {
    const [_, arrayPath, fieldName] = matches;
    const array = extractValue(data, arrayPath);
    
    if (Array.isArray(array)) {
      // For validation, check if ANY item in the array has the matching field value
      return array.some(item => 
        item && 
        typeof item === 'object' && 
        fieldName in item && 
        String(item[fieldName]) === String(expectedValue.replace(/['"]/g, ''))
      );
    }
  }
  return false;
};

/**
 * Evaluate condition expressions like "x >= 5" or "x == 'value'"
 * @param {any} value - Value to evaluate in condition
 * @param {String} condition - Condition expression
 * @param {String} fieldPath - Original field path (needed for special handling)
 * @param {Object} data - Full response data
 * @returns {Boolean} - Whether the condition is satisfied
 */
const evaluateCondition = (value, condition, fieldPath, data) => {
  if (!condition || condition === "") {
    // Empty condition means no validation required
    return true;
  }
  
  // Special handling for .find() with equality check
  if (fieldPath.includes('.find(') && 
      (condition.includes('x ==') || condition.includes('x ===')) &&
      (condition.includes("'") || condition.includes('"'))) {
    
    // Extract expected value from condition (e.g., "x == 'ETHGlobal Singapore'" -> "ETHGlobal Singapore")
    const expectedValueMatch = condition.match(/x\s*={2,3}\s*['"](.+)['"]/);
    if (expectedValueMatch && expectedValueMatch.length > 1) {
      const expectedValue = expectedValueMatch[1];
      return checkArrayFindValue(fieldPath, expectedValue, data);
    }
  }
  
  // Regular condition evaluation
  let evalString = condition.replace(/x/g, JSON.stringify(value));
  
  try {
    // Use Function constructor instead of eval for safer evaluation
    return new Function(`return ${evalString}`)();
  } catch (error) {
    console.error(`Error evaluating condition "${condition}"`, error);
    return false;
  }
};

/**
 * Creates a field name from a path for the result object
 * @param {String} fieldPath - Path to extract field name from
 * @returns {String} - Formatted field name
 */
const getFieldName = (fieldPath) => {
  // Extract the last part of the path for naming
  let baseName = fieldPath.split('.').pop().replace('[]', '');
    
  // Format for special functions
  if (fieldPath.includes('.length()')) {
    if (baseName === 'length()') {
      // If the last part is just the length function, use the parent path part
      const parts = fieldPath.split('.');
      const parentPart = parts[parts.length - 2].replace('[]', '');
      return `${parentPart}Length`;
    }
    return baseName.replace('.length()', '') + 'Length';
  }
  
  if (fieldPath.includes('.find(')) {
    const matches = fieldPath.match(/\.find\(([^)]+)\)$/);
    if (matches && matches.length === 2) {
      const fieldName = matches[1];
      return fieldName;
    }
    return baseName.replace(/\.find\(.+\)/, '') + 'Found';
  }
  
  return baseName;
};

/**
 * Validate response data against schema match rules
 * @param {Object} schema - Schema with match rules
 * @param {Object} data - Response data to validate
 * @returns {Object} - { isValid, data } where data contains extracted values
 */
export const handleSchemaValidation = (schema, responseData) => {
  if (!schema || !schema.response || !schema.response.match) {
    return { isValid: false, data: {} };
  }
  
  const { fields, expected } = schema.response.match;
  const result = { isValid: true, data: {} };
  
  // Handle simple array format for fields
  if (Array.isArray(fields) && !Array.isArray(fields[0])) {
    for (let i = 0; i < fields.length; i++) {
      const fieldPath = fields[i];
      const condition = expected && expected[i] ? expected[i] : "";
      
      const fieldName = getFieldName(fieldPath);
      const value = extractValue(responseData, fieldPath);
      result.data[fieldName] = value;
      
      // Validate against condition if provided
      if (condition && !evaluateCondition(value, condition, fieldPath, responseData)) {
        result.isValid = false;
      }
    }
  } 
  // Handle nested arrays format for fields
  else if (Array.isArray(fields)) {
    for (let i = 0; i < fields.length; i++) {
      const fieldPath = fields[i];
      // Handle expected array format, which might be flat
      const condition = Array.isArray(expected) ? 
                         (Array.isArray(expected[i]) ? expected[i] : expected[i] || "") : 
                         "";
      
      if (Array.isArray(fieldPath)) {
        // Handle nested array of field paths
        for (let j = 0; j < fieldPath.length; j++) {
          const path = fieldPath[j];
          // Get condition based on format (array of arrays or array of strings)
          const pathCondition = Array.isArray(condition) ? (condition[j] || "") : condition;
          
          const fieldName = getFieldName(path);
          const value = extractValue(responseData, path);
          result.data[fieldName] = value;
          
          if (pathCondition && !evaluateCondition(value, pathCondition, path, responseData)) {
            result.isValid = false;
          }
        }
      } else {
        // Handle cases where fields is an array of strings mixed with arrays
        const fieldName = getFieldName(fieldPath);
        const value = extractValue(responseData, fieldPath);
        result.data[fieldName] = value;
        
        if (condition && !evaluateCondition(value, condition, fieldPath, responseData)) {
          result.isValid = false;
        }
      }
    }
  }
  
  return result;
};