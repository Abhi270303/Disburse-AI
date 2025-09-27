/**
 * @fileoverview Multicall3 helper for batch balance reads
 */

import { encodeFunctionData, decodeFunctionResult } from "viem";

export const MultiCall3_ContractAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const MultiCall3_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "target",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "allowFailure",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "callData",
            "type": "bytes"
          }
        ],
        "internalType": "struct Multicall3.Call3[]",
        "name": "calls",
        "type": "tuple[]"
      }
    ],
    "name": "aggregate3",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "returnData",
            "type": "bytes"
          }
        ],
        "internalType": "struct Multicall3.Result[]",
        "name": "returnData",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];

/**
 * Creates batch balance calls for multiple addresses
 * @param {Array} addresses - Array of addresses to check balance for
 * @param {string} tokenAddress - Token contract address
 * @param {Array} abi - Token ABI (should include balanceOf function)
 * @returns {Array} Array of multicall calls
 */
export function createBatchBalanceCalls(addresses, tokenAddress, abi) {
  return addresses.map(address => ({
    target: tokenAddress,
    allowFailure: true,
    callData: encodeFunctionData({
      abi: abi,
      functionName: "balanceOf",
      args: [address],
    }),
  }));
}

/**
 * Creates batch Safe nonce calls for multiple addresses
 * @param {Array} addresses - Array of Safe addresses to check nonce for
 * @param {Array} abi - Safe ABI (should include nonce function)
 * @returns {Array} Array of multicall calls
 */
export function createBatchNonceCalls(addresses, abi) {
  return addresses.map(address => ({
    target: address,
    allowFailure: true,
    callData: encodeFunctionData({
      abi: abi,
      functionName: "nonce",
      args: [],
    }),
  }));
}

/**
 * Creates batch contract existence calls for multiple addresses
 * @param {Array} addresses - Array of addresses to check if contracts exist
 * @returns {Array} Array of multicall calls
 */
export function createBatchContractExistenceCalls(addresses) {
  return addresses.map(address => ({
    target: address,
    allowFailure: true,
    callData: "0x", // Empty call to check if contract exists
  }));
}

/**
 * Executes multicall3 batch request
 * @param {Object} publicClient - Viem public client
 * @param {Array} calls - Array of multicall calls
 * @returns {Array} Array of results
 */
export async function executeMulticall3(publicClient, calls) {
  const multicallData = encodeFunctionData({
    abi: MultiCall3_ABI,
    functionName: "aggregate3",
    args: [calls],
  });

  const result = await publicClient.call({
    to: MultiCall3_ContractAddress,
    data: multicallData,
  });

  // Decode the multicall result
  const decodedResult = decodeFunctionResult({
    abi: MultiCall3_ABI,
    functionName: "aggregate3",
    data: result.data,
  });

  return decodedResult;
}

/**
 * Decodes balance results from multicall
 * @param {Array} results - Array of multicall results
 * @param {Array} abi - Token ABI for decoding
 * @returns {Array} Array of decoded balances
 */
export function decodeBalanceResults(results, abi) {
  return results.map((result, index) => {
    if (!result.success) {
      console.log(`❌ Balance call ${index} failed`);
      return { success: false, balance: 0n };
    }

    try {
      const decoded = decodeFunctionResult({
        abi: abi,
        functionName: "balanceOf",
        data: result.returnData,
      });
      return { success: true, balance: decoded };
    } catch (error) {
      console.log(`❌ Failed to decode balance result ${index}:`, error);
      return { success: false, balance: 0n };
    }
  });
}

/**
 * Decodes nonce results from multicall
 * @param {Array} results - Array of multicall results
 * @param {Array} abi - Safe ABI for decoding
 * @returns {Array} Array of decoded nonces
 */
export function decodeNonceResults(results, abi) {
  return results.map((result, index) => {
    if (!result.success) {
      console.log(`❌ Nonce call ${index} failed - Safe might not be deployed`);
      return { success: false, nonce: 0n };
    }

    try {
      // Check if returnData is empty (0x) - indicates Safe not deployed
      if (result.returnData === "0x" || result.returnData === "0x0") {
        console.log(`❌ Nonce call ${index} returned empty data - Safe not deployed`);
        return { success: false, nonce: 0n };
      }

      const decoded = decodeFunctionResult({
        abi: abi,
        functionName: "nonce",
        data: result.returnData,
      });
      return { success: true, nonce: decoded };
    } catch (error) {
      console.log(`❌ Failed to decode nonce result ${index}:`, error);
      return { success: false, nonce: 0n };
    }
  });
}

/**
 * Decodes contract existence results from multicall
 * @param {Array} results - Array of multicall results
 * @returns {Array} Array of contract existence statuses
 */
export function decodeContractExistenceResults(results) {
  return results.map((result, index) => {
    // If call succeeds, contract exists/is deployed
    // If call fails with "execution reverted", contract doesn't exist/is not deployed
    return { 
      success: result.success, 
      isDeployed: result.success 
    };
  });
}
