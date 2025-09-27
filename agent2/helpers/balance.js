/**
 * @fileoverview Balance and UTXO-related helper functions
 */

import { fetchBalanceData } from '../utils.js';
import { findOptimalUTXOCombination } from '../utxo/index.js';

/**
 * Fetches and validates funded addresses with positive balance
 * @returns {Array} Array of funded addresses with positive balance
 * @throws {Error} If no funded addresses found
 */
export async function getFundedAddresses() {
  console.log("📡 Fetching balance data...");
  const fundedAddresses = await fetchBalanceData();
  console.log(`📊 Found ${fundedAddresses.length} UTXOs with positive balance`);
  
  if (fundedAddresses.length === 0) {
    throw new Error("No UTXOs with positive balance found");
  }
  
  return fundedAddresses;
}

/**
 * Selects optimal UTXO combination for the target amount
 * @param {Array} fundedAddresses - Array of funded addresses
 * @param {number} amount - Target amount to send
 * @returns {Object} UTXO selection result with strategy and selected UTXOs
 * @throws {Error} If insufficient funds
 */
export async function selectOptimalUTXOs(fundedAddresses, amount) {
  console.log("🎯 Finding optimal UTXO combination...");
  const utxoSelection = findOptimalUTXOCombination(fundedAddresses, amount);
  
  if (!utxoSelection.isTargetReached) {
    throw new Error(`Insufficient funds. Requested: ${amount}, Available: ${utxoSelection.totalAmount}`);
  }
  
  console.log("✅ UTXO selection completed:");
  console.log(`   Strategy: ${utxoSelection.strategy}`);
  console.log(`   UTXOs used: ${utxoSelection.selectedUTXOs.length}`);
  console.log(`   Total amount: ${utxoSelection.totalAmount}`);
  console.log(`   Change: ${utxoSelection.change}`);
  
  return utxoSelection;
}
