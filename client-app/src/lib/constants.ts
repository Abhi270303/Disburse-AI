import { Chain, http } from "viem";
import { Network } from "@/types/network";

export const NETWORK_CONFIG = {
  DEFAULT_NETWORK_NAME: "Polygon Amoy Testnet",
} as const;
export const CHAIN_IDS = {
  POLYGON_AMOY_TESTNET: 80002,
} as const;

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export const STEALTH_ADDRESS_GENERATION_MESSAGE =
  "STEALTH_ADDRESS_GENERATION_ZZZZZ_POLYGON_AMOY_TESTNET";

// Centralized RPC configuration
export const RPC_CONFIG = {
  POLYGON_AMOY_TESTNET: {
    primary: "https://rpc-amoy.polygon.technology/",
    fallbacks: [
      "https://rpc-amoy.polygon.technology/",
    ],
  },
} as const;

export const WHITELISTED_NETWORKS = [
  {
    name: "Polygon Amoy Testnet",
    chainId: CHAIN_IDS.POLYGON_AMOY_TESTNET,
    network: "polygon-amoy-testnet",
    explorerUrl: "https://amoy.polygonscan.com",
    logo: "/chains/polygon-logo.svg",
    rpcUrl: RPC_CONFIG.POLYGON_AMOY_TESTNET.primary,
    // Fallback RPC URLs in case the primary one fails
    fallbackRpcUrls: RPC_CONFIG.POLYGON_AMOY_TESTNET.fallbacks,
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    blockExplorer: {
      name: "Polygon Amoy Explorer",
      url: "https://amoy.polygonscan.com/",
    },
    tokens: [
      {
        enabled: true,
        symbol: "USDC",
        name: "USDC",
        address: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
        iconUri: "/tokens/usdc.png",
      },
      {
        enabled: false,
        symbol: "USDT",
        name: "USDT",
        address: "0xfa86C7c30840694293a5c997f399d00A4eD3cDD8",
        iconUri: "/tokens/usdt.png",
      },
    ],
    testnet: true,
  },
];

// Transform function to convert WHITELISTED_NETWORKS to Privy Chain format
export const getPrivyChains = (networks: Network[]) => {
  return networks.map((network) => ({
    name: network.name,
    id: network.chainId,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: {
        http: [network.rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: "Polygon Amoy Explorer",
        url: network.explorerUrl,
      },
    },
  }));
};

// Transform function to convert WHITELISTED_NETWORKS to Viem Chain format
export const getViemChains = (networks: Network[]): Chain[] => {
  return networks.map((network) => ({
    id: network.chainId,
    name: network.name,
    network: network.network,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: {
        http: [network.rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: "Block Explorer",
        url: network.blockExplorer.url,
      },
    },
    testnet: network.testnet,
  }));
};

// Create dynamic RPC transports for all whitelisted networks with retry logic
export const getViemTransports = (networks: Network[]) => {
  const transports: Record<number, ReturnType<typeof http>> = {};

  networks.forEach((network) => {
    // Use centralized RPC configuration with retry configuration
    const rpcUrl =
      network.chainId === CHAIN_IDS.POLYGON_AMOY_TESTNET
        ? RPC_CONFIG.POLYGON_AMOY_TESTNET.primary
        : network.rpcUrl;

    transports[network.chainId] = http(rpcUrl, {
      retryCount: 3,
      retryDelay: 2500,
      timeout: 10000,
    });
  });

  return transports;
};

export const SITE = {
  name: "Disburse AI",
  description: "One wallet for payments on any chain.",
  logo: "/logo.svg",
};

export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
];

// Utility function to get the current network from a list of networks
export const getCurrentNetwork = (
  networks: Network[] | undefined
): Network | undefined => {
  if (!networks) return undefined;
  return networks.find(
    (network) => network.name === NETWORK_CONFIG.DEFAULT_NETWORK_NAME
  );
};

// Utility function to get network by name
export const getNetworkByName = (networkName: string): Network | undefined => {
  return WHITELISTED_NETWORKS.find((network) => network.name === networkName);
};

// Utility function to get network by chain ID
export const getNetworkByChainId = (chainId: number): Network | undefined => {
  return WHITELISTED_NETWORKS.find((network) => network.chainId === chainId);
};

// Utility function to get transaction explorer URL
export const getTransactionExplorerUrl = (
  txHash: string,
  networkName?: string,
  chainId?: number
): string => {
  let network: Network | undefined;

  if (chainId) {
    network = getNetworkByChainId(chainId);
  } else if (networkName) {
    network = getNetworkByName(networkName);
  }

  if (!network) {
    // Fallback to default network (Polygon Amoy Testnet)
    network = getCurrentNetwork(WHITELISTED_NETWORKS);
  }

  // Ensure we have a network, fallback to Polygon Amoy Testnet if still undefined
  const fallbackNetwork = network || WHITELISTED_NETWORKS[0];
  return `${fallbackNetwork.explorerUrl}/tx/${txHash}`;
};

// Utility function to get address explorer URL
export const getAddressExplorerUrl = (
  address: string,
  networkName?: string,
  chainId?: number
): string => {
  let network: Network | undefined;

  if (chainId) {
    network = getNetworkByChainId(chainId);
  } else if (networkName) {
    network = getNetworkByName(networkName);
  }

  if (!network) {
    // Fallback to default network (Polygon Amoy Testnet)
    network = getCurrentNetwork(WHITELISTED_NETWORKS);
  }

  // Ensure we have a network, fallback to Polygon Amoy Testnet if still undefined
  const fallbackNetwork = network || WHITELISTED_NETWORKS[0];
  return `${fallbackNetwork.explorerUrl}/address/${address}`;
};

export const SAFE_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    name: "execTransaction",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const USDC_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
