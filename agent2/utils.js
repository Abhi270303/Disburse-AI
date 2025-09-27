import { privateKeyToAccount } from "viem/accounts";
import {
  generateEphemeralPrivateKey,
  extractViewingPrivateKeyNode,
  generateKeysFromSignature,
  generateStealthPrivateKey,
} from "@fluidkey/stealth-account-kit";

import { defineChain } from "viem";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseUnits,
} from "viem";

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
import { getContractNetworks } from "./safe/safe-contracts.js";
import {
  buildSafeTransaction,
  predictSafeAddress,
  SAFE_ABI,
  USDC_ABI,
  safeSignTypedData,
} from "./safe/safe-utils.js";
import {
  createBatchBalanceCalls,
  createBatchContractExistenceCalls,
  executeMulticall3,
  decodeBalanceResults,
  decodeContractExistenceResults,
} from "./helpers/multicall3.js";
import Safe from "@safe-global/protocol-kit";
import dotenv from "dotenv";
dotenv.config();

const BACKEND_URL = "http://localhost:3000";

const recipientAddress = "0xc6377415Ee98A7b71161Ee963603eE52fF7750FC";
const username = process.env.AGENT_USERNAME || "agent2";

// Function to fetch balance data from API with Multicall3 optimization
export const fetchBalanceData = async () => {
  try {
    console.log("📡 Fetching balance data from API...");
    console.log("🔗 URL:", `${BACKEND_URL}/api/user/${username}/funding-stats`);
    
    const response = await fetch(
      `${BACKEND_URL}/api/user/${username}/funding-stats`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📄 Raw API response structure:", {
      success: data.success,
      hasData: !!data.data,
      hasFundedAddresses: !!(data.data && data.data.fundedAddresses),
      fundedAddressesCount: data.data?.fundedAddresses?.length || 0
    });
    
    // Extract funded addresses from the response
    if (!data.success || !data.data || !data.data.fundedAddresses) {
      throw new Error("API response does not contain funded addresses");
    }
    
    const fundedAddresses = data.data.fundedAddresses;
    
    console.log("🔍 Checking actual USDC balance for all Safes using Multicall3...");
    
    // Extract Safe addresses for batch balance check
    const safeAddresses = fundedAddresses.map(item => item.safeAddress);
    console.log(`📊 Checking balance for ${safeAddresses.length} Safes in batch`);
    
    // Create batch balance calls
    const balanceCalls = createBatchBalanceCalls(safeAddresses, "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", USDC_ABI);
    
    // Execute multicall for balances
    const balanceResults = await executeMulticall3(publicClient, balanceCalls);
    const decodedBalances = decodeBalanceResults(balanceResults, USDC_ABI);
    
    // Create batch contract existence calls
    const contractExistenceCalls = createBatchContractExistenceCalls(safeAddresses);
    
    // Execute multicall for contract existence status
    const contractExistenceResults = await executeMulticall3(publicClient, contractExistenceCalls);
    const decodedContractExistence = decodeContractExistenceResults(contractExistenceResults);
    
    // Combine results and filter out zero balances
    const balanceDataWithActualBalance = [];
    
    for (let i = 0; i < fundedAddresses.length; i++) {
      const item = fundedAddresses[i];
      const balanceResult = decodedBalances[i];
      const contractExistenceResult = decodedContractExistence[i];
      
      if (balanceResult.success) {
        const actualBalance = balanceResult.balance;
        const actualBalanceFormatted = Number(actualBalance) / Math.pow(10, 6); // USDC has 6 decimals
        
        console.log(`💰 Safe ${item.safeAddress} has ${actualBalanceFormatted} USDC (deployed: ${contractExistenceResult.isDeployed})`);
        
        // Only include Safes with positive balance
        if (actualBalance > 0) {
          balanceDataWithActualBalance.push({
            address: item.fromAddress,
            balance: actualBalanceFormatted,
            symbol: "USDC",
            rawBalance: actualBalance.toString(),
            nonce: item.nonce,
            decimals: 6,
            tokenAddress: item.tokenAddress,
            transactionHash: item.transactionHash,
            stealthAddress: item.stealthAddress,
            safeAddress: item.safeAddress,
            isFunded: true,
            isDeployed: contractExistenceResult.isDeployed,
            id: item.id,
            chainId: item.chainId,
            chainName: item.chainName,
            generatedAt: item.generatedAt,
            lastCheckedAt: item.lastCheckedAt
          });
        } else {
          console.log(`❌ Safe ${item.safeAddress} has zero balance, skipping`);
        }
      } else {
        console.log(`❌ Failed to get balance for Safe ${item.safeAddress}`);
      }
    }

    console.log("✅ Balance data fetched and filtered successfully:", {
      totalSafes: fundedAddresses.length,
      safesWithBalance: balanceDataWithActualBalance.length,
      safesWithZeroBalance: fundedAddresses.length - balanceDataWithActualBalance.length,
      firstItem: balanceDataWithActualBalance[0] ? { 
        nonce: balanceDataWithActualBalance[0].nonce, 
        balance: balanceDataWithActualBalance[0].balance, 
        symbol: balanceDataWithActualBalance[0].symbol,
        stealthAddress: balanceDataWithActualBalance[0].stealthAddress,
        safeAddress: balanceDataWithActualBalance[0].safeAddress
      } : null
    });

    return balanceDataWithActualBalance;
  } catch (error) {
    console.error("❌ Failed to fetch balance data:", error);
    throw error;
  }
};

