import { config } from "dotenv";

config();

const AGENT1_URL = "http://localhost:4021";
const AGENT2_URL = "http://localhost:4022";

async function testMultiAgentCoordination() {
  console.log("🧪 Testing Multi-Agent Coordination...\n");

  try {
    // Add a small timeout to ensure agents are fully started
    console.log("⏳ Waiting 2 seconds for agents to fully start...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: Check if both agents are running
    console.log("1️⃣ Checking agent availability...");
    
    const agent1Health = await fetch(`${AGENT1_URL}/health`);
    const agent2Health = await fetch(`${AGENT2_URL}/health`);
    
    if (agent1Health.status === 200) {
      console.log("✅ Agent1 is running");
    } else {
      console.log("❌ Agent1 is not responding");
      return;
    }
    
    if (agent2Health.status === 200) {
      console.log("✅ Agent2 is running");
    } else {
      console.log("❌ Agent2 is not responding");
      return;
    }

    // Test 2: Test multi-agent chat/pro endpoint
    console.log("\n2️⃣ Testing multi-agent chat/pro endpoint...");
    
    const testQuestion = "What is the future of blockchain technology?";
    console.log(`📝 Question: "${testQuestion}"`);
    
    const response = await fetch(`${AGENT1_URL}/chat/pro?question=${encodeURIComponent(testQuestion)}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log("✅ Multi-agent response received!");
      console.log("📊 Response type:", data.type);
      console.log("🤖 Agents involved:", Object.keys(data.responses || {}));
      
      if (data.responses) {
        console.log("\n📝 Agent1 response length:", data.responses.agent1?.answer?.length || 0);
        console.log("📝 Agent2 response length:", data.responses.agent2?.answer?.length || 0);
        console.log("📋 Summary:", data.summary);
        console.log("💰 Payment flow:", data.payment_flow);
      }
      
      console.log("\n🎉 Multi-agent coordination test PASSED!");
    } else {
      console.log("❌ Multi-agent request failed with status:", response.status);
      const errorData = await response.json();
      console.log("Error details:", errorData);
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testMultiAgentCoordination();
