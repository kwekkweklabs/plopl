export const BUY_LINK = "";
export const DOCS_LINK = "";
export const CONTRACT_ADDRESS = "";
export const TWITTER_LINK = "";
export const GITHUB_LINK = "";
export const TELEGRAM_LINK = "";

export const CONFIG = {
  BUY_LINK: "",
  DOCS_LINK: "",
  CONTRACT_ADDRESS: "",
  TWITTER_LINK: "",
  GITHUB_LINK: "",
  TELEGRAM_LINK: "",
};

const isTestnet = import.meta.env.VITE_IS_TESTNET === 'true'

export const CHAINS = isTestnet ? [
  {
    id: 84532,
    name: 'Base Sepolia Testnet',
    logo: '/chain-base.png',
    rpcUrl: `https://base-sepolia.nodit.io/${import.meta.env.VITE_NODIT_API_KEY}`,
    managerContract: '0xd8Dc5e8417cE5dD8e5280118223FD3f8025C9Baf',
    registryContract: '0xD8a90E8F3Bf24514A004Ff4129371be869919BE3',
  },
  {
    id: 80002,
    name: 'Polygon Amoy Testnet',
    logo: '/chain-polygon.png',
    rpcUrl: `https://polygon-amoy.nodit.io/${import.meta.env.VITE_NODIT_API_KEY}`,
    managerContract: '',
    registryContract: '',
  },
  {
    id: 48899,
    name: 'Zircuit Testnet',
    logo: '/chain-zircuit.png',
    rpcUrl: `https://testnet.zircuit.com`,
    managerContract: '',
    registryContract: '',
  }
] : [
  {
    id: 8453,
    name: 'Base Mainnet',
    logo: '/chain-base.png',
    rpcUrl: `https://base-mainnet.nodit.io/${import.meta.env.VITE_NODIT_API_KEY}`,
    managerContract: '',
    registryContract: '',
  },
  {
    id: 80001,
    name: 'Polygon Mainnet',
    logo: '/chain-polygon.png',
    rpcUrl: `https://polygon-mainnet.nodit.io/${import.meta.env.VITE_NODIT_API_KEY}`,
    managerContract: '',
    registryContract: '',
  },
  {
    id: 48900,
    name: 'Zircuit Mainnet',
    logo: '/chain-zircuit.png',
    rpcUrl: `https://mainnet.zircuit.com`,
    managerContract: '',
    registryContract: '',
  }
]
