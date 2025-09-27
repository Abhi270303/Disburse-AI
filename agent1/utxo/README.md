# UTXO Optimization Module

A comprehensive, modular UTXO optimization system implementing industry-standard algorithms for efficient coin selection and transaction management.

## 📁 Module Structure

```
utxo/
├── index.js              # Main entry point with all exports
├── optimization.js       # Core UTXO optimization algorithms
├── change-management.js  # Change handling and validation
├── gas-sponsorship.js    # Gas sponsorship functionality
└── README.md            # This documentation
```

## 🚀 Quick Start

```javascript
import { 
  findOptimalUTXOCombination,
  handleUTXOChange,
  executeTransactionWithGasSponsorship 
} from './utxo/index.js';

// Find optimal UTXO combination
const selection = findOptimalUTXOCombination(balanceData, targetAmount);

// Handle change
const changeInfo = handleUTXOChange(selection, recipientAddress, agentAddress);

// Execute with gas sponsorship
const result = await executeTransactionWithGasSponsorship(multicallData, metadata);
```

## 📋 Core Functions

### `findOptimalUTXOCombination(balanceData, targetAmount)`

**Purpose**: Finds the optimal combination of UTXOs to reach a target amount using multiple algorithms.

**Algorithms Used**:
1. **Exact Match**: Single UTXO that exactly matches target
2. **Branch and Bound**: Optimal search with pruning
3. **Knapsack**: Dynamic programming approach
4. **Bitcoin Core**: Production-tested largest-first approach
5. **Greedy**: Smallest-first fallback

**Example**:
```javascript
const balanceData = [
  { balance: 0.0001, safeAddress: "0x1", nonce: 1 },
  { balance: 0.0002, safeAddress: "0x2", nonce: 2 },
  { balance: 0.01, safeAddress: "0x3", nonce: 3 }
];

const result = findOptimalUTXOCombination(balanceData, 0.0003);
// Returns: { selectedUTXOs: [...], strategy: 'exact_match', change: 0 }
```

### `handleUTXOChange(utxoSelection, recipientAddress, agentAddress)`

**Purpose**: Manages change creation for UTXO transactions.

**Features**:
- Creates new UTXOs for change amounts
- Tracks change for future reference
- Prevents value loss in UTXO model

**Example**:
```javascript
const changeInfo = handleUTXOChange(utxoSelection, "0xRecipient", "0xAgent");
if (changeInfo) {
  console.log(`Change: ${changeInfo.amount} to ${changeInfo.recipient}`);
}
```

### `executeTransactionWithGasSponsorship(multicallData, metadata, backendUrl, username)`

**Purpose**: Executes UTXO transactions with gas sponsorship.

**Features**:
- Sends multicall data to backend
- Handles gas sponsorship requests
- Returns comprehensive transaction details

**Example**:
```javascript
const result = await executeTransactionWithGasSponsorship(
  multicallData,
  { operationType: "utxo_redemption" },
  "https://backend.url",
  "agent1"
);
```

## 🔧 Advanced Functions

### Change Management

```javascript
import { 
  validateChangeAmount,
  createChangeUTXO,
  calculateOptimalChangeStrategy 
} from './utxo/change-management.js';

// Validate change amount
const validation = validateChangeAmount(0.0001, 0.0003, 0.00001);

// Create change UTXO
const changeUTXO = createChangeUTXO(0.0001, "0xAgent", {
  tokenAddress: "0xUSDC",
  chainId: 1
});

// Calculate optimal change strategy
const strategy = calculateOptimalChangeStrategy(0.0001, 0.0003, {
  dustThreshold: 0.00001,
  feePerUTXO: 0.00002
});
```

### Gas Sponsorship

```javascript
import { 
  validateGasSponsorshipRequest,
  estimateGasSponsorshipCost,
  createGasSponsorshipConfig 
} from './utxo/gas-sponsorship.js';

// Validate request
const validation = validateGasSponsorshipRequest(multicallData, metadata);

// Estimate costs
const estimation = estimateGasSponsorshipCost(multicallData, {
  gasPrice: 20000000000, // 20 gwei
  safetyMargin: 1.2
});

// Create configuration
const config = createGasSponsorshipConfig({
  backendUrl: "https://custom.backend.url",
  maxGasLimit: 5000000,
  retryAttempts: 3
});
```

