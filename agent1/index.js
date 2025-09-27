import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import {
  fetchBalanceData,
  generateInitialKeysOnClient,
  account,
  walletClient,
  publicClient,
} from "./utils.js";
import { encodeFunctionData, parseUnits } from "viem";
import { USDC_ABI } from "./safe/safe-utils.js";

config();

const facilitatorUrl = process.env.FACILITATOR_URL;
const payTo = process.env.ADDRESS;
const agent2Url = process.env.AGENT2_URL || "http://localhost:4022";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

if (!facilitatorUrl || !payTo) {
  console.error(
    "Missing required environment variables: FACILITATOR_URL, ADDRESS"
  );
  process.exit(1);
}

const app = express();

// Enable CORS for all origins
app.use(
  cors({
    origin: "*",
  })
);

async function getSafeAddress() {
  try {
    const response = await axios.post(
      `${process.env.AGENT_QUERY_URL}/api/user/${process.env.AGENT_USERNAME}/stealth`,
      {
        chainId: 80002,
        tokenAddress: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
        tokenAmount: "50", // Use higher amount to get safeAddress field
      }
    );

    const json = response.data;
    console.log("Server response:", json);

    if (!json.success) {
      throw new Error(`Server error: ${json.error || "Unknown error"}`);
    }

    // Try to get Safe address first, fallback to stealth address if Safe prediction failed
    const safeAddress = json.data?.safeAddress?.address;
    const stealthAddress = json.data?.address;

    if (safeAddress && safeAddress !== "") {
      console.log("Using Safe address:", safeAddress);
      return safeAddress;
    } else if (stealthAddress && stealthAddress !== "") {
      console.log("Using stealth address as fallback:", stealthAddress);
      return stealthAddress;
    } else {
      throw new Error("No valid address found in response");
    }
  } catch (error) {
    console.error("Failed to get payment address:", error.message);
    throw error;
  }
}

