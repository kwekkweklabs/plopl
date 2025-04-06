export const CHAINS = [
  {
    id: 84532,
    name: 'Base Sepolia',
    wss: `wss://base-sepolia.nodit.io/${process.env.NODIT_API_KEY}`,
    rpc: `https://base-sepolia.nodit.io/${process.env.NODIT_API_KEY}`,
    managerContract: '0xd8Dc5e8417cE5dD8e5280118223FD3f8025C9Baf',
    registryContract: '0xD8a90E8F3Bf24514A004Ff4129371be869919BE3',
  },
  {
    id: 80002,
    name: 'Polygon Amoy',
    wss: `wss://polygon-amoy.nodit.io/${process.env.NODIT_API_KEY}`,
    rpc: `https://polygon-amoy.nodit.io/${process.env.NODIT_API_KEY}`,
    managerContract: '0xb03A1229B8B71cD5C97Abd10BE0238700970a770',
    registryContract: '0x5c6d990Faef0a400724e67d7c8A31E9AC25eD579',
  },
  {
    id: 48899,
    name: `Zircuit Testnet`,
    wss: `https://testnet.zircuit.co`,
    rpc: `https://testnet.zircuit.co`,
    managerContract: '0x6527800Ef9f9c0772e064F5302592A354b1D07Cc',
    registryContract: '0x0eA5714bb9fbe8E6031821173055fae04ba783Cb',
  }
]