import { createPublicClient, http } from "viem";
import Safe from "@safe-global/protocol-kit";

import { getContractNetworks } from "./safe-contracts.js";
import { defineChain } from "viem";

// Define Polygon Amoy testnet
const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Polygon',
    symbol: 'POL',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology/'],
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

// Helper function to build Safe transaction
export const buildSafeTransaction = (txData) => {
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
  walletClient,
  account,
  safeAddress,
  safeTx,
  chainId
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
  stealthAddress,
  rpcUrl = "https://rpc-amoy.polygon.technology/"
) {
  try {
    console.log(
      "🔍 Predicting Safe address using Protocol Kit for:",
      stealthAddress
    );

    // Use Safe Protocol Kit's built-in prediction with custom contract addresses for Polygon Amoy
    const predictedSafe = {
      safeAccountConfig: {
        owners: [stealthAddress],
        threshold: 1,
      },
      safeDeploymentConfig: {
        saltNonce: "0",
      },
    };

    // Get custom contract networks configuration for Polygon Amoy
    const contractNetworks = getContractNetworks(polygonAmoy.id);

    // Safe Protocol Kit with custom contract addresses for Polygon Amoy
    const protocolKit = await Safe.init({
      provider: rpcUrl,
      predictedSafe,
      contractNetworks,
    });

    const predictedAddress = await protocolKit.getAddress();
    console.log("✅ Safe address predicted successfully:", predictedAddress);

    return predictedAddress;
  } catch (error) {
    console.error("❌ Error predicting safe address:", error);
    throw error;
  }
}

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
  {
    inputs: [],
    name: "nonce",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
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
