// Safe contract addresses for Polygon Amoy Testnet (80002)
// Let the Safe Protocol Kit use its default addresses for Polygon Amoy

// Helper function to get contract networks configuration for Safe Protocol Kit
export const getContractNetworks = (chainId) => {
  // For Polygon Amoy Testnet (80002), let the SDK use its default addresses
  // The Safe Protocol Kit should have built-in support for Polygon Amoy
  if (chainId !== 80002) return undefined;

  // Return undefined to let the SDK use its default addresses
  // This is safer than using potentially incorrect hardcoded addresses
  return undefined;
};
