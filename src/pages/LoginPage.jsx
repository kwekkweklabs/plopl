import { Button } from "@heroui/react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { shortenAddress } from "@/utils/misc";
import { cnm } from "@/utils/style";
import { useAuth } from "@/providers/AuthProvider";
import { Wallet, LogOut, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    authenticated,
    user,
    ready,
    connectWallet,
    disconnectWallet,
    connectedWallet
  } = useAuth();

  const walletConnected = !!connectedWallet;

  const handleConnectWallet = () => {
    setIsLoading(true);
    try {
      connectWallet();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    setIsLoading(true);
    try {
      disconnectWallet();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    navigate("/dashboard/home");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-purple-600/5 rounded-full blur-3xl -ml-48 -mb-48"></div>
      
      {/* Subtle code elements */}
      <div className="absolute top-1/4 left-1/6 text-5xl text-orange-500/10 font-mono transform -rotate-12">{`{`}</div>
      <div className="absolute top-1/3 right-1/6 text-4xl text-blue-500/10 font-mono transform rotate-12">{`}`}</div>
      
      <div className="relative z-10 mb-12 text-center max-w-3xl">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="PLOPL" className="w-[18rem]" />
        </div>
        
        <h1 className="font-black mb-4 leading-tight">
          <div className="text-4xl bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-orange-600 mb-3">
            Trustless Off-chain to On-chain Integration
          </div>
          <div className="text-5xl text-slate-800">
            Made Easy!
          </div>
        </h1>
        
        <div className="flex justify-center gap-3 my-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
            zkTLS
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            Privacy
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            Web3
          </span>
        </div>
        
        <p className="text-slate-700 text-lg font-medium mt-6 max-w-2xl mx-auto">
          PLOPL is a developer-friendly toolkit that enables trustless integration of off-chain data
          to on-chain systems using zkTLS technology.
        </p>
      </div>

      <div className={cnm(
        "relative backdrop-blur-sm bg-white/80 shadow-2xl overflow-hidden shadow-black/10 rounded-3xl p-10 border border-slate-100",
        walletConnected ? "max-w-lg" : "max-w-md"
      )}>
        <div className="absolute -top-3 -left-3 w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full opacity-10 blur-xl"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-10 blur-xl"></div>

        <div className="mb-10 flex flex-col items-center relative">
          <h2 className="mt-2 text-3xl font-bold text-slate-800">
            Welcome to <span className="bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">Plopl</span>
          </h2>
          <p className="mt-3 text-slate-600 font-medium">
            Connect your wallet to continue
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {!authenticated ? (
            <>
              {/* Connect Wallet */}
              <div className="flex flex-col gap-5">
                <div className="mt-2">
                  <Button
                    onPress={handleConnectWallet}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300"
                    color="primary"
                    size="lg"
                    radius="full"
                    isDisabled={isLoading}
                  >
                    <Wallet size={20} className="mr-2" />
                    {isLoading ? "Connecting..." : "Connect Wallet"}
                  </Button>
                  <p className="mt-8 text-slate-500 text-sm font-normal text-center">
                    By signing in, you agree to our Terms of Service and
                    Privacy Policy.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Wallet Connected View */}
              <div className="flex flex-col gap-8">
                <div className="w-full flex items-center min-w-[20rem] justify-between gap-2 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-primary-200 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md">
                      <Wallet size={18} />
                    </div>
                    <p className="text-slate-700 text-sm font-medium">
                      {shortenAddress(user?.wallet?.address)}
                    </p>
                  </div>
                  <Button
                    onPress={handleDisconnectWallet}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    radius="full"
                    size="sm"
                  >
                    <LogOut size={14} className="mr-1" />
                    <p>Disconnect</p>
                  </Button>
                </div>

                <Button
                  onPress={handleContinue}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300"
                  color="primary"
                  size="lg"
                  radius="full"
                >
                  <p className="font-medium">Go to Dashboard</p>
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
