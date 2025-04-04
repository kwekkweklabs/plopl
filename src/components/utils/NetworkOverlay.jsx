import { useWallets } from "@privy-io/react-auth";
import React, { useState } from "react";

export default function NetworkOverlay({ networkName }) {
  const { wallets } = useWallets()

  const [isChangingNetwork, setIsChangingNetwork] = useState(false)
  const handleChangeNetwork = async () => {
    try {
      setIsChangingNetwork(true)
      if (import.meta.env.VITE_CHAIN === 'BASE') {
        wallets?.[0]?.switchChain(8453)
      } else if (import.meta.env.VITE_CHAIN === 'SEPOLIA') {
        wallets?.[0]?.switchChain(11155111)
      }
    } catch (error) {
      console.error('Error changing network:', error)
    } finally {
      await new Promise(resolve => setTimeout(resolve, 3000))
      setIsChangingNetwork(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#18201F] p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-white/5">
        <div className="mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-primary-500 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-white">Wrong Network</h2>
        <p className="mb-6 text-white/80">
          Please switch to the <span className="font-bold">{networkName}</span> network to continue using the application.
        </p>
        <button onClick={handleChangeNetwork} className="bg-primary-500/10 border border-primary/20 p-4 rounded-lg text-sm text-primary-300">
          {isChangingNetwork ? 'Changing Network...' : 'Change Network'}
        </button>
      </div>
    </div>
  );
} 