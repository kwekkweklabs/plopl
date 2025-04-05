// PLOPL Background Service Worker

// Define the schema structure we need to work with
interface SchemaData {
  id: string;
  name: string;
  schema: {
    request: {
      url: string;
      args?: {
        json?: {
          query?: string;
          variables?: Record<string, unknown>;
        };
      };
      method: string;
    };
    response?: {
      match?: {
        fields?: string[][];
        expected?: string[];
      };
    };
    prepareUrl?: string;
  };
}

// Define types for API data
interface RequestData {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: string;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: string;
}

// Interface for captured API data
interface CapturedData {
  timestamp: string;
  url: string;
  method: string;
  requestData: RequestData;
  responseData: ResponseData | null;
  schemaId: string;
  requestId: string;
}

// Global variables to track monitoring state and captured data
let activeSchema: SchemaData | null = null;
const capturedRequests: Record<string, CapturedData> = {};

// Storage key for captured API data to persist across restarts
const STORAGE_KEY = 'ploplCapturedApiData';

// Initialize by checking storage for any previously captured data
chrome.storage.local.get([STORAGE_KEY], result => {
  if (result[STORAGE_KEY]) {
    Object.assign(capturedRequests, result[STORAGE_KEY]);
    console.log('Loaded previously captured API data:', Object.keys(capturedRequests).length, 'entries');
  }
});

// Helper function to check if data matches our schema
function matchesSchema(url: string, method: string, requestBody: unknown, schema: SchemaData): boolean {
  if (!schema?.schema?.request) return false;

  // Check URL match
  if (!url.includes(schema.schema.request.url)) {
    return false;
  }

  // Check method match
  if (method !== schema.schema.request.method) {
    return false;
  }

  // If there's a specific GraphQL query to match and we have requestBody
  if (
    schema.schema.request.args?.json?.query &&
    typeof requestBody === 'object' &&
    requestBody !== null &&
    'query' in requestBody &&
    typeof requestBody.query === 'string'
  ) {
    try {
      // Check if the GraphQL query matches (we don't need exact matching, just inclusion)
      // This handles minified queries or queries with different formatting
      const normalizeQuery = (q: string) => q.replace(/\s+/g, ' ').trim();
      const targetQuery = normalizeQuery(schema.schema.request.args.json.query);
      const actualQuery = normalizeQuery(requestBody.query);

      // If the target query is a substring of the actual query, it's likely a match
      // Or vice versa (handles cases where the schema has a simplified version)
      const isQueryMatch =
        actualQuery.includes(targetQuery) ||
        targetQuery.includes(actualQuery) ||
        // Partial matching for identifying query patterns
        (targetQuery.length > 30 &&
          actualQuery.length > 30 &&
          actualQuery.substring(0, 30) === targetQuery.substring(0, 30));

      if (isQueryMatch) {
        console.log('=== GRAPHQL QUERY MATCHED ===');
        console.log('- Schema ID:', schema.id);
        console.log('- URL:', url);
        console.log('- Method:', method);
        console.log('- GraphQL Query Match:', true);
      }
      return isQueryMatch;
    } catch (e) {
      console.error('Failed to match request body against schema:', e);
    }
  }

  // If we don't need to check the query or couldn't parse it, just match on URL and method
  console.log('=== SCHEMA MATCHED ===');
  console.log('- Schema ID:', schema.id);
  console.log('- URL:', url);
  console.log('- Method:', method);
  return true;
}

// Notify the side panel about captured API data
function notifySidePanel(capturedData: CapturedData): void {
  console.log('Notifying side panel with complete API data:', capturedData.url);

  // Construct data in the exact format the side panel expects
  const dataForSidePanel = {
    timestamp: capturedData.timestamp,
    url: capturedData.url,
    method: capturedData.method,
    request: {
      url: capturedData.requestData.url,
      method: capturedData.requestData.method,
      headers: capturedData.requestData.headers,
      body: capturedData.requestData.body,
      timestamp: capturedData.requestData.timestamp,
    },
    response: capturedData.responseData,
  };

  // Log the body being sent to help with debugging
  console.log(
    'Request body being sent to side panel:',
    typeof capturedData.requestData.body === 'object'
      ? 'Object with keys: ' + Object.keys(capturedData.requestData.body || {}).join(', ')
      : typeof capturedData.requestData.body,
  );

  console.log('Sending data to side panel:', dataForSidePanel);

  // Send a message to any open side panels
  chrome.runtime
    .sendMessage({
      action: 'apiDataCaptured',
      data: dataForSidePanel,
    })
    .then(() => {
      console.log('Successfully sent data to side panel');
    })
    .catch(err => {
      console.error('Side panel not ready to receive messages:', err);

      // Try again after a short delay
      setTimeout(() => {
        console.log('Retrying side panel notification...');
        chrome.runtime
          .sendMessage({
            action: 'apiDataCaptured',
            data: dataForSidePanel,
          })
          .catch(retryErr => {
            console.error('Retry failed:', retryErr);
          });
      }, 500);
    });
}

