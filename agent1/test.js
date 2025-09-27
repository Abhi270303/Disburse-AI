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

const WEATHER_API_URL = process.env.WEATHER_API_URL || "http://localhost:4021";
const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("❌ Missing CLIENT_PRIVATE_KEY environment variable");
  process.exit(1);
}


async function polygonAmoyClient() {
  console.log("🚀 Polygon Amoy Testnet x402 Client\n");

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
    // Step 1: Get payment requirements
    console.log("\n🌤️ STEP 1: Getting payment requirements...");
    const response = await fetch(`${WEATHER_API_URL}/weather`);
    const data = await response.json();

    if (response.status === 402 && data.accepts && data.accepts[0]) {
      const paymentRequirements = data.accepts[0];
      console.log(
        "✅ Got payment requirements:",
        JSON.stringify(paymentRequirements, null, 2)
      );

      // Step 2: Create x402 authorization
      console.log("\n💳 STEP 2: Creating x402 authorization...");

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
        "✅ Authorization created:",
        JSON.stringify(authorization, null, 2)
      );

      // Step 3: Sign the authorization
      console.log("\n✍️ STEP 3: Signing authorization...");

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

      console.log("✅ Signature created:", signature);

      // Step 4: Create x402 payload
      console.log("\n📦 STEP 4: Creating x402 payload...");

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
        "✅ Payment payload created:",
        JSON.stringify(paymentPayload, null, 2)
      );

      // Step 5: Create base64 encoded payment header
      const paymentHeader = Buffer.from(
        JSON.stringify(paymentPayload)
      ).toString("base64");
      console.log(
        `📦 X-PAYMENT header created (${paymentHeader.length} chars)`
      );

      const payload = {
        headers: {
          "X-PAYMENT": paymentHeader,
          "Content-Type": "application/json",
        },
      }

      console.log("payload", payload);
      
      // Step 6: Request weather with payment
      console.log("\n🚀 STEP 5: Requesting weather with x402 payment...");
      const weatherResponse = await fetch(`${WEATHER_API_URL}/weather`, payload);

      const weatherData = await weatherResponse.json();
      console.log(`📊 Response Status: ${weatherResponse.status}`);
      console.log(`📋 Response Data:`, JSON.stringify(weatherData, null, 2));

      if (weatherResponse.status === 200) {
        console.log("🎉 SUCCESS! Weather data received after x402 payment!");
        return weatherData;
      } else {
        console.log("❌ Payment still required - check facilitator logs");
        return null;
      }
    } else {
      console.log("❌ Did not receive proper 402 response");
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

// Run the client
polygonAmoyClient().catch(console.error);
