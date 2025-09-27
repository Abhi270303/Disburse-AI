/**
 * @fileoverview Gas Sponsorship for UTXO Transactions
 * @description Handles gas sponsorship for UTXO-based transactions
 * @author Unwallet Team
 * @version 1.0.0
 */

/**
 * @title Execute Transaction with Gas Sponsorship
 * @description Executes UTXO transactions with gas sponsorship
 * @param {Array} multicallData - Array of transaction calls for multicall
 * @param {Object} metadata - Additional metadata for the transaction
 * @param {string} backendUrl - Backend URL for gas sponsorship
 * @param {string} username - Username for API authentication
 * @returns {Object} Transaction execution result with sponsorship details
 * 
 * @dev This function handles gas sponsorship for UTXO transactions
 * @dev Sends multicall data to backend for sponsored execution
 * @dev Returns comprehensive transaction details and sponsorship info
 * 
 * @example
 * const result = await executeTransactionWithGasSponsorship(
 *   multicallData,
 *   { operationType: "utxo_redemption" },
 *   "https://backend.url",
 *   "agent1"
 * );
 * 
 * @notice Gas sponsorship reduces user friction by covering transaction costs
 * @notice Backend must be configured to handle gas sponsorship requests
 */
export const executeTransactionWithGasSponsorship = async (
  multicallData,
  metadata = {},
  backendUrl = "https://unwall-production.up.railway.app",
  username = "agent1"
) => {
  try {
    console.log("🌟 Requesting gas sponsorship for transaction...");
    console.log("📋 Multicall data:", {
      numberOfCalls: multicallData.length,
      calls: multicallData.map((call, index) => ({
        index: index + 1,
        target: call.target,
        allowFailure: call.allowFailure,
        dataLength: call.callData.length,
      })),
    });

    // Make request to gas sponsorship endpoint
    const response = await fetch(
      `${backendUrl}/api/user/${username}/gas-sponsorship`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          multicallData,
          metadata: {
            ...metadata,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            requestId: `${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          },
        }),
      }
    );

    const result = await response.json();
    console.log("📄 Backend response:", result);

    if (!response.ok) {
      throw new Error(
        result.message || result.error || "Gas sponsorship request failed"
      );
    }

    if (!result.success) {
      throw new Error(
        result.message || "Gas sponsorship service returned failure"
      );
    }

    console.log("✅ Gas sponsored transaction completed successfully!");
    console.log("📊 Transaction details:", result);

    // Handle the backend response structure
    const txHash = result.data?.transactionHash || "pending";
    const explorerUrl =
      result.data?.executionDetails?.explorerUrl ||
      `${currentNetwork?.blockExplorer.url}/tx/${txHash}`;

    return {
      success: true,
      txHash: txHash,
      blockNumber: result.data?.blockNumber || 0,
      gasUsed: result.data?.gasUsed || "N/A",
      gasCost: result.data?.gasCost || "N/A",
      explorerUrl: explorerUrl,
      receipt: {
        status: "success",
        transactionHash: txHash,
        blockNumber: BigInt(result.data?.blockNumber || 0),
        gasUsed: BigInt(result.data?.gasUsed || 0),
      },
      sponsorDetails: {
        sponsorAddress: result.data?.sponsorAddress || "Unknown",
        chainName:
          result.data?.executionDetails?.chainName || currentNetwork?.name,
      },
    };
  } catch (error) {
    console.error("❌ Gas sponsorship request failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Gas sponsorship failed: ${errorMessage}`);
  }
};

/**
 * @title Validate Gas Sponsorship Request
 * @description Validates gas sponsorship request before sending
 * @param {Array} multicallData - Array of transaction calls
 * @param {Object} metadata - Transaction metadata
 * @returns {Object} Validation result with recommendations
 * 
 * @dev Validates multicall data and metadata before sponsorship request
 * @dev Checks for common issues and provides recommendations
 * @dev Helps prevent failed sponsorship requests
 * 
 * @example
 * const validation = validateGasSponsorshipRequest(multicallData, metadata);
 * if (!validation.isValid) {
 *   console.log("Validation failed:", validation.errors);
 * }
 * 
 * @notice Proper validation reduces failed sponsorship requests
 */
export const validateGasSponsorshipRequest = (multicallData, metadata = {}) => {
  const errors = [];
  const warnings = [];
  
  // Validate multicall data
  if (!Array.isArray(multicallData)) {
    errors.push("Multicall data must be an array");
  } else if (multicallData.length === 0) {
    errors.push("Multicall data cannot be empty");
  } else if (multicallData.length > 20) {
    warnings.push("Large number of calls may exceed gas limits");
  }
  
  // Validate individual calls
  multicallData.forEach((call, index) => {
    if (!call.target || typeof call.target !== 'string') {
      errors.push(`Call ${index + 1}: Invalid target address`);
    }
    if (!call.callData || typeof call.callData !== 'string') {
      errors.push(`Call ${index + 1}: Invalid call data`);
    }
    if (call.allowFailure === undefined) {
      warnings.push(`Call ${index + 1}: allowFailure not specified, defaulting to false`);
    }
  });
  
  // Validate metadata
  if (metadata.operationType && !['utxo_redemption', 'safe_deployment', 'token_transfer'].includes(metadata.operationType)) {
    warnings.push("Unknown operation type, may affect sponsorship priority");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations: warnings.map(w => `Consider: ${w}`)
  };
};

/**
 * @title Estimate Gas Sponsorship Cost
 * @description Estimates the cost of gas sponsorship for a transaction
 * @param {Array} multicallData - Array of transaction calls
 * @param {Object} options - Estimation options
 * @returns {Object} Gas cost estimation
 * 
 * @dev Estimates gas costs for sponsorship planning
 * @dev Uses heuristics based on call complexity
 * @dev Provides cost ranges for budgeting
 * 
 * @example
 * const estimation = estimateGasSponsorshipCost(multicallData, {
 *   gasPrice: 20000000000, // 20 gwei
 *   safetyMargin: 1.2
 * });
 * 
 * @notice Estimates are approximate and actual costs may vary
 */
export const estimateGasSponsorshipCost = (multicallData, options = {}) => {
  const {
    gasPrice = 20000000000, // 20 gwei default
    safetyMargin = 1.2,
    baseGasPerCall = 21000,
    gasPerByte = 16
  } = options;
  
  let totalGas = 0;
  let totalDataSize = 0;
  
  // Estimate gas for each call
  multicallData.forEach(call => {
    // Base gas for transaction
    totalGas += baseGasPerCall;
    
    // Gas for data
    const dataSize = call.callData.length / 2 - 1; // Remove 0x prefix
    totalGas += dataSize * gasPerByte;
    totalDataSize += dataSize;
  });
  
  // Add multicall overhead
  totalGas += 50000; // Estimated multicall overhead
  
  // Apply safety margin
  const estimatedGas = Math.ceil(totalGas * safetyMargin);
  const estimatedCost = estimatedGas * gasPrice;
  
  return {
    estimatedGas,
    estimatedCost,
    gasPrice,
    totalDataSize,
    numberOfCalls: multicallData.length,
    safetyMargin,
    costInEth: estimatedCost / 1e18,
    costInGwei: estimatedCost / 1e9
  };
};

/**
 * @title Gas Sponsorship Configuration
 * @description Configuration for gas sponsorship service
 * @param {Object} config - Configuration options
 * @returns {Object} Configuration object
 * 
 * @dev Centralizes gas sponsorship configuration
 * @dev Provides defaults and validation
 * @dev Enables easy configuration management
 * 
 * @example
 * const config = createGasSponsorshipConfig({
 *   backendUrl: "https://custom.backend.url",
 *   maxGasLimit: 5000000,
 *   retryAttempts: 3
 * });
 * 
 * @notice Configuration should be validated before use
 */
export const createGasSponsorshipConfig = (config = {}) => {
  const defaultConfig = {
    backendUrl: "https://unwall-production.up.railway.app",
    username: "agent1",
    maxGasLimit: 5000000,
    retryAttempts: 3,
    timeout: 30000,
    maxCallsPerRequest: 20,
    supportedOperations: ['utxo_redemption', 'safe_deployment', 'token_transfer']
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Validate configuration
  const validation = validateGasSponsorshipConfig(finalConfig);
  if (!validation.isValid) {
    throw new Error(`Invalid gas sponsorship config: ${validation.errors.join(', ')}`);
  }
  
  return finalConfig;
};

/**
 * @title Validate Gas Sponsorship Configuration
 * @description Validates gas sponsorship configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 * 
 * @dev Validates configuration parameters
 * @dev Ensures configuration is safe and reasonable
 * @dev Prevents configuration-related errors
 */
const validateGasSponsorshipConfig = (config) => {
  const errors = [];
  
  if (!config.backendUrl || !config.backendUrl.startsWith('http')) {
    errors.push("Invalid backend URL");
  }
  
  if (!config.username || typeof config.username !== 'string') {
    errors.push("Invalid username");
  }
  
  if (config.maxGasLimit < 21000 || config.maxGasLimit > 30000000) {
    errors.push("Max gas limit must be between 21,000 and 30,000,000");
  }
  
  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    errors.push("Retry attempts must be between 0 and 10");
  }
  
  if (config.timeout < 5000 || config.timeout > 120000) {
    errors.push("Timeout must be between 5,000 and 120,000 ms");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
