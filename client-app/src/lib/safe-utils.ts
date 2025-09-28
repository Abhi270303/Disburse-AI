import { createPublicClient, http } from "viem";
import Safe from "@safe-global/protocol-kit";
import { CHAIN_IDS, RPC_CONFIG } from "./constants";
import { getContractNetworks } from "./safe-contracts";

// Create public client for reading blockchain data with retry configuration
export const publicClient = createPublicClient({
  chain: {
    id: CHAIN_IDS.POLYGON_AMOY_TESTNET,
    name: "Polygon Amoy Testnet",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: { default: { http: [RPC_CONFIG.POLYGON_AMOY_TESTNET.primary] } },
    testnet: true,
  },
  transport: http(RPC_CONFIG.POLYGON_AMOY_TESTNET.primary, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
  }),
});

// Helper function to build Safe transaction
export const buildSafeTransaction = (txData: {
  to: string;
  value?: string;
  data?: string;
  operation?: number;
  safeTxGas?: string;
  baseGas?: string;
  gasPrice?: string;
  gasToken?: string;
  refundReceiver?: string;
  nonce?: number;
}) => {
  return {
    to: txData.to,
    value: txData.value || "0",
    data: txData.data || "0x",
    operation: txData.operation || 0,
    safeTxGas: txData.safeTxGas || "0",
    baseGas: txData.baseGas || "0",
    gasPrice: txData.gasPrice || "0",
    gasToken: txData.gasToken || "0x0000000000000000000000000000000000000000",
    refundReceiver:
      txData.refundReceiver || "0x0000000000000000000000000000000000000000",
    nonce: txData.nonce || 0,
  };
};

// Helper function to sign typed data
export const safeSignTypedData = async (
  walletClient: {
    signTypedData: (params: {
      account: { address: string };
      domain: { chainId: number; verifyingContract: string };
      types: Record<string, Array<{ type: string; name: string }>>;
      primaryType: string;
      message: Record<string, string | number>;
    }) => Promise<string>;
  },
  account: { address: string },
  safeAddress: string,
  safeTx: {
    to: string;
    value: string;
    data: string;
    operation: number;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
  },
  chainId: number = CHAIN_IDS.POLYGON_AMOY_TESTNET
) => {
  const domain = {
    chainId: chainId,
    verifyingContract: safeAddress,
  };

  const types = {
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };

  const message = {
    to: safeTx.to,
    value: safeTx.value.toString(),
    data: safeTx.data,
    operation: safeTx.operation,
    safeTxGas: safeTx.safeTxGas.toString(),
    baseGas: safeTx.baseGas.toString(),
    gasPrice: safeTx.gasPrice.toString(),
    gasToken: safeTx.gasToken,
    refundReceiver: safeTx.refundReceiver,
    nonce: Number(safeTx.nonce),
  };

  return await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "SafeTx",
    message,
  });
};

// Predict safe address based on stealth address
export async function predictSafeAddress(
  stealthAddress: string,
  rpcUrl?: string
) {
  // Use centralized RPC configuration with QuickNode as primary
  const rpcEndpoints = rpcUrl
    ? [rpcUrl, ...RPC_CONFIG.POLYGON_AMOY_TESTNET.fallbacks]
    : [RPC_CONFIG.POLYGON_AMOY_TESTNET.primary, ...RPC_CONFIG.POLYGON_AMOY_TESTNET.fallbacks];

  try {
    console.log(
      "🔍 Predicting Safe address using Protocol Kit for:",
      stealthAddress
    );

    // Use Safe Protocol Kit's built-in prediction with custom contract addresses for Polygon Amoy Testnet
    const predictedSafe = {
      safeAccountConfig: {
        owners: [stealthAddress],
        threshold: 1,
      },
      safeDeploymentConfig: {
        saltNonce: "0",
      },
    };

    // Get custom contract networks configuration for Polygon Amoy Testnet
    const contractNetworks = getContractNetworks(CHAIN_IDS.POLYGON_AMOY_TESTNET);

    console.log(
      "🔧 Using contract networks for Polygon Amoy Testnet:",
      contractNetworks || "SDK defaults"
    );

    // Try multiple RPC endpoints
    for (let i = 0; i < rpcEndpoints.length; i++) {
      const currentRpcUrl = rpcEndpoints[i];
      console.log(
        `🔄 Trying RPC endpoint ${i + 1}/${
          rpcEndpoints.length
        }: ${currentRpcUrl}`
      );

      try {
        // Try with custom contract networks first (if available)
        try {
          const initConfig: {
            provider: string;
            predictedSafe: {
              safeAccountConfig: {
                owners: string[];
                threshold: number;
              };
              safeDeploymentConfig: {
                saltNonce: string;
              };
            };
            contractNetworks?: Record<number, Record<string, string>>;
          } = {
            provider: currentRpcUrl,
            predictedSafe,
          };
          
          if (contractNetworks) {
            initConfig.contractNetworks = contractNetworks;
          }
          
          const protocolKit = await Safe.init(initConfig);

          const predictedAddress = await protocolKit.getAddress();
          console.log(
            `✅ Safe address predicted successfully with RPC ${i + 1}:`,
            predictedAddress
          );
          return predictedAddress;
        } catch (contractError) {
          console.warn(
            `⚠️ Failed with custom contract networks on RPC ${
              i + 1
            }, trying without:`,
            contractError
          );

          // Fallback: Try without custom contract networks (let SDK use defaults)
          const protocolKit = await Safe.init({
            provider: currentRpcUrl,
            predictedSafe,
            // Don't pass contractNetworks - let SDK use its defaults
          });

          const predictedAddress = await protocolKit.getAddress();
          console.log(
            `✅ Safe address predicted successfully (fallback) with RPC ${
              i + 1
            }:`,
            predictedAddress
          );
          return predictedAddress;
        }
      } catch (rpcError) {
        console.warn(`❌ RPC endpoint ${i + 1} failed:`, rpcError);
        if (i === rpcEndpoints.length - 1) {
          // This was the last RPC endpoint, throw the error
          throw rpcError;
        }
        // Continue to next RPC endpoint
        continue;
      }
    }
  } catch (error) {
    console.error("❌ Error predicting safe address:", error);

    // Final fallback: Re-throw the original error
    console.log("🔄 Safe address prediction failed, re-throwing original error...");
    throw new Error(
      `Safe address prediction failed. Please check RPC connectivity and contract addresses. Original error: ${error}`
    );
  }
}
