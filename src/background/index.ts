import 'webextension-polyfill';

// Define types for request details
interface RequestDetails {
  url: string;
  method: string;
  requestBody?: {
    raw?: {
      bytes: ArrayBuffer;
    }[];
  };
  tabId: number;
  requestId: string;
  type: string;
}

interface CompletedDetails {
  url: string;
  statusCode: number;
  statusLine: string;
}

interface ApiDataEntry {
  timestamp: string;
  url: string;
  method: string;
  requestBody: unknown;
  responseBody: unknown | null;
  tabId: number;
  requestId: string;
  type: string;
  status?: number;
  statusText?: string;
}

interface SchemaData {
  id: string;
  schema: {
    request: {
      url: string;
      method: string;
    };
  };
}

// Global variables to track monitoring state and captured data
let activeSchemaId: string | null = null;
let targetApiUrl: string | null = null;
let targetApiMethod: string | null = null;
let capturedApiData: Record<string, ApiDataEntry> = {};

// Storage key for captured API data to persist across restarts
const STORAGE_KEY = 'ploplCapturedApiData';

// Initialize by checking storage for any previously captured data
chrome.storage.local.get([STORAGE_KEY], result => {
  if (result[STORAGE_KEY]) {
    capturedApiData = result[STORAGE_KEY];
    console.log('Loaded previously captured API data:', capturedApiData);
  }
});

console.log('background script loaded');

// Listen for all web requests before they're sent
chrome.webRequest.onBeforeRequest.addListener(
  (details: RequestDetails) => {
    // We need both the request URL and the request body for complete monitoring
    if (details.url.includes('api2.ethglobal.com/graphql')) {
      console.log('Detected ethglobal API request:', details.url);

      // Attempt to parse the request body if it exists
      let requestBody = null;
      if (details.requestBody && details.requestBody.raw && details.requestBody.raw.length > 0) {
        try {
          const decoder = new TextDecoder();
          const rawBody = details.requestBody.raw[0].bytes;
          const bodyText = decoder.decode(rawBody);
          requestBody = JSON.parse(bodyText);
        } catch (e) {
          console.error('Failed to parse request body:', e);
          requestBody = details.requestBody;
        }
      }

      // Store in our capturedApiData object
      capturedApiData[details.url] = {
        timestamp: new Date().toISOString(),
        url: details.url,
        method: details.method,
        requestBody: requestBody,
        responseBody: null, // Will be filled by onCompleted listener
        tabId: details.tabId,
        requestId: details.requestId,
        type: details.type,
      };

      // Save to storage for persistence
      chrome.storage.local.set({ [STORAGE_KEY]: capturedApiData });

      // Check if this matches our target API
      if (targetApiUrl && (details.url.includes(targetApiUrl) || targetApiUrl.includes(details.url))) {
        console.log('Found matching target API call:', details.url);

        // Notify the side panel about this API data
        notifySidePanel(details.url, capturedApiData[details.url]);
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody'],
);

// Listen for responses to capture response data
chrome.webRequest.onCompleted.addListener(
  (details: CompletedDetails) => {
    if (details.url.includes('api2.ethglobal.com/graphql') && capturedApiData[details.url]) {
      console.log('Completed ethglobal API request:', details.url);

      // Update the stored data with response info
      capturedApiData[details.url].status = details.statusCode;
      capturedApiData[details.url].statusText = details.statusLine;

      // Save to storage for persistence
      chrome.storage.local.set({ [STORAGE_KEY]: capturedApiData });

      // Check if this matches our target API
      if (targetApiUrl && (details.url.includes(targetApiUrl) || targetApiUrl.includes(details.url))) {
        console.log('Completed matching target API call:', details.url);

        // Notify the side panel about the updated API data
        notifySidePanel(details.url, capturedApiData[details.url]);
      }
    }
  },
  { urls: ['<all_urls>'] },
);

// Notify the side panel about captured API data
function notifySidePanel(url: string, data: ApiDataEntry) {
  // Send a message to any open side panels
  chrome.runtime
    .sendMessage({
      action: 'apiDataCaptured',
      data: {
        timestamp: data.timestamp,
        url: data.url,
        method: data.method,
        request: data.requestBody,
        response: data.responseBody || { note: 'Response body not available' },
      },
    })
    .catch(err => {
      console.log('Side panel not ready to receive messages:', err);
    });
}

// Listen for messages from the side panel or content scripts
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log('Background received message:', message.action);

  if (message.action === 'ping') {
    // Simple response to indicate background is active
    sendResponse({ success: true, status: 'background_active' });
    return true;
  }

  if (message.action === 'setSchemaData' && message.data?.schema?.request) {
    // Store the target API details
    const schemaData = message.data as SchemaData;
    targetApiUrl = schemaData.schema.request.url;
    targetApiMethod = schemaData.schema.request.method;
    activeSchemaId = schemaData.id;

    console.log(`Now monitoring for ${targetApiMethod} requests to ${targetApiUrl}`);

    // Check if we've already captured data for this API
    const matches = Object.entries(capturedApiData).filter(
      ([url]) => targetApiUrl && (url.includes(targetApiUrl) || targetApiUrl.includes(url)),
    );

    if (matches.length > 0) {
      console.log('Found previously captured data for this API:', matches.length);

      // Use the most recent match
      const [url, data] = matches[matches.length - 1];

      // Notify the side panel
      notifySidePanel(url, data);
    }

    // Signal that we're ready
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'clearApiData') {
    capturedApiData = {};
    chrome.storage.local.remove(STORAGE_KEY);
    console.log('Cleared all captured API data');
    sendResponse({ success: true });
    return true;
  }

  // Allow async response
  return true;
});

// Log when the background script is loaded
console.log('PLOPL background script loaded and ready');
