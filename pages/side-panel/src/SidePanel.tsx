import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../constants';

// Schema types
interface SchemaResponse {
  id: string;
  bytes32Id: string;
  name: string;
  description: string;
  schema: {
    id: number;
    slug: string;
    request: {
      url: string;
      args: {
        json: {
          query: string;
          variables: Record<string, unknown>;
        };
      };
      method: string;
    };
    response: {
      match: {
        fields: string[][];
        expected: string[];
      };
      request: {
        method: string;
      };
    };
    prepareUrl: string;
    description: string;
  };
}

interface MessageWithAction {
  action: string;
  data?: unknown;
}

interface CapturedApiData {
  timestamp: string;
  url: string;
  method: string;
  request: unknown;
  response: unknown;
}

const SidePanel = () => {
  const [ploplSchemaId, setPloplSchemaId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<SchemaResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedTargetPage, setVisitedTargetPage] = useState(false);
  const [apiMonitoringActive, setApiMonitoringActive] = useState(false);
  const [capturedApiData, setCapturedApiData] = useState<CapturedApiData | null>(null);

  // Use a ref to prevent repetitive state updates during a single render cycle
  const processedUrlsRef = useRef<Set<string>>(new Set());
  // Track the last processed schema data for target URL matching
  const schemaDataRef = useRef<SchemaResponse | null>(null);
  // Keep track of the last URL to detect page refreshes
  const lastUrlRef = useRef<string | null>(null);
  // Keep track of the last timestamp to identify refreshes vs. navigation
  const lastTimestampRef = useRef<number>(Date.now());
  // Track if we've already sent schema data to avoid repeated sends
  const hasSentSchemaRef = useRef<boolean>(false);
  // Track message listener to avoid duplicate listeners
  const messageListenerRef = useRef<((message: MessageWithAction) => void) | null>(null);

  // Update schema data ref when schema data changes
  useEffect(() => {
    schemaDataRef.current = schemaData;
  }, [schemaData]);

  const resetState = () => {
    setCurrentStep(1);
    setVisitedTargetPage(false);
    setCapturedApiData(null);
    setApiMonitoringActive(false);
    processedUrlsRef.current.clear();
    hasSentSchemaRef.current = false;
    // Keep ploplSchemaId and schemaData if they exist in the URL
  };

  const cancelFlow = () => {
    resetState();
    setPloplSchemaId(null);
    setSchemaData(null);

    // Also clear from localStorage if present
    try {
      localStorage.removeItem('ploplCurrentSchemaId');
    } catch (e) {
      console.error('Failed to remove schema ID from localStorage:', e);
    }

    // Reset any active tabs if possible
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.id && currentTab.url && currentTab.url.includes('ploplSchemaId')) {
        // Remove ploplSchemaId from URL if present
        try {
          const url = new URL(currentTab.url);
          url.searchParams.delete('ploplSchemaId');
          chrome.tabs.update(currentTab.id, { url: url.toString() });
        } catch (e) {
          console.error('Failed to update tab URL:', e);
        }
      }
    });

    // Tell background script to clear captured data
    chrome.runtime.sendMessage({
      action: 'clearApiData',
    });
  };

  const fetchSchemaData = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/schema/${id}`);
      const data = await response.json();
      setSchemaData(data);

      // After fetching schema data, immediately check current tab
      // in case we're already on the target page
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];
        if (currentTab?.url) {
          checkIsTargetPage(currentTab.url, data);
        }
      });

      // Also send the schema data to the background script for monitoring
      sendSchemaToBackgroundScript(data);
    } catch (error) {
      console.error('Error fetching schema data:', error);
    }
  };

  // Separate function to check if a URL is the target page
  const checkIsTargetPage = (url: string, schema: SchemaResponse | null) => {
    if (!schema?.schema?.prepareUrl) return false;

    try {
      const parsedUrl = new URL(url);
      const targetUrl = new URL(schema.schema.prepareUrl);

      // Check if we're on the target page by comparing hostnames
      // and possibly path if it's specific
      const hostnameMatches = parsedUrl.hostname === targetUrl.hostname;
      const pathMatches = targetUrl.pathname === '/' || parsedUrl.pathname.startsWith(targetUrl.pathname);

      const isOnTargetPage = hostnameMatches && pathMatches;

      if (isOnTargetPage && !visitedTargetPage) {
        setVisitedTargetPage(true);

        // Only advance to step 2 if we're currently on step 1
        if (currentStep === 1) {
          setCurrentStep(2);
        }

        return true;
      }

      return isOnTargetPage;
    } catch (e) {
      console.error('Error checking target page:', e);
      return false;
    }
  };

  const checkForSchemaId = (url: string) => {
    // Skip if we've already processed this exact URL recently
    // but don't skip target page detection
    const currentSchema = schemaDataRef.current;
    const shouldCheckTargetPage = currentSchema && currentStep === 1;

    if (processedUrlsRef.current.has(url) && !shouldCheckTargetPage) {
      return;
    }

    // Mark this URL as processed
    processedUrlsRef.current.add(url);

    // Limit the size of processed URLs set to avoid memory leaks
    if (processedUrlsRef.current.size > 10) {
      const iterator = processedUrlsRef.current.values();
      const firstValue = iterator.next().value;
      if (firstValue) {
        processedUrlsRef.current.delete(firstValue);
      }
    }

    try {
      const parsedUrl = new URL(url);
      const id = parsedUrl.searchParams.get('ploplSchemaId');

      // Detect page refresh
      const currentTimestamp = Date.now();
      const isSameUrl = url === lastUrlRef.current;
      const isRefresh = isSameUrl && currentTimestamp - lastTimestampRef.current < 1000;

      // Update timestamps and URL for future checks
      lastTimestampRef.current = currentTimestamp;
      lastUrlRef.current = url;

      // Only reset on refresh if we have a schema ID
      if (isRefresh && id) {
        resetState();
      }

      setCurrentUrl(url);

      // Always check if we've visited the target page when in step 1
      if (currentSchema && currentStep === 1) {
        checkIsTargetPage(url, currentSchema);
      }

      // Only update schema ID if it's different
      if (id !== ploplSchemaId) {
        setPloplSchemaId(id);
        if (id) {
          fetchSchemaData(id);
          // Only reset state if schema ID changes, not on initial load
          if (ploplSchemaId !== null && ploplSchemaId !== id) {
            resetState();
          }
        } else {
          setSchemaData(null);
        }
      }
    } catch (e) {
      console.error('Failed to parse URL', e);
    }
  };

  const openPrepareUrl = () => {
    if (schemaData?.schema?.prepareUrl) {
      // Create URL and ensure ploplSchemaId is included
      const prepareUrl = new URL(schemaData.schema.prepareUrl);

      // Add the current ploplSchemaId as a parameter if it exists
      if (ploplSchemaId && !prepareUrl.searchParams.has('ploplSchemaId')) {
        prepareUrl.searchParams.set('ploplSchemaId', ploplSchemaId);
      }

      // Also store the schema ID in local storage for persistence
      if (ploplSchemaId) {
        try {
          localStorage.setItem('ploplCurrentSchemaId', ploplSchemaId);
        } catch (e) {
          console.error('Failed to store schema ID in localStorage:', e);
        }
      }

      // After opening the URL, force advance to step 2 in case the tab update listener doesn't catch it
      setCurrentStep(2);
      setVisitedTargetPage(true);

      chrome.tabs.create({ url: prepareUrl.toString() });
    }
  };

  const mintProof = () => {
    if (capturedApiData) {
      // Only log this in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API data being used for proof:', capturedApiData);
      }
    }
    setCurrentStep(4); // Done
  };

  // Simulate API data capture (for testing only - remove in production)
  const simulateApiCapture = () => {
    const mockData = {
      timestamp: new Date().toISOString(),
      url: schemaData?.schema?.request?.url || 'https://api.example.com',
      method: schemaData?.schema?.request?.method || 'POST',
      request: { query: 'example query' },
      response: { data: { example: 'response data' } },
    };
    setCapturedApiData(mockData as CapturedApiData);
    setCurrentStep(3);
  };

  // Send schema data to background script for API monitoring
  const sendSchemaToBackgroundScript = (schema: SchemaResponse) => {
    // Set flag to prevent sending the same schema data repeatedly
    hasSentSchemaRef.current = true;

    // Try to send message to background with retry logic
    const attemptSend = (retries = 3, delay = 500) => {
      chrome.runtime
        .sendMessage({
          action: 'setSchemaData',
          data: schema,
        })
        .then(() => {
          setApiMonitoringActive(true);
        })
        .catch(err => {
          console.error('Error sending schema data to background:', err);

          // If error indicates receiving end doesn't exist and we have retries left
          if (err.message?.includes('Receiving end does not exist') && retries > 0) {
            console.log(`Retrying in ${delay}ms... (${retries} attempts left)`);
            // Wait and retry with exponential backoff
            setTimeout(() => attemptSend(retries - 1, delay * 1.5), delay);
          } else {
            // Max retries reached or different error
            hasSentSchemaRef.current = false;
          }
        });
    };

    // Ping the background script first to wake it up
    chrome.runtime.sendMessage({ action: 'ping' }).finally(() => {
      // Start the send attempts whether the ping succeeds or fails
      attemptSend();
    });
  };

  // Listen for messages from the background script
  useEffect(() => {
    // Cleanup any previous listener to avoid duplicates
    if (messageListenerRef.current) {
      chrome.runtime.onMessage.removeListener(messageListenerRef.current);
    }

    // Create new message listener
    const messageListener = (message: MessageWithAction) => {
      // Only process relevant messages
      if (!message || typeof message !== 'object' || !message.action) {
        return;
      }

      if (message.action === 'apiDataCaptured' && message.data) {
        setCapturedApiData(message.data as CapturedApiData);

        // Move to step 3 once API is captured
        if (currentStep === 2) {
          setCurrentStep(3);
        }
      }
    };

    // Store the listener ref for cleanup
    messageListenerRef.current = messageListener;

    // Add the listener
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup on unmount
    return () => {
      if (messageListenerRef.current) {
        chrome.runtime.onMessage.removeListener(messageListenerRef.current);
      }
    };
  }, [currentStep]);

  // Send schema data to background when it changes
  useEffect(() => {
    if (schemaData && !hasSentSchemaRef.current) {
      sendSchemaToBackgroundScript(schemaData);
    }
  }, [schemaData]);

  // Initial URL check and tab update listener
  useEffect(() => {
    // Initial check on current tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      if (currentTab?.url) {
        checkForSchemaId(currentTab.url);
      }
    });

    // Listen for tab updates to detect URL changes
    const tabUpdateListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active && tab.url) {
        checkForSchemaId(tab.url);
      }
    };

    chrome.tabs.onUpdated.addListener(tabUpdateListener);

    // Cleanup listener on unmount
    return () => {
      chrome.tabs.onUpdated.removeListener(tabUpdateListener);
    };
  }, []);

  // Calculate the target URL with ploplSchemaId preserved
  const getTargetUrlWithSchema = () => {
    if (!schemaData?.schema?.prepareUrl) return '';

    const prepareUrl = new URL(schemaData.schema.prepareUrl);
    if (ploplSchemaId) {
      prepareUrl.searchParams.set('ploplSchemaId', ploplSchemaId);
    }
    return prepareUrl.toString();
  };

  return (
    <div className="App bg-white p-3 min-h-screen text-sm">
      <div className="flex flex-col gap-3">
        {/* Logo and header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={chrome.runtime.getURL('side-panel/icon.png')} alt="logo" className="w-6 h-6" />
            <h1 className="text-lg font-semibold text-[#ff541e]">PLOPL</h1>
          </div>

          {/* Global cancel button */}
          {schemaData && (
            <button
              onClick={cancelFlow}
              className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-md px-2 py-1 transition-colors">
              Cancel
            </button>
          )}
        </div>

        {schemaData ? (
          <div className="flex flex-col gap-3 text-left">
            {/* Schema information */}
            <div className="border border-black/10 rounded-lg p-2">
              <h2 className="text-base font-medium mb-1">{schemaData.name}</h2>
              <p className="text-gray-600 text-xs">{schemaData.schema.description}</p>
            </div>

            {/* Status bar */}
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-md ${apiMonitoringActive ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
              <div className={`w-2 h-2 rounded-full ${apiMonitoringActive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className="text-xs">
                {apiMonitoringActive ? 'Network monitoring active' : 'Preparing network monitoring...'}
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-[#ff541e] text-left">Steps to verify</h3>

              {/* Step 1 */}
              <div
                className={`border rounded-lg p-2 ${currentStep === 1 ? 'border-[#ff541e]/50 bg-[#ff541e]/5' : 'border-black/10 opacity-70'}`}>
                <div className="flex gap-2 mb-1">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-medium text-xs ${
                      currentStep > 1 ? 'bg-green-100 text-green-600' : 'bg-[#ff541e] text-white'
                    }`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </div>
                  <div className="font-medium text-xs mt-0.5 text-left">Visit verification page</div>
                </div>
                <p className="text-xs text-gray-600 ml-7 mb-1 text-left">
                  Go to the complete URL (ploplSchemaId will be preserved)
                </p>
                {currentStep === 1 && (
                  <>
                    <div className="ml-7 mb-1.5 bg-gray-50 p-1.5 rounded-md overflow-hidden">
                      <p className="text-xs break-all font-mono text-left">{getTargetUrlWithSchema()}</p>
                    </div>
                    <button
                      onClick={openPrepareUrl}
                      className="ml-7 bg-[#ff541e] text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-[#ff541e]/90 transition">
                      Open URL
                    </button>
                  </>
                )}
                {currentStep > 1 && (
                  <p className="text-xs text-green-600 ml-7 text-left">✓ Verification page visited</p>
                )}
              </div>

              {/* Step 2 */}
              <div
                className={`border rounded-lg p-2 ${currentStep === 2 ? 'border-[#ff541e]/50 bg-[#ff541e]/5' : 'border-black/10 opacity-70'}`}>
                <div className="flex gap-2 mb-1">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-medium text-xs ${
                      currentStep > 2
                        ? 'bg-green-100 text-green-600'
                        : currentStep === 2
                          ? 'bg-[#ff541e] text-white'
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                    {currentStep > 2 ? '✓' : '2'}
                  </div>
                  <div className={`font-medium text-xs mt-0.5 text-left ${currentStep < 2 ? 'text-gray-400' : ''}`}>
                    Capture API data
                  </div>
                </div>
                <p className="text-xs text-gray-600 ml-7 mb-1 text-left">
                  {schemaData.schema.request.method} {schemaData.schema.request.url}
                </p>
                {currentStep === 2 && (
                  <div className="ml-7 flex flex-col gap-1">
                    <div className="text-gray-500 flex items-center gap-1 text-xs">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#ff541e]"></div>
                      <span>Monitoring network requests...</span>
                    </div>
                    <div className="text-xs text-gray-500">Interact with the page to trigger API calls</div>
                    <button onClick={simulateApiCapture} className="text-xs text-[#ff541e] underline mt-1">
                      Debug: Simulate API capture
                    </button>
                  </div>
                )}
                {currentStep > 2 && (
                  <p className="text-xs text-green-600 ml-7 text-left">✓ API data captured successfully</p>
                )}
              </div>

              {/* Step 3 */}
              <div
                className={`border rounded-lg p-2 ${currentStep === 3 ? 'border-[#ff541e]/50 bg-[#ff541e]/5' : 'border-black/10 opacity-70'}`}>
                <div className="flex gap-2 mb-1">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-medium text-xs ${
                      currentStep > 3
                        ? 'bg-green-100 text-green-600'
                        : currentStep === 3
                          ? 'bg-[#ff541e] text-white'
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                    {currentStep > 3 ? '✓' : '3'}
                  </div>
                  <div className={`font-medium text-xs mt-0.5 text-left ${currentStep < 3 ? 'text-gray-400' : ''}`}>
                    Mint your proof
                  </div>
                </div>
                <p className="text-xs text-gray-600 ml-7 mb-1 text-left">Once data is collected, mint your proof</p>
                {currentStep === 3 && (
                  <button
                    onClick={mintProof}
                    className="ml-7 bg-[#ff541e] text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-[#ff541e]/90 transition">
                    Mint Proof
                  </button>
                )}
                {currentStep > 3 && (
                  <p className="text-xs text-green-600 ml-7 text-left">✓ Proof minted successfully</p>
                )}
              </div>

              {/* Success message when all steps completed */}
              {currentStep > 3 && (
                <div className="mt-2 bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                  <div className="text-green-600 font-medium">Verification Complete!</div>
                  <p className="text-xs text-green-600 mt-1">Your proof has been minted successfully</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border border-black/10 rounded-lg p-3 text-left">
            <div className="text-[#ff541e] text-sm font-medium">No Schema Found</div>
            <p className="text-gray-600 text-xs">
              Visit a website with a ploplSchemaId parameter to get started with verification.
            </p>
          </div>
        )}

        {/* Debug Info (hidden in production) */}
        <div className="mt-3 border-t border-gray-200 pt-2">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <div className="mt-1 space-y-1">
              <div>
                <strong>Current URL:</strong> {currentUrl || 'None'}
              </div>
              <div>
                <strong>Schema ID:</strong> {ploplSchemaId || 'None'}
              </div>
              <div>
                <strong>Current Step:</strong> {currentStep}
              </div>
              <div>
                <strong>Visited Target:</strong> {visitedTargetPage ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>API Monitoring:</strong> {apiMonitoringActive ? 'Active' : 'Inactive'}
              </div>
              <div>
                <strong>Has Sent Schema:</strong> {hasSentSchemaRef.current ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Processed URLs Count:</strong> {processedUrlsRef.current.size}
              </div>
              <div>
                <strong>Target URL:</strong> {schemaData?.schema?.prepareUrl || 'None'}
              </div>
              <div>
                <strong>Schema Request URL:</strong> {schemaData?.schema?.request?.url || 'None'}
              </div>
              <div>
                <strong>API Data Captured:</strong> {capturedApiData ? 'Yes' : 'No'}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
