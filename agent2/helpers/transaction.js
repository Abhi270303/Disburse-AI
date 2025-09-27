/**
 * @fileoverview Transaction preparation and execution helper functions
 */

import { generateInitialKeysOnClient } from '../utils.js';
import {
  predictSafeAddress,
  buildSafeTransaction,
  safeSignTypedData,
  SAFE_ABI
} from '../safe/safe-utils.js';
import {
  encodeFunctionData,
  parseUnits,
  createWalletClient,
  http,
  createPublicClient
} from 'viem';
import { executeTransactionWithGasSponsorship } from '../utxo/index.js';

/**
 * Prepares transaction data for all selected UTXOs
 * @param {Object} utxoSelection - UTXO selection result
 * @param {string} toAddress - Recipient address
 * @param {string} targetTokenAddress - Token address to transfer
 * @returns {Array} Multicall data array
 */
export async function prepareTransactionData(utxoSelection, toAddress, targetTokenAddress, amount) {
  console.log("🔧 Preparing transaction data...");
  
  const { defineChain } = await import("viem");
  
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
  const { privateKeyToAccount } = await import("viem/accounts");
  const { getContractNetworks } = await import("../safe/safe-contracts.js");
  const Safe = await import("@safe-global/protocol-kit");
  
  const multicallData = [];
  const allNonces = utxoSelection.selectedUTXOs.map(utxo => utxo.nonce);
  const allKeys = await generateInitialKeysOnClient(allNonces);
  
  console.log(`🔐 Generated ${allKeys.length} stealth keys for UTXOs`);
  
  for (let i = 0; i < utxoSelection.selectedUTXOs.length; i++) {
    const utxo = utxoSelection.selectedUTXOs[i];
    const spendingPrivateKey = allKeys[i];
    const stealthAddress = privateKeyToAccount(spendingPrivateKey).address;
    
    console.log(`🔍 Processing UTXO ${i + 1}/${utxoSelection.selectedUTXOs.length}:`);
    console.log(`   - Nonce: ${utxo.nonce}`);
    console.log(`   - Stealth Address: ${stealthAddress}`);
    console.log(`   - Safe Address: ${utxo.safeAddress}`);
    
         const { deploymentTx, transferTx } = await prepareUTXOTransaction(
       utxo, spendingPrivateKey, stealthAddress, toAddress, targetTokenAddress, amount,
       polygonAmoy, getContractNetworks, Safe, privateKeyToAccount
     );
    
    if (deploymentTx) {
      multicallData.push(deploymentTx);
      console.log(`   - Added deployment for UTXO ${i + 1}: ${utxo.safeAddress}`);
    }
    
    multicallData.push(transferTx);
    console.log(`   - Added transfer for UTXO ${i + 1}: ${amount} USDC`);
  }
  
  return multicallData;
}

/**
 * Prepares transaction data for a single UTXO
 * @param {Object} utxo - UTXO data
 * @param {string} spendingPrivateKey - Private key for spending
 * @param {string} stealthAddress - Stealth address
 * @param {string} toAddress - Recipient address
 * @param {string} targetTokenAddress - Token address
 * @param {number} amount - Amount to send (not the full UTXO balance)
 * @param {Object} polygonAmoy - Polygon Amoy testnet chain config
 * @param {Function} getContractNetworks - Contract networks function
 * @param {Object} Safe - Safe protocol kit
 * @param {Function} privateKeyToAccount - Private key to account function
 * @returns {Object} Deployment and transfer transaction data
 */