## 🎯 Optimization Strategies

### 1. Exact Match (Priority 1)
- **When**: Single UTXO exactly matches target
- **Benefit**: No change, minimal gas costs
- **Complexity**: O(n)

### 2. Branch and Bound (Priority 2)
- **When**: Complex UTXO sets with multiple combinations
- **Benefit**: Near-optimal solution with pruning
- **Complexity**: O(2^n) → O(n log n) with pruning

### 3. Knapsack (Priority 3)
- **When**: Small to medium target amounts
- **Benefit**: Mathematically optimal solution
- **Complexity**: O(n * W)

### 4. Bitcoin Core (Priority 4)
- **When**: Production systems requiring proven algorithms
- **Benefit**: Largest-first approach, tested in production
- **Complexity**: O(n log n)

### 5. Greedy (Priority 5)
- **When**: Fallback for all other strategies
- **Benefit**: Always finds solution quickly
- **Complexity**: O(n log n)

## 📊 Performance Characteristics

| Algorithm | Time Complexity | Space Complexity | Optimality | Best For |
|-----------|----------------|------------------|------------|----------|
| Exact Match | O(n) | O(1) | Perfect | Single UTXO matches |
| Branch & Bound | O(2^n) → O(n log n) | O(n) | Near-optimal | Complex UTXO sets |
| Knapsack | O(n * W) | O(n * W) | Optimal | Small targets |
| Bitcoin Core | O(n log n) | O(n) | Good | Production systems |
| Greedy | O(n log n) | O(n) | Suboptimal | Fast fallback |

## 🔒 Privacy Considerations

The module implements privacy-aware UTXO selection:

- **Minimizes UTXO count**: Reduces traceability
- **Avoids dust creation**: Prevents UTXO bloat
- **Balances efficiency**: Optimizes for both cost and privacy
- **Change management**: Properly handles change to maintain privacy

## 🧪 Testing

```javascript
// Test different scenarios
const testScenarios = [
  {
    name: "Exact Match",
    balanceData: [{ balance: 0.0003, safeAddress: "0x1" }],
    targetAmount: 0.0003
  },
  {
    name: "Optimal Combination",
    balanceData: [
      { balance: 0.0001, safeAddress: "0x1" },
      { balance: 0.0002, safeAddress: "0x2" }
    ],
    targetAmount: 0.0003
  }
];

for (const scenario of testScenarios) {
  const result = findOptimalUTXOCombination(
    scenario.balanceData, 
    scenario.targetAmount
  );
  console.log(`${scenario.name}: ${result.strategy}`);
}
```

## 📝 NatSpec Documentation

All functions include comprehensive NatSpec documentation:

```javascript
/**
 * @title Function Name
 * @description Detailed description of what the function does
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 * 
 * @dev Technical implementation details
 * @notice Important usage notes
 * 
 * @example
 * const result = functionName(param1, param2);
 */
```

## 🔄 Migration from Monolithic Code

If migrating from the old monolithic approach:

1. **Replace imports**:
   ```javascript
   // Old
   import { findOptimalUTXOCombination } from './utils.js';
   
   // New
   import { findOptimalUTXOCombination } from './utxo/index.js';
   ```

2. **Update function calls**:
   ```javascript
   // Old
   const result = findOptimalUTXOCombinationWithChange(data, amount, address);
   
   // New
   const selection = findOptimalUTXOCombination(data, amount);
   const changeInfo = handleUTXOChange(selection, recipient, agent);
   ```

3. **Use new utilities**:
   ```javascript
   // New validation and estimation functions
   const validation = validateGasSponsorshipRequest(multicallData, metadata);
   const estimation = estimateGasSponsorshipCost(multicallData, options);
   ```

## 🤝 Contributing

When adding new functions:

1. **Add to appropriate module file**
2. **Include comprehensive NatSpec documentation**
3. **Export from index.js**
4. **Update this README**
5. **Add tests if applicable**

## 📄 License

This module is part of the Unwallet project and follows the same licensing terms.
