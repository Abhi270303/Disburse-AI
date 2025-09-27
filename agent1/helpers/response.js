/**
 * @fileoverview Response formatting helper functions
 */

/**
 * Formats payment response with all relevant details
 * @param {Object} sponsorshipResult - Gas sponsorship result
 * @param {Object} utxoSelection - UTXO selection result
 * @param {string} toAddress - Recipient address
 * @param {number} amount - Amount sent
 * @param {Array} multicallData - Multicall transaction data
 * @returns {Object} Formatted payment response
 */
export function formatPaymentResponse(sponsorshipResult, utxoSelection, toAddress, amount, multicallData) {
  return {
    success: true,
    message: "Payment processed successfully",
    data: {
      transactionHash: sponsorshipResult.txHash,
      amount: amount,
      toAddress: toAddress,
      gasUsed: sponsorshipResult.gasUsed,
      gasCost: sponsorshipResult.gasCost,
      explorerUrl: sponsorshipResult.explorerUrl,
      sponsorAddress: sponsorshipResult.sponsorDetails.sponsorAddress,
      utxoOptimization: {
        strategy: utxoSelection.strategy,
        utxosUsed: utxoSelection.selectedUTXOs.length,
        totalAmount: utxoSelection.totalAmount,
        change: utxoSelection.change,
        efficiency: {
          utxoEfficiency: utxoSelection.selectedUTXOs.length <= 2 ? 'high' : 'medium',
          changeEfficiency: utxoSelection.change < amount * 0.1 ? 'high' : 'medium',
          gasEfficiency: multicallData.length <= 4 ? 'high' : 'medium'
        }
      },
      timestamp: new Date().toISOString()
    }
  };
}