// Extract request body from details if possible
function extractRequestBody(details: chrome.webRequest.WebRequestBodyDetails): unknown {
  let requestBody: unknown = null;

  try {
    // Log details to help debug
    console.log('Extracting request body from:', details.url);
    console.log('Request body details available:', !!details.requestBody);

    if (details.requestBody) {
      // If form data
      if (details.requestBody.formData) {
        console.log('Form data found in request body');
        requestBody = details.requestBody.formData;
      }
      // If raw data
      else if (details.requestBody.raw && details.requestBody.raw.length > 0) {
        console.log('Raw data found in request body, length:', details.requestBody.raw.length);

        try {
          const decoder = new TextDecoder();
          const rawBody = details.requestBody.raw[0].bytes;
          const bodyText = decoder.decode(rawBody);

          console.log('Decoded body text (first 100 chars):', bodyText.substring(0, 100));

          try {
            // Try to parse as JSON
            requestBody = JSON.parse(bodyText);
            console.log('Successfully parsed as JSON with keys:', Object.keys(requestBody as object).join(', '));
          } catch (jsonError) {
            // If not JSON, use as text
            console.log('Not valid JSON, using as text:', jsonError.message);
            requestBody = { text: bodyText };
          }
        } catch (decodeError) {
          console.error('Failed to decode request body:', decodeError);
          requestBody = { error: 'Failed to decode binary data' };
        }
      } else {
        console.log('No form data or raw data found in request body');
      }
    } else {
      console.log('No request body details available');
    }
  } catch (e) {
    console.error('Error in extractRequestBody:', e);
    requestBody = { error: 'Exception occurred during extraction' };
  }

  return requestBody;
}

