// Custom Safe contract addresses for Polygon Amoy Testnet (80002)
// These are the standard Safe contract addresses for Polygon testnet

export const SAFE_CONTRACTS_80002 = {
  // Core - Using standard Safe contract addresses for Polygon Amoy testnet
  safeProxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  // L1/L2 singleton addresses (SDK expects these keys)
  safeSingletonAddress: "0x41675C099F32341bf84BFc5382aF534df5C7461a",
  safeSingletonL2Address: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
  // Keep legacy alias for completeness (ignored if not used by SDK)
  safeMasterCopyAddress: "0x41675C099F32341bf84BFc5382aF534df5C7461a",

  // Helpers / libs
  multiSendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
  multiSendCallOnlyAddress: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
  fallbackHandlerAddress: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
  tokenCallbackHandlerAddress: "0xeDCF620325E82e3B9836eaaeFdc4283E99Dd7562",
  signMessageLibAddress: "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9",
  createCallAddress: "0x9b35Af71d77eaf8d7e40252370304687390A1A52",
  simulateTxAccessorAddress: "0x3d4BA2E0884aa488718476ca2FB8Efc291A46199",

  // L2 migration utilities (optional, included if needed by SDK flows)
  safeToL2SetupAddress: "0xBD89A1CE4DDe368FFAB0eC35506eEcE0b1fFdc54",
  safeToL2MigrationAddress: "0xfF83F6335d8930cBad1c0D439A841f01888D9f69",
  safeMigrationAddress: "0x526643F69b81B008F46d95CD5ced5eC0edFFDaC6",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SAFE_CONTRACTS_MAP: Record<number, any> = {
  80002: SAFE_CONTRACTS_80002,
};

// Helper function to get contract networks configuration for Safe Protocol Kit
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getContractNetworks = (chainId: number): any | undefined => {
  // For Polygon Amoy Testnet (80002), let the SDK use its default addresses
  // This ensures we use the correct, officially deployed Safe contracts
  if (chainId === 80002) return undefined;

  const contracts = SAFE_CONTRACTS_MAP[chainId];
  if (!contracts) return undefined;

  return {
    [chainId]: {
      safeProxyFactoryAddress: contracts.safeProxyFactoryAddress,
      // SDK expects these keys for singletons
      safeSingletonAddress: contracts.safeSingletonAddress,
      safeSingletonL2Address: contracts.safeSingletonL2Address,
      multiSendAddress: contracts.multiSendAddress,
      multiSendCallOnlyAddress: contracts.multiSendCallOnlyAddress,
      fallbackHandlerAddress: contracts.fallbackHandlerAddress,
      tokenCallbackHandlerAddress: contracts.tokenCallbackHandlerAddress,
      signMessageLibAddress: contracts.signMessageLibAddress,
      createCallAddress: contracts.createCallAddress,
      simulateTxAccessorAddress: contracts.simulateTxAccessorAddress,
    },
  };
};
