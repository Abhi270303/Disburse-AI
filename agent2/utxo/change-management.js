/**
 * @fileoverview UTXO Change Management
 * @description Handles change creation and management in UTXO-based transactions
 * @author Unwallet Team
 * @version 1.0.0
 */

/**
 * @title Handle UTXO Change
 * @description Manages change creation for UTXO transactions
 * @param {Object} utxoSelection - UTXO selection result from optimization
 * @param {string} recipientAddress - Primary recipient address
 * @param {string} agentAddress - Agent address for change (fallback)
 * @returns {Object|null} Change information or null if no change
 * 
 * @dev This function handles the creation of new UTXOs for change amounts
 * @dev In a full implementation, this would create new stealth addresses
 * @dev Currently sends change back to agent address as a simplified approach
 * 
 * @example
 * const changeInfo = handleUTXOChange(utxoSelection, "0xRecipient", "0xAgent");
 * if (changeInfo) {
 *   console.log(`Change: ${changeInfo.amount} to ${changeInfo.recipient}`);
 * }
 * 
 * @notice Change management is crucial for UTXO models to prevent
 * value loss and maintain proper UTXO structure
 */
export const handleUTXOChange = (utxoSelection, recipientAddress, agentAddress) => {
  const change = utxoSelection.change;
  
  if (change <= 0) {
    console.log("✅ No change to handle");
    return null;
  }
  
  console.log(`💰 Handling change: ${change.toFixed(6)} USDC`);
  
  // Create a new UTXO for the change amount
  // In a real implementation, this would create a new stealth address
  // For now, we'll send change back to the agent address
  const changeRecipient = agentAddress || recipientAddress;
  
  return {
    recipient: changeRecipient,
    amount: change,
    isChange: true,
    timestamp: new Date().toISOString(),
    utxoId: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

/**
 * @title Enhanced UTXO Selection with Change
 * @description Combines UTXO optimization with change management
 * @param {Array} balanceData - Array of UTXO objects
 * @param {number} targetAmount - Target amount to reach
 * @param {string} agentAddress - Agent address for change handling
 * @returns {Object} UTXO selection with change information
 * 
 * @dev This function integrates optimization with change management
 * @dev Ensures that change is properly handled and tracked
 * @dev Returns comprehensive information about the selection and change
 * 
 * @example
 * const result = findOptimalUTXOCombinationWithChange(
 *   balanceData, 
 *   0.0003, 
 *   "0xAgentAddress"
 * );
 * 
 * @notice This is a convenience function that combines optimization
 * and change management in a single call
 */
import { findOptimalUTXOCombination } from './optimization.js';

export const findOptimalUTXOCombinationWithChange = (balanceData, targetAmount, agentAddress) => {
  const utxoSelection = findOptimalUTXOCombination(balanceData, targetAmount);
  
  // Handle change if any
  const changeInfo = handleUTXOChange(utxoSelection, null, agentAddress);
  
  return {
    ...utxoSelection,
    changeInfo
  };
};

/**
 * @title Validate Change Amount
 * @description Validates if change amount is reasonable
 * @param {number} change - Change amount
 * @param {number} targetAmount - Original target amount
 * @param {number} dustThreshold - Minimum dust threshold
 * @returns {Object} Validation result with recommendations
 * 
 * @dev Validates change amounts to prevent dust creation
 * @dev Provides recommendations for change handling
 * @dev Helps maintain UTXO hygiene
 * 
 * @example
 * const validation = validateChangeAmount(0.0001, 0.0003, 0.00001);
 * if (validation.isDust) {
 *   console.log("Change is dust, consider donating or consolidating");
 * }
 * 
 * @notice Dust amounts can bloat the UTXO set and increase costs
 */
export const validateChangeAmount = (change, targetAmount, dustThreshold = 0.00001) => {
  const isDust = change < dustThreshold;
  const isExcessive = change > targetAmount * 0.5;
  const isReasonable = change >= dustThreshold && change <= targetAmount * 0.3;
  
  let recommendation = '';
  if (isDust) {
    recommendation = 'Consider donating dust to reduce UTXO bloat';
  } else if (isExcessive) {
    recommendation = 'Consider using different UTXO combination to reduce change';
  } else if (isReasonable) {
    recommendation = 'Change amount is reasonable';
  }
  
  return {
    isDust,
    isExcessive,
    isReasonable,
    recommendation,
    dustThreshold,
    changePercentage: (change / targetAmount) * 100
  };
};

/**
 * @title Create Change UTXO
 * @description Creates a new UTXO for change amount
 * @param {number} changeAmount - Amount to create as change
 * @param {string} recipientAddress - Address to receive change
 * @param {Object} options - Additional options
 * @returns {Object} Change UTXO information
 * 
 * @dev Creates a new UTXO for the change amount
 * @dev In production, this would create a new stealth address
 * @dev Tracks change UTXO for future reference
 * 
 * @example
 * const changeUTXO = createChangeUTXO(0.0001, "0xAgent", {
 *   tokenAddress: "0xUSDC",
 *   chainId: 1
 * });
 * 
 * @notice Change UTXOs should be tracked for future optimization
 */
export const createChangeUTXO = (changeAmount, recipientAddress, options = {}) => {
  const {
    tokenAddress = null,
    chainId = null,
    timestamp = new Date().toISOString(),
    metadata = {}
  } = options;
  
  const utxoId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: utxoId,
    amount: changeAmount,
    recipient: recipientAddress,
    tokenAddress,
    chainId,
    timestamp,
    isChange: true,
    metadata: {
      ...metadata,
      source: 'utxo_change',
      version: '1.0.0'
    }
  };
};

/**
 * @title Calculate Optimal Change Strategy
 * @description Determines the best strategy for handling change
 * @param {number} change - Change amount
 * @param {number} targetAmount - Original target amount
 * @param {Object} options - Strategy options
 * @returns {Object} Recommended change strategy
 * 
 * @dev Analyzes change amount and recommends optimal handling
 * @dev Considers dust thresholds, fees, and UTXO hygiene
 * @dev Provides actionable recommendations
 * 
 * @example
 * const strategy = calculateOptimalChangeStrategy(0.0001, 0.0003, {
 *   dustThreshold: 0.00001,
 *   feePerUTXO: 0.00002
 * });
 * 
 * @notice Different strategies may be optimal depending on context
 */
export const calculateOptimalChangeStrategy = (change, targetAmount, options = {}) => {
  const {
    dustThreshold = 0.00001,
    feePerUTXO = 0.00002,
    minChangeThreshold = 0.00005
  } = options;
  
  const strategies = [];
  
  // Strategy 1: Create change UTXO
  if (change >= minChangeThreshold) {
    strategies.push({
      type: 'create_change_utxo',
      description: 'Create new UTXO for change amount',
      cost: feePerUTXO,
      benefit: 'Preserves value for future use',
      recommended: change > dustThreshold * 10
    });
  }
  
  // Strategy 2: Donate dust
  if (change < dustThreshold * 5) {
    strategies.push({
      type: 'donate_dust',
      description: 'Donate small change to reduce UTXO bloat',
      cost: 0,
      benefit: 'Reduces UTXO set size',
      recommended: true
    });
  }
  
  // Strategy 3: Consolidate with existing UTXOs
  if (change >= dustThreshold && change < minChangeThreshold) {
    strategies.push({
      type: 'consolidate',
      description: 'Add to existing small UTXO',
      cost: feePerUTXO,
      benefit: 'Reduces UTXO fragmentation',
      recommended: false
    });
  }
  
  // Find best strategy
  const bestStrategy = strategies.find(s => s.recommended) || strategies[0];
  
  return {
    change,
    targetAmount,
    strategies,
    bestStrategy,
    dustThreshold,
    feePerUTXO,
    minChangeThreshold
  };
};