const privateKey = process.env.AGENT_PRIVATE_KEY;

export const account = privateKeyToAccount(privateKey);
export const walletClient = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http(polygonAmoy.rpcUrls.default.http[0]),
});
export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(polygonAmoy.rpcUrls.default.http[0]),
});

const STEALTH_ADDRESS_GENERATION_MESSAGE =
  "STEALTH_ADDRESS_GENERATION_ZZZZZ_POLYGON_AMOY";

export const generateInitialKeysOnClient = async (uniqueNonces) => {
  // STEP 1: Create a deterministic message for signing
  const message = STEALTH_ADDRESS_GENERATION_MESSAGE;

  const signature = await walletClient.signMessage({ message });

  const keys = generateKeysFromSignature(signature);

  // STEP 5: Extract the viewing key node (used for address generation)
  const viewKeyNodeNumber = 0; // Use the first node
  const viewingPrivateKeyNode = extractViewingPrivateKeyNode(
    keys.viewingPrivateKey,
    viewKeyNodeNumber
  );

  const processedKeys = uniqueNonces.map((nonce) => {
    const ephemeralPrivateKey = generateEphemeralPrivateKey({
      viewingPrivateKeyNode: viewingPrivateKeyNode,
      nonce: BigInt(nonce.toString()), // convert to bigint
      chainId: polygonAmoy.id,
    });

    const ephemeralPrivateKeyRaw =
      ephemeralPrivateKey.ephemeralPrivateKey || ephemeralPrivateKey;

    let ephemeralPrivateKeyHex;
    if (
      (typeof ephemeralPrivateKeyRaw === "object" &&
        "byteLength" in ephemeralPrivateKeyRaw) ||
      (typeof Buffer !== "undefined" && Buffer.isBuffer(ephemeralPrivateKeyRaw))
    ) {
      ephemeralPrivateKeyHex = Array.from(ephemeralPrivateKeyRaw)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } else if (typeof ephemeralPrivateKeyRaw === "string") {
      ephemeralPrivateKeyHex = ephemeralPrivateKeyRaw.replace("0x", ""); // Remove 0x if present
    } else {
      // Handle other possible formats
      ephemeralPrivateKeyHex = String(ephemeralPrivateKeyRaw);
    }

    // Ensure it's in the correct format (0x prefixed hex string)
    const formattedEphemeralPrivateKey = `0x${ephemeralPrivateKeyHex}`;
    // Generate the ephemeral public key
    const ephemeralPublicKey = privateKeyToAccount(
      formattedEphemeralPrivateKey
    ).publicKey;

    // Generate the stealth private key
    const stealthPrivateKey = generateStealthPrivateKey({
      ephemeralPrivateKey: formattedEphemeralPrivateKey,
      viewingPrivateKey: keys.viewingPrivateKey,
      spendingPrivateKey: keys.spendingPrivateKey,
    });

    return {
      nonce: nonce,
      ephemeralPrivateKey: formattedEphemeralPrivateKey,
      ephemeralPublicKey: ephemeralPublicKey,
      stealthPrivateKey: stealthPrivateKey,
    };
  });

  return processedKeys.map((key) => key.stealthPrivateKey);
};
