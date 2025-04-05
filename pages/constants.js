export const BACKEND_URL = 'http://localhost:3710';
export const USER_WALLET_ADDRESS = '0xB6c905FFA790F71eD7c0e282680380761cd75056';
export const UW_PK = 'f8db510011d6c519ce1841c32d8a635829af7bfc8a0e6df2ba5b10c723bb7f04'; // 0xB6c905FFA790F71eD7c0e282680380761cd75056

export const CHAINS = [
  {
    id: 84532,
    name: 'Base Sepolia Testnet',
    logo: chrome.runtime.getURL('side-panel/chain-base.png'),
    rpcUrl: 'https://base-sepolia.nodit.io/CM88KE-jFcnW1y9FflvWW_yOohjkK9uF',
    managerContract: '0xd8Dc5e8417cE5dD8e5280118223FD3f8025C9Baf',
    registryContract: '0xD8a90E8F3Bf24514A004Ff4129371be869919BE3',
  },
  {
    id: 80002,
    name: 'Polygon Amoy Testnet',
    logo: chrome.runtime.getURL('side-panel/chain-polygon.png'),
    rpcUrl: 'https://polygon-amoy.nodit.io/CM88KE-jFcnW1y9FflvWW_yOohjkK9uF',
    managerContract: '0x0000000000000000000000000000000000000000',
    registryContract: '0x0000000000000000000000000000000000000000',
  },
  {
    id: 48899,
    name: 'Zircuit Testnet',
    logo: chrome.runtime.getURL('side-panel/chain-zircuit.png'),
    rpcUrl: 'https://testnet.zircuit.com',
    managerContract: '0x0000000000000000000000000000000000000000',
    registryContract: '0x0000000000000000000000000000000000000000',
  },
];
