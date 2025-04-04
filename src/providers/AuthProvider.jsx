import { createContext, useContext, useEffect, useState } from "react";
import {
  useLogin,
  useLogout,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@heroui/react";
import axios from "axios";
import Wrapper from "@/components/Wrapper";

const AuthContext = createContext({
  authenticated: false,
  accessToken: null,
  login: () => {},
  logout: () => {},
  user: null,
  ready: false,
  me: null,
  isLoadingMe: true,
  refetchMe: () => {},
  connectedWallet: null,
  chainId: null,
  connectWallet: () => {},
  disconnectWallet: () => {},
});

export default function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [me, setMe] = useState(null);
  const [isLoadingMe, setIsLoadingMe] = useState(true);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState(null);
  const navigate = useNavigate();
  const { wallets } = useWallets();
  const connectedWallet = wallets?.[0]?.address;
  const chainId = wallets?.[0]?.chainId.split(':')[1];

  const {
    authenticated,
    getAccessToken,
    login,
    logout,
    user,
    ready,
  } = usePrivy();

  const { login: connectWallet } = useLogin();

  const { logout: disconnectWallet } = useLogout();

  const fetchMeData = async (retry = false) => {
    try {
      setIsLoadingMe(true);

      // Add a timeout to prevent indefinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/auth/login`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      setMe(response.data);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Error fetching ME data:", error);

      // Handle timeout or network errors
      if (
        error.name === "AbortError" ||
        error.code === "ECONNABORTED" ||
        !error.response
      ) {
        console.error(
          "Request timed out or network error. Resetting authentication state."
        );
        setMe(null);
        // Force a logout if we're in a broken connection state
        logout();
        return;
      }

      // Check if error is 401 Unauthorized
      if (error.response && error.response.status === 401) {
        console.error("Unauthorized access (401). Logging out...");
        setMe(null);
        logout();
        return;
      }

      // Set me to null for any other errors
      setMe(null);
      
      // Try to recover with retries if not already retrying
      if (!retry && retryCount < 3) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        console.log(`Retrying to fetch user data (${nextRetry}/3)...`);
        
        // Exponential backoff for retries: 2s, 4s, 8s
        const delay = Math.pow(2, nextRetry) * 1000;
        
        const timeout = setTimeout(() => {
          fetchMeData(true);
        }, delay);
        
        setRetryTimeout(timeout);
        return;
      }
      
      // If we've exhausted retries or are in a retry cycle, logout to recover
      if (retryCount >= 3) {
        console.error("Failed to fetch user data after multiple retries. Logging out.");
        logout();
      }
    } finally {
      setIsLoadingMe(false);
    }
  };

  // Function to manually refetch user data
  const refetchMe = async () => {
    if (ready && authenticated && accessToken && connectedWallet) {
      await fetchMeData();
    }
  };

  useEffect(() => {
    if (ready) {
      // If user is not authenticated and trying to access protected routes
      if (!authenticated && !window.location.pathname.startsWith("/login")) {
        navigate("/login");
      }

      // Get and store access token when authenticated
      if (authenticated) {
        const fetchToken = async () => {
          const token = await getAccessToken();
          setAccessToken(token);
        };
        fetchToken();
      }
    }
  }, [authenticated, ready, navigate, getAccessToken]);

  // Effect to fetch ME data when we have both user and accessToken
  useEffect(() => {
    if (ready && authenticated && accessToken) {
      if (connectedWallet) {
        fetchMeData();
      } else {
        // If authenticated but no wallet, reset loading state and show appropriate UI
        setIsLoadingMe(false);
        console.warn("Authenticated but no wallet connected");
      }
    }
  }, [ready, authenticated, accessToken, connectedWallet]);

  // Add safety mechanism to prevent loading state lasting too long
  useEffect(() => {
    if (isLoadingMe) {
      // Start the loading timer
      setLoadingStartTime(Date.now());
    } else {
      setLoadingStartTime(null);
    }
  }, [isLoadingMe]);

  // Check if loading has been active for too long (30 seconds)
  useEffect(() => {
    if (loadingStartTime) {
      const intervalId = setInterval(() => {
        const loadingDuration = Date.now() - loadingStartTime;
        if (loadingDuration > 30000) {
          // 30 seconds
          console.error("Loading state lasted too long. Forcing reset.");
          setIsLoadingMe(false);
          setMe(null);
          // Force logout to recover from stuck state
          logout();
          clearInterval(intervalId);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [loadingStartTime, logout]);

  // Cleanup retry timeout on unmount or user state change
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  // Add additional safety check for the stuck authenticated but no me data state
  useEffect(() => {
    // If we're authenticated but have no me data and we're not loading, 
    // and not already retrying, this is likely a stuck state
    if (ready && authenticated && !isLoadingMe && !me && retryCount === 0) {
      console.warn("Detected authenticated state with no user data. Attempting recovery...");
      fetchMeData(true);
    }
  }, [ready, authenticated, isLoadingMe, me, retryCount]);

  // Sign out when authenticated with me data and accessToken, but no wallets
  useEffect(() => {
    if (ready && authenticated && me && accessToken && wallets && wallets.length === 0) {
      console.warn("Authenticated with user data but no wallets. Signing out...");
      logout();
    }
  }, [ready, authenticated, me, accessToken, wallets, logout]);

  const value = {
    authenticated,
    accessToken,
    login,
    logout,
    user,
    ready,
    me,
    isLoadingMe,
    refetchMe,
    connectedWallet,
    wallets,
    connectWallet,
    disconnectWallet,
    chainId,
  };

  if (!ready && !authenticated) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="animate-pulse mt-4">Waiting for authentication...</p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // Show loading spinner while fetching ME data if authenticated
  if (ready && authenticated && isLoadingMe) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="animate-pulse mt-4">Loading your data...</p>
          </div>
        </div>
      </Wrapper>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === "true";

  const { authenticated, ready, isLoadingMe, me } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !authenticated && !isAuthDisabled) {
      navigate("/login");
    }
  }, [authenticated, ready, navigate, isAuthDisabled]);

  // If auth is disabled via env var, render children without protection
  if (import.meta.env.VITE_DISABLE_AUTH === "true") {
    return children;
  }

  if (!ready || isLoadingMe || (authenticated && !me)) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="animate-pulse mt-4">Please wait...</p>
      </div>
    );
  }

  return authenticated ? children : null;
}