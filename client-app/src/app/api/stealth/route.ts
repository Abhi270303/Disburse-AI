import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, ...stealthRequest } = body;

    console.log("🔍 Proxy Request:", {
      url: `${BACKEND_URL}/api/user/${username}/stealth`,
      body: stealthRequest,
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Headers to match the curl request exactly
    const headers = {
      accept: "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
      "content-type": "application/json",
      dnt: "1",
    };

    const response = await axios.post(
      `${BACKEND_URL}/api/user/${username}/stealth`,
      stealthRequest,
      { headers }
    );

    console.log("📥 Proxy Response:", response.data);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("❌ Proxy Error:", error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
