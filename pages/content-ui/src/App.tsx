import { useEffect, useState } from 'react';
import { ToggleButton } from '@extension/ui';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';

// Global variables to track network monitoring state
let isMonitoringEnabled = false;
let targetApiUrl = '';
let targetApiMethod = '';
let capturedApiData = null;
let earlyCallsLog = [];

// Store original methods so we can restore them later
const originalFetch = window.fetch;
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

// Setup network request monitoring
// This function runs as soon as the script is loaded
function setupNetworkMonitoring() {
  console.log('PLOPL: Network monitoring initialized');

  // Monitor fetch requests
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';

    // Always log API calls to ethglobal.com regardless of monitoring state
    if (url && url.includes('api2.ethglobal.com/graphql')) {
      console.log(`PLOPL: Detected early ethglobal API call to ${url}`);
      // Store this call for later inspection
      earlyCallsLog.push({
        timestamp: new Date().toISOString(),
        url,
        method,
        requestHeaders: init?.headers,
        requestBody: init?.body,
      });
    }

    // Call original fetch
    const response = await originalFetch.apply(this, arguments);

    try {
      // Check if this is our target API - use includes for partial URL matching
      if (
        (isMonitoringEnabled && url && targetApiUrl && (url.includes(targetApiUrl) || targetApiUrl.includes(url))) ||
        // Special case for ethglobal API
        (targetApiUrl &&
          targetApiUrl.includes('api2.ethglobal.com/graphql') &&
          url &&
          url.includes('api2.ethglobal.com/graphql'))
      ) {
        console.log('PLOPL: Found matching API call!', { url, method });

        // Clone the response so we can read the body
        const clonedResponse = response.clone();
        let responseData;

        try {
          responseData = await clonedResponse.json();
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          responseData = await clonedResponse.text();
        }

        // Get request body if available
        let requestBody = null;
        if (init?.body) {
          try {
            // Try to parse as JSON if it's a string
            if (typeof init.body === 'string') {
              requestBody = JSON.parse(init.body);
            } else if (init.body instanceof FormData) {
              requestBody = 'FormData (not parsed)';
            } else if (init.body instanceof URLSearchParams) {
              requestBody = Object.fromEntries(new URLSearchParams(init.body));
            } else {
              requestBody = init.body;
            }
          } catch (e) {
            console.error('Failed to parse request body:', e);
            requestBody = String(init.body).substring(0, 100) + '...';
          }
        }

        capturedApiData = {
          timestamp: new Date().toISOString(),
          url,
          method,
          request: requestBody,
          response: responseData,
        };

        console.log('PLOPL: Captured API data:', capturedApiData);

        // Notify the side panel
        chrome.runtime
          .sendMessage({
            action: 'apiDataCaptured',
            data: capturedApiData,
          })
          .catch(() => {
            // Side panel might not be open yet, store data for later
            localStorage.setItem('ploplCapturedApiData', JSON.stringify(capturedApiData));
          });
      }
    } catch (err) {
      console.error('PLOPL: Error processing API response', err);
    }

    return response;
  };

  // Monitor XMLHttpRequest for older APIs
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ploplMethod = method;
    this.__ploplUrl = url;

    // Special handling for ethglobal API
    if (url && typeof url === 'string' && url.includes('api2.ethglobal.com/graphql')) {
      console.log(`PLOPL: Detected early ethglobal XHR to ${url}`);
      earlyCallsLog.push({
        timestamp: new Date().toISOString(),
        url,
        method,
        type: 'xhr',
      });
    }

    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this;

    // Special case for ethglobal API
    const isEthGlobalApi =
      xhr.__ploplUrl && typeof xhr.__ploplUrl === 'string' && xhr.__ploplUrl.includes('api2.ethglobal.com/graphql');

    // Check if this matches our target API
    if (
      (isMonitoringEnabled &&
        xhr.__ploplUrl &&
        targetApiUrl &&
        (xhr.__ploplUrl.includes(targetApiUrl) || targetApiUrl.includes(xhr.__ploplUrl))) ||
      isEthGlobalApi
    ) {
      console.log('PLOPL: Found matching XHR request!', {
        url: xhr.__ploplUrl,
        method: xhr.__ploplMethod,
      });

      // Parse request body if possible
      let requestData = null;
      if (body) {
        try {
          if (typeof body === 'string') {
            requestData = JSON.parse(body);
          } else {
            requestData = body;
          }
        } catch (e) {
          console.error('Failed to parse XHR request body:', e);
          requestData = String(body).substring(0, 100) + '...';
        }
      }

      xhr.addEventListener('load', function () {
        try {
          let responseData;
          try {
            responseData = JSON.parse(xhr.responseText);
          } catch (e) {
            console.error('Failed to parse XHR response as JSON:', e);
            responseData = xhr.responseText;
          }

          capturedApiData = {
            timestamp: new Date().toISOString(),
            url: xhr.__ploplUrl,
            method: xhr.__ploplMethod,
            request: requestData,
            response: responseData,
          };

          console.log('PLOPL: Captured XHR API data:', capturedApiData);

          // Notify the side panel
          chrome.runtime
            .sendMessage({
              action: 'apiDataCaptured',
              data: capturedApiData,
            })
            .catch(() => {
              // Side panel might not be open yet, store data for later
              localStorage.setItem('ploplCapturedApiData', JSON.stringify(capturedApiData));
            });
        } catch (err) {
          console.error('PLOPL: Error processing XHR response', err);
        }
      });
    }

    return originalXhrSend.apply(this, arguments);
  };

  console.log('PLOPL: Network monitoring setup complete');
}

