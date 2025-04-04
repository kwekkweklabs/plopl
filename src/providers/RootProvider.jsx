import { HeroUIProvider } from "@heroui/react";
import QueryProvider from "./QueryProvider";
import { baseSepolia, polygonAmoy, polygon, base } from 'viem/chains'
import { addRpcUrlOverrideToChain, PrivyProvider } from "@privy-io/react-auth";
import { CHAINS } from "@/config";

const isTestnet = import.meta.env.VITE_IS_TESTNET === 'true'
export default function RootProvider({ children }) {
  let chains = [];
  if (isTestnet) {
    const baseSepoliaNoditInjected = addRpcUrlOverrideToChain(baseSepolia, CHAINS.find(chain => chain.id === 84532).rpcUrl)
    const polygonAmoyNoditInjected = addRpcUrlOverrideToChain(polygonAmoy, CHAINS.find(chain => chain.id === 80002).rpcUrl)

    chains = [baseSepoliaNoditInjected, polygonAmoyNoditInjected]
  } else {
    const baseNoditInjected = addRpcUrlOverrideToChain(base, CHAINS.find(chain => chain.id === 8453).rpcUrl)
    const polygonNoditInjected = addRpcUrlOverrideToChain(polygon, CHAINS.find(chain => chain.id === 80001).rpcUrl)

    chains = [baseNoditInjected, polygonNoditInjected]
  }

  return (
    <HeroUIProvider>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        config={{
          appearance: {
            accentColor: "#ff541e",
            theme: "light",
            showWalletLoginFirst: false,
            logo: "/logo.png",
            walletChainType: "ethereum-only",
            walletList: ["detected_wallets", "metamask", "rabby_wallet"],
          },
          loginMethods: ["wallet"],
          embeddedWallets: {
            requireUserPasswordOnCreate: false,
            showWalletUIs: true,
            ethereum: {
              createOnLogin: "off",
            },
            solana: {
              createOnLogin: "off",
            },
          },
          mfa: {
            noPromptOnMfaRequired: false,
          },
          defaultChain: chains[0],
          supportedChains: chains,
        }}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </PrivyProvider>
    </HeroUIProvider>
  );
}
