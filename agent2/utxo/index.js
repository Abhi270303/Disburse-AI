/**
 * @fileoverview UTXO Module Index
 * @description Main entry point for UTXO optimization and management functions
 * @author Unwallet Team
 * @version 1.0.0
 */

// Export optimization functions
export { findOptimalUTXOCombination } from './optimization.js';

// Export change management functions
export { 
  handleUTXOChange,
  findOptimalUTXOCombinationWithChange,
  validateChangeAmount,
  createChangeUTXO,
  calculateOptimalChangeStrategy
} from './change-management.js';

// Export gas sponsorship functions
export {
  executeTransactionWithGasSponsorship,
  validateGasSponsorshipRequest,
  estimateGasSponsorshipCost,
  createGasSponsorshipConfig
} from './gas-sponsorship.js';

/**
 * @title UTXO Module
 * @description Complete UTXO optimization and management system
 * 
 * @example
 * import { 
 *   findOptimalUTXOCombination,
 *   handleUTXOChange,
 *   executeTransactionWithGasSponsorship 
 * } from './utxo/index.js';
 * 
 * // Find optimal UTXO combination
 * const selection = findOptimalUTXOCombination(balanceData, targetAmount);
 * 
 * // Handle change
 * const changeInfo = handleUTXOChange(selection, recipientAddress, agentAddress);
 * 
 * // Execute with gas sponsorship
 * const result = await executeTransactionWithGasSponsorship(multicallData, metadata);
 * 
 * @notice This module provides a complete solution for UTXO-based transactions
 * including optimization, change management, and gas sponsorship
 */
