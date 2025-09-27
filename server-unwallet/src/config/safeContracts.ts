// Safe contract addresses for Polygon Amoy Testnet (80002)
// Using default Safe contracts for EVM-compatible chains
// Polygon Amoy testnet should use the standard Safe contract deployments

export const SAFE_CONTRACTS_80002 = {
  // Core Safe contracts for Polygon Amoy testnet
  // These will use the default Safe contract addresses for EVM-compatible chains
  // The Safe SDK will automatically resolve the correct addresses for Polygon Amoy
} as const;

export const SAFE_CONTRACTS_MAP: Record<number, any> = {
  80002: SAFE_CONTRACTS_80002
};


