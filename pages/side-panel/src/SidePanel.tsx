import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../constants';

const SidePanel = () => {
  const [ploplSchemaId, setPloplSchemaId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const checkForSchemaId = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const id = parsedUrl.searchParams.get('ploplSchemaId');
      setCurrentUrl(url);
      setPloplSchemaId(id);
    } catch (e) {
      console.error('Failed to parse URL', e);
    }
  };

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

  return (
    <div className="App bg-slate-50">
      <div className="flex flex-col text-start gap-2">
        {/* Logo */}
        <img src={chrome.runtime.getURL('side-panel/icon.png')} alt="logo" className="w-10 h-10" />
        {/* Current URL */}
        <div>
          <h3 className="font-bold">Current URL</h3>
          <p className="text-xs text-gray-500 break-all">{currentUrl || 'No URL detected'}</p>
        </div>

        {/* PLOPL Schema ID */}
        <div>
          <h3 className="font-bold">PLOPL Schema ID</h3>
          <p className="text-xs text-gray-500 break-all">{ploplSchemaId || 'No PLOPL Schema ID detected'}</p>
        </div>

        {/* VITE_BACKEND_URL env */}
        <div>
          <h3 className="font-bold">VITE_BACKEND_URL</h3>
          <p className="text-xs text-gray-500 break-all">{BACKEND_URL}</p>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
