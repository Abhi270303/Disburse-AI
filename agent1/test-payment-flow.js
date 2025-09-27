#!/usr/bin/env node

import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import fetch from "node-fetch";
import crypto from "crypto";

config();

const AGENT1_URL = "http://localhost:4021";
const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("❌ Missing CLIENT_PRIVATE_KEY environment variable");
  process.exit(1);
}


async function testMultiAgentPaymentFlow() {
  console.log("🧪 Testing Multi-Agent Payment Flow...\n");
  console.log("💰 Flow: User → Agent1 ($0.01) → Agent2 ($0.001)\n");

  // Create account and clients
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: polygonAmoy,
    transport: http(),
    account: account,
  });

  console.log(`🔗 Connected to Polygon Amoy Testnet`);
  console.log(`👛 Client wallet: ${account.address}`);

  try {
    // Step 1: Get payment requirements from Agent1
    console.log("1️⃣ STEP 1: Getting payment requirements from Agent1...");
    const response = await fetch(`${AGENT1_URL}/chat/pro?question=What is the future of blockchain technology?`);
    const data = await response.json();

    if (response.status === 402 && data.accepts && data.accepts[0]) {
      const paymentRequirements = data.accepts[0];
      console.log(
        "✅ Got Agent1 payment requirements:",
        JSON.stringify(paymentRequirements, null, 2)
      );

      // Step 2: Create x402 authorization for Agent1
      console.log("\n2️⃣ STEP 2: Creating x402 authorization for Agent1...");

      const nonce = "0x" + crypto.randomBytes(32).toString("hex");
      const validAfter = "0";
      const validBefore = Math.floor(Date.now() / 1000 + 3600).toString(); // 1 hour from now

      const authorization = {
        from: account.address,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce,
      };

      console.log(
        "✅ Authorization created for Agent1:",
        JSON.stringify(authorization, null, 2)
      );

      // Step 3: Sign the authorization for Agent1
      console.log("\n3️⃣ STEP 3: Signing authorization for Agent1...");

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

      const signature = await walletClient.signTypedData({
        account: account,
        domain,
        types,
        primaryType: "TransferWithAuthorization",
        message,
      });

      console.log("✅ Signature created for Agent1:", signature);

      // Step 4: Create x402 payload for Agent1
      console.log("\n4️⃣ STEP 4: Creating x402 payload for Agent1...");

      const paymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: "polygon-amoy-testnet",
        payload: {
          signature: signature,
          authorization: authorization,
        },
      };

      console.log(
        "✅ Payment payload created for Agent1:",
        JSON.stringify(paymentPayload, null, 2)
      );

      // Step 5: Create base64 encoded payment header for Agent1
      const paymentHeader = Buffer.from(
        JSON.stringify(paymentPayload)
      ).toString("base64");
      console.log(
        `📦 X-PAYMENT header created for Agent1 (${paymentHeader.length} chars)`
      );

      const payload = {
        headers: {
          "X-PAYMENT": paymentHeader,
          "Content-Type": "application/json",
        },
      }

      console.log("📦 Payload for Agent1:", payload);
      
      // Step 6: Request multi-agent response with payment to Agent1
      console.log("\n5️⃣ STEP 5: Requesting multi-agent response with payment to Agent1...");
      const multiAgentResponse = await fetch(`${AGENT1_URL}/chat/pro?question=What is the future of blockchain technology?`, payload);

      const responseData = await multiAgentResponse.json();
      console.log(`📊 Response Status: ${multiAgentResponse.status}`);
      
      if (multiAgentResponse.status === 200) {
        console.log("🎉 SUCCESS! Multi-agent response received after payment to Agent1!");
        console.log("📋 Response type:", responseData.type);
        console.log("🤖 Agents involved:", Object.keys(responseData.responses || {}));
        
        if (responseData.responses) {
          console.log("\n📝 Agent1 response length:", responseData.responses.agent1?.answer?.length || 0);
          console.log("📝 Agent2 response length:", responseData.responses.agent2?.answer?.length || 0);
          console.log("📋 Summary:", responseData.summary);
          console.log("💰 Payment flow:", responseData.payment_flow);
        }
        
        console.log("\n🎉 Multi-agent payment flow test PASSED!");
        console.log("✅ User → Agent1 ($0.01) → Agent2 ($0.001) flow completed successfully!");
        
        return responseData;
      } else {
        console.log("❌ Payment to Agent1 failed - check facilitator logs");
        console.log("Error details:", responseData);
        return null;
      }
    } else {
      console.log("❌ Did not receive proper 402 response from Agent1");
      console.log("Response:", data);
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

// Run the test
testMultiAgentPaymentFlow().catch(console.error);
