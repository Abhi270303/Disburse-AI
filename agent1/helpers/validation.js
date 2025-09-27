/**
 * @fileoverview Validation helper functions for the payment API
 */

/**
 * Validates payment request parameters
 * @param {Object} req - Express request object
 * @returns {Object} Validated parameters { toAddress, amount, tokenAddress }
 * @throws {Error} If validation fails
 */
export async function validatePaymentRequest(req) {
  const { toAddress, amount, tokenAddress } = req.body;
  
  if (!toAddress) {
    throw new Error("Missing required parameter: toAddress");
  }
  
  if (!amount || amount <= 0) {
    throw new Error("Missing or invalid amount. Must be greater than 0");
  }
  
  return { toAddress, amount, tokenAddress };
}
