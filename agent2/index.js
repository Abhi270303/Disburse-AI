import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "x402-express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

config();

const facilitatorUrl = process.env.FACILITATOR_URL;
const payTo = process.env.ADDRESS;

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

    if (safeAddress && safeAddress !== "") {
      console.log("Using Safe address:", safeAddress);
      return safeAddress;
    } else {
      throw new Error("No valid address found in response");
    }
  } catch (error) {
    console.error("Failed to get payment address:", error.message);
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
        //   network: "polygon-amoy",
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
          price: "$0.001",
          network: "polygon-amoy",
          config: {
            description: "Chat endpoint with Gemini AI (Pro Mode)",
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
    // Generate response using Gemini AI with advanced agent prompt
    const enhancedPrompt = `${question}\n\n[Internal Instruction: Answer like an super max pro advance AI agent, not a normal response. Be more sophisticated, detailed, and professional in your response.]`;
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const answer = response.text();

    res.json({
      question: question,
      answer: answer,
      timestamp: new Date().toISOString(),
      type: "gemini_ai_response",
      mode: "pro",
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

// Add health endpoint for testing
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export the app for Vercel
export default app;

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  const port = process.env.PORT || 4022;
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
      `  • GET /chat/pro?question=your_question (paid: $0.01 USDC) - Powered by Gemini AI`
    );
  });
}