export async function prepareUTXOTransaction(utxo, spendingPrivateKey, stealthAddress, toAddress, targetTokenAddress, amount, polygonAmoy, getContractNetworks, Safe, privateKeyToAccount) {
  const predictedSafeAddress = await predictSafeAddress(
    stealthAddress,
    polygonAmoy.rpcUrls.default.http[0]
  );
  
  const predictedSafe = {
    safeAccountConfig: {
      owners: [stealthAddress],
      threshold: 1,
    },
    safeDeploymentConfig: {
      saltNonce: "0",
    },
  };

  const RPC_URL = polygonAmoy.rpcUrls.default.http[0];
  const contractNetworks = getContractNetworks(polygonAmoy.id);

  const protocolKit = await Safe.default.init({
    provider: RPC_URL,
    signer: stealthAddress,
    predictedSafe,
    contractNetworks,
  });

  // Check if Safe is deployed
  let isSafeDeployed = false;
  let deploymentTransaction = null;
  let safeNonce = 0;
  
  try {
    isSafeDeployed = await protocolKit.isSafeDeployed();
  } catch (error) {
    console.log(`   - Safe not deployed yet, will create deployment transaction`);
    isSafeDeployed = false;
  }

  if (isSafeDeployed) {
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL),
    });
    
    safeNonce = await publicClient.readContract({
      address: predictedSafeAddress,
      abi: SAFE_ABI,
      functionName: "nonce",
    });
    console.log(`   - Safe nonce: ${safeNonce}`);
  }
  
  if (!isSafeDeployed) {
    try {
      deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();
      console.log(`   - ✅ Safe deployment transaction created`);
    } catch (error) {
      console.error(`   - ❌ Failed to create Safe deployment transaction:`, error);
      throw error;
    }
  } else {
    console.log(`   - ℹ️ Safe is already deployed, skipping deployment`);
  }
  
  // Create USDC transfer transaction
  const spendingWalletClient = createWalletClient({
    account: privateKeyToAccount(spendingPrivateKey),
    chain: polygonAmoy,
    transport: http(RPC_URL),
  });
  
  // Encode USDC transfer function data
  const transferData = encodeFunctionData({
    abi: [
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
    ],
    functionName: "transfer",
    args: [
      toAddress,
      parseUnits(amount.toString(), 6), // USDC has 6 decimals - send only requested amount
    ],
  });

  // Build Safe transaction
  const safeTransaction = buildSafeTransaction({
    to: targetTokenAddress,
    value: "0",
    data: transferData,
    operation: 0,
    safeTxGas: "0",
    nonce: safeNonce,
  });

  // Sign the Safe transaction
  const account = privateKeyToAccount(spendingPrivateKey);
  const signature = await safeSignTypedData(
    spendingWalletClient,
    account,
    predictedSafeAddress,
    safeTransaction,
    polygonAmoy.id
  );

  console.log(`   - ✅ Safe transaction signed successfully`);

  // Encode execTransaction call
  const execTransactionData = encodeFunctionData({
    abi: SAFE_ABI,
    functionName: "execTransaction",
    args: [
      safeTransaction.to,
      BigInt(safeTransaction.value || "0"),
      safeTransaction.data,
      safeTransaction.operation,
      BigInt(safeTransaction.safeTxGas || "0"),
      BigInt(safeTransaction.baseGas || "0"),
      BigInt(safeTransaction.gasPrice || "0"),
      safeTransaction.gasToken ||
        "0x0000000000000000000000000000000000000000",
      safeTransaction.refundReceiver ||
        "0x0000000000000000000000000000000000000000",
      signature,
    ],
  });

  const deploymentTx = !isSafeDeployed && deploymentTransaction ? {
    target: deploymentTransaction.to,
    allowFailure: false,
    callData: deploymentTransaction.data,
  } : null;

  const transferTx = {
    target: predictedSafeAddress,
    allowFailure: false,
    callData: execTransactionData,
  };

  return { deploymentTx, transferTx };
}

/**
 * Executes payment transaction with gas sponsorship
 * @param {Array} multicallData - Multicall transaction data
 * @param {Object} utxoSelection - UTXO selection result
 * @param {string} toAddress - Recipient address
 * @param {number} amount - Amount to send
 * @param {string} targetTokenAddress - Token address
 * @param {string} agentQueryUrl - Agent query URL
 * @param {string} agentUsername - Agent username
 * @returns {Object} Sponsorship result
 */
export async function executePayment(multicallData, utxoSelection, toAddress, amount, targetTokenAddress, agentQueryUrl, agentUsername) {
  console.log("🚀 Executing transaction with gas sponsorship...");
  
  const sponsorshipResult = await executeTransactionWithGasSponsorship(
    multicallData,
    {
      operationType: "payment",
      toAddress: toAddress,
      amount: amount,
      tokenAddress: targetTokenAddress,
      utxoCount: utxoSelection.selectedUTXOs.length,
      strategy: utxoSelection.strategy
    },
    agentQueryUrl,
    agentUsername
  );
  
  console.log("✅ Payment completed successfully!");
  return sponsorshipResult;
}
