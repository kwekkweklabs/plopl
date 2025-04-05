import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  // Open side panel when the button is clicked (user gesture)
  const openSidePanel = async () => {
    try {
      // Get the current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab && currentTab.id) {
        // Open the side panel for this tab
        await chrome.sidePanel.open({ tabId: currentTab.id });

        // Close the popup after opening the side panel
        window.close();
      } else {
        console.error('Could not find current tab');
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="flex flex-col items-center justify-center py-4">
          {/* Logo */}
          <img src={chrome.runtime.getURL('side-panel/icon.png')} alt="PLOPL Logo" className="w-16 h-16 mb-3" />
          {/* <h1 className="text-xl font-bold text-[#ff541e] mb-3">PLOPL</h1> */}

          {/* Button to open side panel */}
          <button
            onClick={openSidePanel}
            className="bg-[#15100f] hover:bg-[#e04010] text-white font-medium px-4 py-2 rounded-md transition-colors mt-2">
            Proceed
          </button>

          <p className="text-xs mt-4 opacity-70">Click the button to continue</p>
        </div>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
