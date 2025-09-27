// Helper function to get contract networks configuration for Safe Protocol Kit
// For Polygon Amoy testnet, we use the default Safe contracts (no custom configuration needed)
export const getContractNetworks = (chainId) => {
  // For Polygon Amoy (80002) and other chains, let SDK defaults apply
  // No custom contract addresses needed
  return undefined;
};