// Listen for API requests with headers
chrome.webRequest.onSendHeaders.addListener(
  details => {
    // Skip if we have no active schema to monitor
    if (!activeSchema) return;

    const url = details.url;
    const method = details.method;

    // Extract headers into a more manageable format
    const headers: Record<string, string> = {};
    if (details.requestHeaders) {
      for (const header of details.requestHeaders) {
        if (header.name && header.value !== undefined) {
          headers[header.name] = header.value;
        }
      }
    }

    // Log important headers to help debug
    const contentType = headers['Content-Type'] || headers['content-type'];
    if (contentType) {
      console.log('Content-Type header:', contentType);
    }

    // Count how many headers we got
    const headerCount = Object.keys(headers).length;

    // Check if this matches our schema before proceeding
    if (matchesSchema(url, method, {}, activeSchema)) {
      console.log('=== DETECTED SCHEMA MATCH ===');
      console.log('Schema ID:', activeSchema.id);
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Headers count:', Object.keys(headers).length);

      // Capture this request to match with the body later
      const timestamp = new Date().toISOString();
      const requestId = details.requestId;

      // Store initial request data with ALL headers
      capturedRequests[requestId] = {
        timestamp,
        url,
        method,
        requestData: {
          url,
          method,
          headers, // Complete headers dictionary
          body: null, // Will be filled by onBeforeRequest
          timestamp,
        },
        responseData: null, // Will be filled by content script
        schemaId: activeSchema.id,
        requestId,
      };

      // Save to storage
      chrome.storage.local.set({ [STORAGE_KEY]: capturedRequests });

      console.log('Captured request headers for:', url);

      // Critical fix: After a short delay, check if we need to create a temporary response
      // This ensures we don't get stuck on step 2 if the content script doesn't capture the response
      setTimeout(() => {
        // Only proceed if we still don't have response data
        if (capturedRequests[requestId] && !capturedRequests[requestId].responseData) {
          console.log('No response data received yet, creating temporary response');

          // Create a temporary response to advance the UI
          const tempResponse: ResponseData = {
            status: 200,
            statusText: 'Processing',
            headers: {},
            body: { message: 'Request captured, waiting for response' },
            timestamp: new Date().toISOString(),
          };

          // Store the temp response
          capturedRequests[requestId].responseData = tempResponse;

          // Notify the side panel to advance to step 3
          notifySidePanel(capturedRequests[requestId]);

          // We'll update this with real data when the actual response comes in
        }
      }, 2000); // Wait 2 seconds to see if the real response arrives
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders'], // 'extraHeaders' option to get all headers including cookies
);

// Listen for request bodies
chrome.webRequest.onBeforeRequest.addListener(
  details => {
    // Skip if we have no active schema or haven't captured this request yet
    if (!activeSchema || !capturedRequests[details.requestId]) return;

    // Extract request body
    const requestBody = extractRequestBody(details);

    // Log the extracted body for debugging
    console.log('Extracted request body for URL:', details.url);
    console.log('Request body type:', typeof requestBody);
    console.log('Request body is null?', requestBody === null);
    if (requestBody && typeof requestBody === 'object') {
      console.log('Request body keys:', Object.keys(requestBody));
    }

    // Update our stored request with the body
    if (capturedRequests[details.requestId]) {
      capturedRequests[details.requestId].requestData.body = requestBody;

      // Save to storage
      chrome.storage.local.set({ [STORAGE_KEY]: capturedRequests });

      console.log('Updated request with body for:', details.url);

      // Check if it fully matches our schema now that we have the body
      if (matchesSchema(details.url, details.method, requestBody, activeSchema)) {
        console.log('=== CONFIRMED SCHEMA MATCH WITH BODY ===');
        console.log('URL:', details.url);
        console.log('Method:', details.method);
        console.log('Schema ID:', activeSchema.id);
        console.log('Request Body:', requestBody ? 'Present' : 'None');

        // If we already have a response for this request, notify the side panel immediately
        if (capturedRequests[details.requestId].responseData) {
          console.log('Request already has response data, notifying side panel immediately');
          notifySidePanel(capturedRequests[details.requestId]);
        }
      } else {
        delete capturedRequests[details.requestId];
        chrome.storage.local.set({ [STORAGE_KEY]: capturedRequests });
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody'],
);

// Listen for messages from content scripts for response bodies
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);

  if (message.action === 'ping') {
    // Simple response to indicate background is active
    sendResponse({ success: true, status: 'background_active' });
    return true;
  }

  // Handle response data from content script
  if (message.action === 'responseBodyCaptured' && message.data) {
    const { url, method, requestData, responseData, timestamp } = message.data;

    console.log('Received response data from content script:');
    console.log('- URL:', url);
    console.log('- Method:', method);
    console.log('- Response Status:', responseData.status, responseData.statusText);
    console.log('- Response Headers:', Object.keys(responseData.headers || {}).length, 'headers');

    // Skip if we have no active schema
    if (!activeSchema) {
      console.log('No active schema, ignoring response');
      sendResponse({ success: true, status: 'ignored_no_schema' });
      return true;
    }

    // First check if this is a GraphQL API we're monitoring
    const isGraphQLMatch =
      url.includes(activeSchema.schema.request.url) && method === activeSchema.schema.request.method;

    if (isGraphQLMatch) {
      console.log('GraphQL API match detected:', url);

      // For GraphQL, create a synthetic request directly
      const syntheticId = `synthetic_${Date.now()}`;

      // Prepare the data in the format expected by the side panel
      const capturedData: CapturedData = {
        timestamp: timestamp || new Date().toISOString(),
        url,
        method,
        requestData: {
          url,
          method,
          headers: requestData.headers || {},
          body: requestData.body,
          timestamp: timestamp || new Date().toISOString(),
        },
        responseData: {
          status: responseData.status,
          statusText: responseData.statusText,
          headers: responseData.headers || {},
          body: responseData.body,
          timestamp: timestamp || new Date().toISOString(),
        },
        schemaId: activeSchema.id,
        requestId: syntheticId,
      };

      // Store for future reference
      capturedRequests[syntheticId] = capturedData;

      // Save to storage
      chrome.storage.local.set({ [STORAGE_KEY]: capturedRequests });

      // Send directly to side panel
      console.log('SENDING GRAPHQL DATA TO SIDE PANEL');
      notifySidePanel(capturedData);

      // Also try pinging the side panel directly
      chrome.runtime
        .sendMessage({
          action: 'ping',
        })
        .then(() => {
          console.log('Side panel ping successful');
        })
        .catch(err => {
          console.error('Side panel ping failed:', err);
        });

      sendResponse({ success: true });
      return true;
    }

    // Try to find the matching request ID (regular API flow)
    const matchingRequestIds = Object.keys(capturedRequests).filter(id => {
      const req = capturedRequests[id];
      return req.url === url && req.method === method && !req.responseData;
    });

    console.log('Found matching request IDs:', matchingRequestIds.length);

    if (matchingRequestIds.length > 0) {
      // Update the most recent matching request with response data
      const requestId = matchingRequestIds[matchingRequestIds.length - 1];
      console.log('Using request ID:', requestId);

      const matchedRequest = capturedRequests[requestId];

      // Update with complete response data
      capturedRequests[requestId].responseData = {
        status: responseData.status,
        statusText: responseData.statusText,
        headers: responseData.headers || {},
        body: responseData.body,
        timestamp: timestamp || new Date().toISOString(),
      };

      console.log('Matched response to request:', requestId);

      // Save to storage
      chrome.storage.local.set({ [STORAGE_KEY]: capturedRequests });

      // Notify the side panel about the complete request
      console.log('Calling notifySidePanel with matched request data');
      notifySidePanel(capturedRequests[requestId]);
    } else {
      console.log('No matching request found, creating synthetic request');

      // Create a synthetic request entry with complete information
      const syntheticId = `synthetic_${Date.now()}`;
      capturedRequests[syntheticId] = {
        timestamp: timestamp || new Date().toISOString(),
        url,
        method,
        requestData: {
          url,
          method,
          // Ensure all headers are included, even if empty
          headers: requestData.headers || {},
          body: requestData.body,
          timestamp: timestamp || new Date().toISOString(),
        },
        responseData: {
          status: responseData.status,
          statusText: responseData.statusText,
          // Ensure all headers are included, even if empty
          headers: responseData.headers || {},
          body: responseData.body,
          timestamp: timestamp || new Date().toISOString(),
        },
        schemaId: activeSchema.id,
        requestId: syntheticId,
      };

      // Save to storage
      chrome.storage.local.set({ [STORAGE_KEY]: capturedRequests });

      // Notify the side panel with complete data
      console.log('Calling notifySidePanel with synthetic request data');
      notifySidePanel(capturedRequests[syntheticId]);
    }

    sendResponse({ success: true });
    return true;
  }

  // Handle setting schema data from side panel
  if (message.action === 'setSchemaData' && message.data) {
    // Adapt the schema to our expected format
    activeSchema = adaptSchemaFormat(message.data);

    if (activeSchema && activeSchema.schema?.request) {
      // Log schema information
      console.log('=== RECEIVED SCHEMA DATA ===');
      console.log('Schema ID:', activeSchema.id);
      console.log('Schema Name:', activeSchema.name);
      console.log('Target API URL:', activeSchema.schema.request.url);
      console.log('Target Method:', activeSchema.schema.request.method);

      if (activeSchema.schema.request.args?.json?.query) {
        console.log('Target GraphQL Query:', activeSchema.schema.request.args.json.query);
      }

      console.log('=== END SCHEMA DATA ===');

      console.log(`Now monitoring for API calls to ${activeSchema.schema.request.url}`);

      // Check if we've already captured data for this API
      const matches = Object.values(capturedRequests).filter(
        data => data.schemaId === activeSchema?.id && data.responseData !== null,
      );

      if (matches.length > 0) {
        console.log('Found previously captured data for this schema:', matches.length);

        // Use the most recent complete match
        const latestMatch = matches[matches.length - 1];

        // Notify the side panel
        notifySidePanel(latestMatch);
      }
    }

    // Signal that we're ready
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'clearApiData') {
    // Clear captured requests
    Object.keys(capturedRequests).forEach(key => {
      delete capturedRequests[key];
    });

    // Remove from storage
    chrome.storage.local.remove(STORAGE_KEY);
    console.log('Cleared all captured API data');

    sendResponse({ success: true });
    return true;
  }

  // Allow async response
  return true;
});

// Log when the background script is loaded
console.log('PLOPL background script loaded and ready!');

// Helper function to adapt the schema from the API format to our internal format
function adaptSchemaFormat(apiSchema: any): SchemaData {
  console.log('Adapting schema format:', JSON.stringify(apiSchema).substring(0, 150) + '...');

  // If it's already in our format, just return it
  if (apiSchema?.schema?.request) {
    console.log('Schema already in expected format');
    return apiSchema as SchemaData;
  }

  // Otherwise convert it to the expected format
  console.log('Converting schema to expected format');

  // Handle the case where the schema is already nested in a "schema" property
  const requestData = apiSchema.request || (apiSchema.schema && apiSchema.schema.request);

  const adapted = {
    id: apiSchema.id?.toString() || '',
    name: apiSchema.slug || apiSchema.name || 'Unknown Schema',
    schema: {
      request: {
        url: requestData?.url || '',
        method: requestData?.method || 'GET',
        args: requestData?.args || {},
      },
      response: apiSchema.response || {},
      prepareUrl: apiSchema.prepareUrl || '',
    },
  };

  console.log('Adapted schema:', JSON.stringify(adapted).substring(0, 150) + '...');
  return adapted;
}
