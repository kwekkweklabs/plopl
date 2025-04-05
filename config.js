export const CHAINS = [
  {
    id: 84532,
    name: 'Base Sepolia',
    rpc: `wss://base-sepolia.nodit.io/${process.env.NODIT_API_KEY}`
  },
  {
    id: 80002,
    name: 'Polygon Amoy',
    wss: `wss://polygon-amoy.nodit.io/${process.env.NODIT_API_KEY}`
  },
  {
    id: 48899,
    name: `Zircuit Testnet`,
    wss: `https://testnet.zircuit.co`
  }
]