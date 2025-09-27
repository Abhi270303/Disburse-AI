import { defineChain } from "viem";

// Chain ID constants - Polygon Amoy Testnet
export const CHAIN_IDS = {
  POLYGON_AMOY: 80002,
} as const;

export const DEFAULT_RPC_URL = "https://rpc-amoy.polygon.technology/";


// Define Polygon Amoy Testnet chain
export const POLYGON_AMOY = defineChain({
  id: CHAIN_IDS.POLYGON_AMOY,
  name: 'Polygon Amoy Testnet',
  network: 'polygon-amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'Polygon',
    symbol: 'POL',
  },
  rpcUrls: {
    default: {
      http: [DEFAULT_RPC_URL],
    },
    public: {
      http: [DEFAULT_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://amoy.polygonscan.com/',
    },
  },
  testnet: true,
});

// Default chain configuration
export const DEFAULT_CHAIN = POLYGON_AMOY;
export const DEFAULT_CHAIN_ID = DEFAULT_CHAIN.id;
// Supported chains array - Polygon Amoy Testnet
export const SUPPORTED_CHAINS = [CHAIN_IDS.POLYGON_AMOY];

// Chain name mapping - Polygon Amoy Testnet
export const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.POLYGON_AMOY]: 'Polygon Amoy Testnet',
};

// RPC URL mapping - Polygon Amoy Testnet
export const RPC_URLS: Record<number, string> = {
  [CHAIN_IDS.POLYGON_AMOY]: DEFAULT_RPC_URL,
};

// Native currency mapping - Polygon Amoy Testnet
export const NATIVE_CURRENCIES: Record<number, { name: string; symbol: string; decimals: number }> = {
  [CHAIN_IDS.POLYGON_AMOY]: { name: 'Polygon', symbol: 'POL', decimals: 18 },
};

// USDC Contract address for Polygon Amoy Testnet
export const USDC_CONTRACT_ADDRESS = '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582';
