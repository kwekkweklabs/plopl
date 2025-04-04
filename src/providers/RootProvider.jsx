import { HeroUIProvider } from "@heroui/react";
import QueryProvider from "./QueryProvider";
import { baseSepolia, polygonAmoy, polygon, base } from 'viem/chains'
import { PrivyProvider } from "@privy-io/react-auth";

const isTestnet = import.meta.env.VITE_IS_TESTNET === 'true'
export default function RootProvider({ children }) {
  let chains = [];
  if (isTestnet) {
    chains = [baseSepolia, polygonAmoy]
  } else {
    chains = [base, polygon]
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