// Function to query agent2 for payment requirements
async function queryAgent2Payment(question) {
  try {
    console.log("🤖 Querying agent2 for payment requirements...");

    try {
      const response = await axios.get(
        `${agent2Url}/chat/pro?question=${encodeURIComponent(
          question
        )}`
      );

      // No payment required
      console.log("✅ Agent2 response received without payment");
      return { requiresPayment: false, data: response.data };
    } catch (error) {
      if (error.response && error.response.status === 402) {
        // Payment required - extract payment requirements
        const paymentData = error.response.data;
        console.log("💰 Agent2 payment requirements:", paymentData);
        return { requiresPayment: true, paymentData };
      } else {
        throw new Error(
          `Agent2 responded with status ${error.response?.status || "unknown"}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error querying agent2:", error);
    throw error;
  }
}

// Function to transfer funds from safe to EOA
async function transferFromSafeToEOA(amount) {
  try {
    console.log("🔄 Transferring funds from safe to EOA...");

    // Get balance data to find a safe with sufficient funds
    const balanceData = await fetchBalanceData();

    if (balanceData.length === 0) {
      throw new Error("No funded safes available");
    }

    // Find a safe with sufficient balance
    const safeWithFunds = balanceData.find((safe) => safe.balance >= amount);
    if (!safeWithFunds) {
      throw new Error(
        `No safe has sufficient balance. Required: ${amount}, Available: ${balanceData
          .map((s) => s.balance)
          .join(", ")}`
      );
    }

    console.log(
      `💰 Using safe ${safeWithFunds.safeAddress} with balance ${safeWithFunds.balance} USDC`
    );

    // Generate spending private key for this safe
    const spendingKeys = await generateInitialKeysOnClient([
      safeWithFunds.nonce,
    ]);
    const spendingPrivateKey = spendingKeys[0];

    // Create wallet client for the spending account
    const { createWalletClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { polygonAmoy } = await import("viem/chains");

    const spendingAccount = privateKeyToAccount(spendingPrivateKey);
    const spendingWalletClient = createWalletClient({
      account: spendingAccount,
      chain: polygonAmoy,
      transport: http(polygonAmoy.rpcUrls.default.http[0]),
    });

    console.log("🔑 Safe spending details:");
    console.log(`   - Safe address: ${safeWithFunds.safeAddress}`);
    console.log(`   - Safe stealth address: ${spendingAccount.address}`);
    console.log(
      `   - Safe spending private key: ${spendingPrivateKey.substring(
        0,
        10
      )}...`
    );
    console.log(
      `   - Transferring to spending account: ${spendingAccount.address}`
    );

    // Transfer from safe to spending account (stealth address)
    const transferData = encodeFunctionData({
      abi: USDC_ABI,
      functionName: "transfer",
      args: [
        spendingAccount.address, // Transfer to the spending account (stealth address)
        parseUnits(amount.toString(), 6), // USDC has 6 decimals
      ],
    });

    // Build and execute safe transaction
    const {
      buildSafeTransaction,
      predictSafeAddress,
      safeSignTypedData,
      SAFE_ABI,
    } = await import("./safe/safe-utils.js");
    const { getContractNetworks } = await import("./safe/safe-contracts.js");
    const Safe = await import("@safe-global/protocol-kit");

    // Use the actual safe address from balance data
    const predictedSafeAddress = safeWithFunds.safeAddress;
    const contractNetworks = getContractNetworks(polygonAmoy.id);

    // Check if Safe is deployed
    const codeResult = await publicClient.getBytecode({
      address: predictedSafeAddress,
    });
    const isSafeDeployed = codeResult && codeResult !== "0x";

    console.log(
      `🔍 Safe deployment status: ${
        isSafeDeployed ? "Deployed" : "Not deployed"
      }`
    );

    let multicallData = [];

    if (!isSafeDeployed) {
      console.log("🚀 Safe not deployed, deploying first...");

      // Deploy Safe first
      const { prepareUTXOTransaction } = await import(
        "./helpers/transaction.js"
      );

      const deploymentResult = await prepareUTXOTransaction(
        {
          nonce: safeWithFunds.nonce,
          safeAddress: predictedSafeAddress,
          stealthAddress: safeWithFunds.stealthAddress,
          balance: safeWithFunds.balance,
          tokenAddress: safeWithFunds.tokenAddress,
        },
        spendingPrivateKey,
        safeWithFunds.stealthAddress,
        spendingAccount.address, // Transfer to spending account (stealth address)
        "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", // USDC token address
        amount,
        polygonAmoy,
        getContractNetworks,
        Safe,
        privateKeyToAccount
      );

      if (deploymentResult.deploymentTx) {
        multicallData.push(deploymentResult.deploymentTx);
        console.log("✅ Added Safe deployment transaction");
      }

      multicallData.push(deploymentResult.transferTx);
      console.log("✅ Added USDC transfer transaction");
    } else {
      console.log("✅ Safe already deployed, proceeding with transfer...");

      // Get safe nonce
      const nonceData = encodeFunctionData({
        abi: SAFE_ABI,
        functionName: "nonce",
      });

      const nonceResult = await publicClient.call({
        to: predictedSafeAddress,
        data: nonceData,
      });

      const safeNonce = BigInt(nonceResult.data || "0x0");

      // Build safe transaction
      const safeTransaction = buildSafeTransaction({
        to: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", // USDC token address
        value: "0",
        data: transferData,
        operation: 0,
        safeTxGas: "0",
        nonce: safeNonce,
      });

      // Sign the safe transaction
      const signature = await safeSignTypedData(
        spendingWalletClient,
        spendingAccount,
        predictedSafeAddress,
        safeTransaction,
        polygonAmoy.id
      );

      // Execute the transaction
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

      multicallData = [
        {
          target: predictedSafeAddress,
          allowFailure: false,
          callData: execTransactionData,
        },
      ];
    }

    // Execute transaction with gas sponsorship
    const { executeTransactionWithGasSponsorship } = await import(
      "./utxo/index.js"
    );

    console.log("📦 Multicall data prepared:", {
      numberOfCalls: multicallData.length,
      calls: multicallData.map((call, index) => ({
        index: index + 1,
        target: call.target,
        allowFailure: call.allowFailure,
        dataLength: call.callData.length,
      })),
    });

    const sponsorshipResult = await executeTransactionWithGasSponsorship(
      multicallData,
      {
        operationType: "safe_deployment_and_transfer",
        toAddress: spendingAccount.address,
        amount: amount,
        tokenAddress: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
        utxoCount: 1,
        strategy: "single_utxo",
        isSafeDeployed: isSafeDeployed,
      },
      process.env.AGENT_QUERY_URL,
      process.env.AGENT_USERNAME
    );

    console.log("✅ Transfer from safe to EOA completed");
    return { success: true, spendingPrivateKey };
  } catch (error) {
    console.error("❌ Error transferring from safe to EOA:", error);
    throw error;
  }
}

// Function to sign TransferWithAuthorization for agent2
async function signTransferWithAuthorization(paymentData, spendingPrivateKey) {
  try {
    console.log("✍️ Signing TransferWithAuthorization for agent2...");

    const { privateKeyToAccount } = await import("viem/accounts");
    const { createWalletClient, http } = await import("viem");
    const { polygonAmoy } = await import("viem/chains");
    const crypto = await import("crypto");

    // Use spending private key account (stealth address) that now has the funds
    const spendingAccount = privateKeyToAccount(spendingPrivateKey);
    const spendingWalletClient = createWalletClient({
      account: spendingAccount,
      chain: polygonAmoy,
      transport: http(polygonAmoy.rpcUrls.default.http[0]),
    });

    console.log("🔑 TransferWithAuthorization signing details:");
    console.log(`   - Using spending account: ${spendingAccount.address}`);
    console.log(
      `   - Spending private key: ${spendingPrivateKey.substring(0, 10)}...`
    );
    console.log(`   - This account now has the funds from Safe transfer`);

    // Extract payment requirements from Agent2's 402 response
    const paymentRequirements = paymentData.accepts[0];
    console.log("💰 Agent2 payment requirements:", paymentRequirements);

    // Create authorization object
    const nonce = "0x" + crypto.default.randomBytes(32).toString("hex");
    const validAfter = "0";
    const validBefore = Math.floor(Date.now() / 1000 + 3600).toString(); // 1 hour from now

    const authorization = {
      from: spendingAccount.address, // Use spending account address (stealth address)
      to: paymentRequirements.payTo,
      value: paymentRequirements.maxAmountRequired,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce,
    };

    console.log("🔍 Authorization details:", {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    });

    console.log("✅ Authorization created for Agent2:", authorization);

    // Create the message to sign (EIP-712 format)
    const domain = {
      name: "USDC",
      version: "2",
      chainId: polygonAmoy.id,
      verifyingContract: paymentRequirements.asset,
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    };

    const signature = await spendingWalletClient.signTypedData({
      account: spendingAccount,
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    console.log("✅ TransferWithAuthorization signed successfully");

    // Create x402 payload
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: "polygon-amoy",
      payload: {
        signature: signature,
        authorization: authorization,
      },
    };

    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString(
      "base64"
    );

    return {
      headers: {
        "X-PAYMENT": paymentHeader,
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("❌ Error signing TransferWithAuthorization:", error);
    throw error;
  }
}

// Function to get response from agent2 with payment
async function getAgent2Response(question, paymentHeaders) {
  try {
    console.log("🤖 Getting response from agent2 with payment...");

    try {
      const response = await axios.get(
        `${agent2Url}/chat/pro?question=${encodeURIComponent(
          question
        )}`,
        {
          headers: paymentHeaders,
        }
      );

      console.log("✅ Agent2 response received");
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 402) {
        // Payment still required - let's see what the issue is
        const errorData = error.response.data;
        console.log("❌ Agent2 still requires payment:", errorData);
        throw new Error(
          `Agent2 payment failed: ${errorData.error || "Unknown payment error"}`
        );
      } else {
        throw new Error(
          `Agent2 responded with status ${error.response?.status || "unknown"}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error getting agent2 response:", error);
    throw error;
  }
}

// Create a dynamic payment middleware that gets fresh address on each request
const dynamicPaymentMiddleware = async (req, res, next) => {
  try {
    const paymentAddress = await getSafeAddress();

    // Create payment middleware with the fresh address
    const middleware = paymentMiddleware(
      paymentAddress,
      {
        // "/": {
        //   price: "$0.01",
        //   network: "polygon-amoy-testnet",
        //   config: {
        //     description: "Hello World endpoint",
        //     mimeType: "application/json",
        //   },
        // },
        "/weather": {
          price: "$0.01",
          network: "polygon-amoy",
          config: {
            description: "Weather data access",
            mimeType: "application/json",
          },
        },
        "/chat/pro": {
          price: "$0.01",
          network: "polygon-amoy",
          config: {
            description:
              "Multi-Agent Chat endpoint (Agent1 coordinates with Agent2)",
            mimeType: "application/json",
          },
        },
      },
      {
        url: facilitatorUrl,
      }
    );

    // Apply the middleware
    middleware(req, res, next);
  } catch (error) {
    console.error("Failed to setup payment middleware:", error.message);
    res.status(500).json({
      error: "Payment service unavailable",
      message: error.message,
    });
  }
};

// Apply dynamic payment middleware
app.use(dynamicPaymentMiddleware);

app.get("/", (req, res) => {
  res.json({
    message: "Hello World",
  });
});

app.get("/weather", (req, res) => {
  console.log("🌤️ Serving weather data to paid user");

  res.json({
    report: {
      weather: "sunny",
      temperature: 70,
      location: "Test City",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/chat", async (req, res) => {
  const question = req.query.question;
  const proMode = req.query.pro === "true";

  if (!question) {
    return res.status(400).json({
      error: "Question parameter is required",
      message: "Please provide a question using ?question=your_question",
    });
  }

  console.log(`💬 Chat request received: "${question}" (Pro Mode: ${proMode})`);

  // If pro mode is enabled, let the payment middleware handle it
  if (proMode) {
    // The payment middleware will handle this request
    return;
  }

  // Free mode - direct API call without payment
  try {
    // Generate response using Gemini AI
    const result = await model.generateContent(question);
    const response = await result.response;
    const answer = response.text();

    res.json({
      question: question,
      answer: answer,
      timestamp: new Date().toISOString(),
      type: "gemini_ai_response",
      mode: "free",
    });
  } catch (error) {
    console.error("❌ Gemini AI error:", error);
    res.status(500).json({
      error: "Failed to generate AI response",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Pro mode chat endpoint with payment middleware
app.get("/chat/pro", async (req, res) => {
  const question = req.query.question;

  if (!question) {
    return res.status(400).json({
      error: "Question parameter is required",
      message: "Please provide a question using ?question=your_question",
    });
  }

  console.log(`💬 Pro Chat request received: "${question}"`);

  try {
    // Generate agent1 response using Gemini AI with advanced agent prompt
    const enhancedPrompt = `${question}\n\n[Internal Instruction: Answer like an advanced AI agent, not a normal response. Be more sophisticated, detailed, and professional in your response.]`;
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const agent1Answer = response.text();

    const agent1Response = {
      question: question,
      answer: agent1Answer,
      timestamp: new Date().toISOString(),
      type: "gemini_ai_response",
      mode: "pro",
      agent: "agent1",
    };

    // Now that Agent1 has been paid, coordinate with Agent2
    console.log("🤖 User has paid Agent1, now coordinating with Agent2...");

    // Query agent2 for payment requirements
    const paymentRequirements = await queryAgent2Payment(question);

    if (paymentRequirements.requiresPayment) {
      // Debug: Log the payment data structure
      console.log(
        "🔍 Payment data structure:",
        JSON.stringify(paymentRequirements.paymentData, null, 2)
      );

      // Extract amount from payment requirements - Agent2 returns maxAmountRequired in wei
      const maxAmountRequired =
        paymentRequirements.paymentData.accepts[0].maxAmountRequired;
      const amount = parseFloat(maxAmountRequired) / Math.pow(10, 6); // Convert from wei to USDC (6 decimals)
      console.log(
        `💰 Agent2 requires payment of ${amount} USDC (${maxAmountRequired} wei)`
      );

      // Transfer funds from safe to EOA
      const transferResult = await transferFromSafeToEOA(amount);

      if (transferResult.success) {
        // Sign TransferWithAuthorization for agent2
        const signingResult = await signTransferWithAuthorization(
          paymentRequirements.paymentData,
          transferResult.spendingPrivateKey
        );

        // Get response from agent2 with payment headers
        const agent2Response = await getAgent2Response(
          question,
          signingResult.headers
        );

        // Combine both responses
        const combinedResponse = {
          question: question,
          timestamp: new Date().toISOString(),
          type: "multi_agent_response",
          mode: "pro",
          responses: {
            agent1: agent1Response,
            agent2: {
              ...agent2Response,
              agent: "agent2",
            },
          },
          summary: `Multi-agent response: Agent1 provided ${agent1Response.answer.length} characters, Agent2 provided ${agent2Response.answer.length} characters.`,
          payment_flow: "User → Agent1 ($0.01) → Agent2 ($0.001)",
        };

        res.json(combinedResponse);
      } else {
        // If agent2 payment fails, return only agent1 response
        res.json({
          ...agent1Response,
          note: "Agent2 payment failed, returning only Agent1 response",
          payment_flow: "User → Agent1 ($0.01) - Agent2 payment failed",
        });
      }
    } else {
      // No payment required - get agent2 response directly
      const agent2Response = {
        ...paymentRequirements.data,
        agent: "agent2",
      };

      // Combine both responses
      const combinedResponse = {
        question: question,
        timestamp: new Date().toISOString(),
        type: "multi_agent_response",
        mode: "pro",
        responses: {
          agent1: agent1Response,
          agent2: agent2Response,
        },
        summary: `Multi-agent response: Agent1 provided ${agent1Response.answer.length} characters, Agent2 provided ${agent2Response.answer.length} characters.`,
        payment_flow: "User → Agent1 ($0.01) - Agent2 (free)",
      };

      res.json(combinedResponse);
    }
  } catch (error) {
    console.error("❌ Error in /chat/pro endpoint:", error);
    res.status(500).json({
      error: "Failed to process pro chat request",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Add health endpoint for testing
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export the app for Vercel
export default app;

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const port = process.env.PORT || 4021;
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Network: Polygon Amoy Testnet`);
    console.log(`Facilitator: ${facilitatorUrl}`);
    console.log(`Available endpoints:`);
    console.log(`  • GET /health (free)`);
    console.log(`  • GET /weather (paid: $0.01 USDC)`);
    console.log(
      `  • GET /chat?question=your_question (free) - Powered by Gemini AI`
    );
    console.log(
      `  • GET /chat/pro?question=your_question (paid: $0.01 USDC) - Multi-Agent Response (Agent1 coordinates with Agent2)`
    );
    console.log(`🤖 Agent2 coordination enabled at ${agent2Url}`);
    console.log(`💰 Payment flow: User → Agent1 ($0.01) → Agent2 ($0.001)`);
  });
}