// Initialize monitoring immediately
setupNetworkMonitoring();

// Tear down network monitoring
function teardownNetworkMonitoring() {
  window.fetch = originalFetch;
  XMLHttpRequest.prototype.open = originalXhrOpen;
  XMLHttpRequest.prototype.send = originalXhrSend;
  isMonitoringEnabled = false;
  console.log('PLOPL: Network monitoring disabled');
}

// Check if we have previously captured API data in localStorage
function checkForStoredApiData() {
  try {
    const storedData = localStorage.getItem('ploplCapturedApiData');
    if (storedData) {
      console.log('PLOPL: Found stored API data');

      // Try to send it to the side panel
      try {
        chrome.runtime
          .sendMessage({
            action: 'apiDataCaptured',
            data: JSON.parse(storedData),
          })
          .then(() => {
            // If successful, clear the stored data
            localStorage.removeItem('ploplCapturedApiData');
          })
          .catch(() => {
            // Side panel still not ready, keep data in localStorage
          });
      } catch (e) {
        console.error('PLOPL: Error sending stored API data:', e);
      }
    }
  } catch (e) {
    console.error('PLOPL: Error checking localStorage:', e);
  }
}

export default function App() {
  const [showUI, setShowUI] = useState(false);
  const [schemaData, setSchemaData] = useState<any>(null);

  useEffect(() => {
    console.log('PLOPL content script loaded');

    // Check for any API calls that we logged before monitoring was fully enabled
    console.log('PLOPL: Early API calls log:', earlyCallsLog);

    // Check if we have stored API data from a previous capture
    checkForStoredApiData();

    // Listen for messages from the side panel
    const messageListener = message => {
      if (message.action === 'setSchemaData' && message.data?.schema?.request) {
        console.log('PLOPL: Received schema data');

        // Set monitoring target
        targetApiUrl = message.data.schema.request.url;
        targetApiMethod = message.data.schema.request.method;
        isMonitoringEnabled = true;

        // Check if we've already seen an API call that matches our target
        const foundEarlyCall = earlyCallsLog.find(
          call => call.url.includes(targetApiUrl) || targetApiUrl.includes(call.url),
        );

        if (foundEarlyCall) {
          console.log('PLOPL: Found matching API in early calls log:', foundEarlyCall);

          // This is a simplified version - in a real implementation, you would
          // need to actually replay the real API call to get the full data
          capturedApiData = {
            timestamp: foundEarlyCall.timestamp,
            url: foundEarlyCall.url,
            method: foundEarlyCall.method,
            request: foundEarlyCall.requestBody || 'Not captured',
            response: { note: 'Using early call detection. Response was not captured.' },
          };

          // Notify the side panel
          chrome.runtime.sendMessage({
            action: 'apiDataCaptured',
            data: capturedApiData,
          });
        }

        // Send ready notification
        chrome.runtime.sendMessage({
          action: 'contentScriptReady',
        });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Listen for re-injection events
    window.addEventListener('PLOPL_REINJECT', () => {
      console.log('PLOPL: Received re-injection request');

      // Re-setup monitoring
      teardownNetworkMonitoring();
      setupNetworkMonitoring();

      // Re-notify that we're ready
      chrome.runtime.sendMessage({
        action: 'contentScriptReady',
      });
    });

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      window.removeEventListener('PLOPL_REINJECT', () => {});
      teardownNetworkMonitoring();
    };
  }, []);

  // Don't render anything for normal browsing
  if (!showUI) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg z-50">
      <div className="flex gap-1 text-blue-500">PLOPL Extension UI</div>
    </div>
  );
}
