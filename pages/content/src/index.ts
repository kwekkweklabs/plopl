import { sampleFunction } from '@src/sampleFunction';

console.log('🔴 PLOPL content script loaded');

// Shows how to call a function defined in another module
sampleFunction();

// PLOPL Content Script - Network Interceptor
console.log('🔴 PLOPL content script loaded');

// Function to send response data to background script
function sendResponseToBackground(url: string, method: string, requestData: any, responseData: any) {
  console.log(`🔴 PLOPL captured response for ${method} ${url}`);

  // Enhanced logging for debugging
  console.log('🔴 PLOPL content script sending response data to background');
  console.log('🔴 URL:', url);
  console.log('🔴 Method:', method);
  console.log('🔴 Response Status:', responseData.status, responseData.statusText);

  // Send message with retry logic
  const sendWithRetry = (retries = 3) => {
    try {
      chrome.runtime
        .sendMessage({
          action: 'responseBodyCaptured',
          data: {
            url,
            method,
            requestData,
            responseData,
            timestamp: new Date().toISOString(),
          },
        })
        .then(() => {
          console.log('🔴 Successfully sent response data to background script');
        })
        .catch(err => {
          console.error('🔴 Error sending response data to background:', err);

          if (retries > 0) {
            console.log(`🔴 Retrying... (${retries} attempts left)`);
            setTimeout(() => sendWithRetry(retries - 1), 500);
          }
        });
    } catch (error) {
      console.error('🔴 Failed to send message to background script:', error);

      if (retries > 0) {
        console.log(`🔴 Retrying... (${retries} attempts left)`);
        setTimeout(() => sendWithRetry(retries - 1), 500);
      }
    }
  };

  // Start sending with retry logic
  sendWithRetry();
}

// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || 'GET';

  // Process all potential API requests - let the background script decide if it matches the schema
  if (url.includes('/api') || url.includes('/graphql') || url.includes('api.')) {
    console.log(`🔴 PLOPL intercepted fetch: ${method} ${url}`);

    // Extract request details
    let requestData = {
      url,
      method,
      headers: {} as Record<string, string>,
      body: null,
    };

    // Capture request headers
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          requestData.headers[key] = value;
        });
      } else if (typeof init.headers === 'object') {
        Object.assign(requestData.headers, init.headers);
      }
    }

    // Capture request body
    if (init?.body) {
      try {
        if (typeof init.body === 'string') {
          const parsedBody = JSON.parse(init.body);
          requestData.body = parsedBody;
        } else if (init.body instanceof FormData) {
          requestData.body = { type: 'FormData' };
        } else if (init.body instanceof ArrayBuffer) {
          requestData.body = { type: 'Binary' };
        }
      } catch (e) {
        requestData.body = { type: 'unparsed', text: String(init.body).substring(0, 100) };
      }
    }

    // Make the original request
    try {
      const response = await originalFetch.apply(this, [input, init]);

      // Clone the response so we can read it without consuming it
      const clonedResponse = response.clone();

      // Create response data object with metadata
      let responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: {} as Record<string, string>,
        body: null,
        url: response.url,
      };

      // Capture response headers
      response.headers.forEach((value, key) => {
        responseData.headers[key] = value;
      });

      // Process the response in the background
      clonedResponse
        .text()
        .then(bodyText => {
          try {
            // Try to parse as JSON
            const jsonData = JSON.parse(bodyText);
            responseData.body = jsonData;

            // Send complete request/response data
            sendResponseToBackground(url, method, requestData, responseData);
          } catch (e) {
            // If not JSON, just send the text (first 1000 chars)
            responseData.body = {
              type: 'text',
              content: bodyText.substring(0, 1000),
            };
            sendResponseToBackground(url, method, requestData, responseData);
          }
        })
        .catch(err => {
          console.error('🔴 Error processing response:', err);
          responseData.body = { error: 'Failed to read response body' };
          sendResponseToBackground(url, method, requestData, responseData);
        });

      // Return the original response to the page
      return response;
    } catch (error) {
      console.error('🔴 Fetch error:', error);
      // Let the original error propagate
      throw error;
    }
  }

  // For non-API URLs, just pass through
  return originalFetch.apply(this, [input, init]);
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
  const urlString = url.toString();

  // Store the URL and method for later use
  // @ts-ignore - adding custom properties
  this._ploplUrl = urlString;
  // @ts-ignore
  this._ploplMethod = method;
  // @ts-ignore - initialize headers collection
  this._ploplRequestHeaders = {};

  return originalXHROpen.apply(this, [method, url, ...args]);
};

// Intercept header setting
XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
  // @ts-ignore - store headers
  if (this._ploplRequestHeaders) {
    // @ts-ignore
    this._ploplRequestHeaders[name] = value;
  }

  return originalXHRSetRequestHeader.apply(this, [name, value]);
};

XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit) {
  // @ts-ignore
  const url = this._ploplUrl;
  // @ts-ignore
  const method = this._ploplMethod;

  // Process if URL looks like an API endpoint
  if (url && (url.includes('/api') || url.includes('/graphql') || url.includes('api.'))) {
    console.log(`🔴 PLOPL intercepted XHR: ${method} ${url}`);

    // Create request data object
    const requestData = {
      url: url,
      method: method,
      // @ts-ignore
      headers: this._ploplRequestHeaders || {},
      body: null,
    };

    // Parse request body if possible
    if (body) {
      try {
        if (typeof body === 'string') {
          requestData.body = JSON.parse(body);
        } else if (body instanceof FormData) {
          requestData.body = { type: 'FormData' };
        } else {
          requestData.body = { type: 'unknown' };
        }
      } catch (e) {
        requestData.body = { type: 'unparsed', text: String(body).substring(0, 100) };
      }
    }

    // Add response listener
    this.addEventListener('load', function () {
      // Create response data object
      const responseData = {
        status: this.status,
        statusText: this.statusText,
        headers: {},
        body: null,
        url: this.responseURL || url,
      };

      // Extract response headers
      const allHeaders = this.getAllResponseHeaders();
      const headerLines = allHeaders.trim().split(/[\r\n]+/);
      headerLines.forEach(line => {
        const parts = line.split(': ');
        const header = parts.shift();
        const value = parts.join(': ');
        if (header) {
          responseData.headers[header] = value;
        }
      });

      // Process response body
      if (this.status >= 200 && this.status < 300) {
        try {
          // Handle different response types
          if (this.responseType === 'json' && this.response) {
            responseData.body = this.response;
          } else if (this.responseText) {
            try {
              responseData.body = JSON.parse(this.responseText);
            } catch (e) {
              // Not JSON, send text
              responseData.body = {
                type: 'text',
                content: this.responseText.substring(0, 1000),
              };
            }
          } else {
            responseData.body = { type: 'unknown', status: this.status };
          }

          sendResponseToBackground(url, method, requestData, responseData);
        } catch (e) {
          console.error('🔴 Error handling XHR response:', e);
          responseData.body = { error: 'Failed to process response' };
          sendResponseToBackground(url, method, requestData, responseData);
        }
      } else {
        // Also capture error responses
        responseData.body = {
          error: 'HTTP Error',
          status: this.status,
          statusText: this.statusText,
        };
        sendResponseToBackground(url, method, requestData, responseData);
      }
    });

    // Also capture network errors
    this.addEventListener('error', function () {
      const responseData = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: { error: 'Network request failed' },
        url: this.responseURL || url,
      };
      sendResponseToBackground(url, method, requestData, responseData);
    });
  }

  return originalXHRSend.apply(this, [body]);
};

console.log('🔴 PLOPL network interceptor active');
