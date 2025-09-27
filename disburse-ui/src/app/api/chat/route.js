// app/api/chat/route.js - Get 402 payment details and show payment options

import { X402_PAYMENT_URL } from "@/lib/constants";

export async function POST(req) {
  try {
    const body = await req.json();
    const session_id = body.session_id;
    const chatMode = body.chatMode || "free"; // "free" or "pro"
    const message =
      body.message ||
      (body.messages && body.messages[body.messages.length - 1]?.content);
    const experimental_attachments = body.experimental_attachments || [];

    // Create a TransformStream for streaming the response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Stream the response
    (async () => {
      try {
        // Send sessionId if provided
        if (session_id) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                type: "sessionId",
                sessionId: session_id,
              }) + "\n"
            )
          );
        }

        if (chatMode === "pro") {
          // Pro mode - requires payment
          await writer.write(
            encoder.encode(
              JSON.stringify({
                type: "chunk",
                content: "Processing your request...\n",
                sessionId: session_id,
              }) + "\n"
            )
          );

          try {
            // Get 402 payment details for pro mode
            const weatherResponse = await fetch(`${X402_PAYMENT_URL}/weather`, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            console.log("402 Response status:", weatherResponse.status);

            if (weatherResponse.status === 402) {
              const paymentData = await weatherResponse.json();

              await writer.write(
                encoder.encode(
                  JSON.stringify({
                    type: "paymentRequired",
                    paymentData: paymentData,
                    sessionId: session_id,
                  }) + "\n"
                )
              );

              // No verbose payment message - just show the payment card
            } else {
              await writer.write(
                encoder.encode(
                  JSON.stringify({
                    type: "chunk",
                    content:
                      "❌ Payment endpoint not available. Please try again.",
                    sessionId: session_id,
                  }) + "\n"
                )
              );
            }
          } catch (error) {
            console.error("Error fetching 402 payment data:", error);
            await writer.write(
              encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  content: `❌ Error fetching payment details: ${error.message}`,
                  sessionId: session_id,
                }) + "\n"
              )
            );
          }
        } else {
          // Free mode - direct response
          await writer.write(
            encoder.encode(
              JSON.stringify({
                type: "chunk",
                content: "Processing your request...\n",
                sessionId: session_id,
              }) + "\n"
            )
          );

          try {
            // Direct API call to free chat endpoint
            const encodedQuestion = encodeURIComponent(message);

            // For now, use GET request as the endpoint might not support POST
            // TODO: Update when the endpoint supports POST with attachments
            const chatResponse = await fetch(
              `${X402_PAYMENT_URL}/chat?question=${encodedQuestion}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            if (chatResponse.ok) {
              const chatData = await chatResponse.json();

              // Check if it's a multi-agent response
              if (
                chatData.type === "multi_agent_response" &&
                chatData.responses
              ) {
                // Send the multi-agent data as a special type
                await writer.write(
                  encoder.encode(
                    JSON.stringify({
                      type: "multiAgentResponse",
                      multiAgentData: chatData,
                      sessionId: session_id,
                    }) + "\n"
                  )
                );
              } else {
                // Single response
                await writer.write(
                  encoder.encode(
                    JSON.stringify({
                      type: "chunk",
                      content: `\n${chatData.answer}`,
                      sessionId: session_id,
                    }) + "\n"
                  )
                );
              }
            } else {
              await writer.write(
                encoder.encode(
                  JSON.stringify({
                    type: "chunk",
                    content: "❌ Error getting AI response. Please try again.",
                    sessionId: session_id,
                  }) + "\n"
                )
              );
            }
          } catch (error) {
            console.error("Error fetching free chat response:", error);
            await writer.write(
              encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  content: `❌ Error: ${error.message}`,
                  sessionId: session_id,
                }) + "\n"
              )
            );
          }
        }

        // Send done signal
        await writer.write(
          encoder.encode(
            JSON.stringify({
              type: "done",
              content: "",
              sessionId: session_id,
            }) + "\n"
          )
        );

        await writer.close();
      } catch (error) {
        console.error("Error in streaming:", error);
        await writer.write(
          encoder.encode(
            JSON.stringify({
              type: "error",
              error: error.message,
              sessionId: session_id,
            }) + "\n"
          )
        );
        await writer.close();
      }
    })();

    // Return the stream
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(
      JSON.stringify({
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your request: " +
          error.message,
        id: "chatcmpl-" + Date.now(),
        session_id: null,
        timestamp: new Date().toISOString(),
        success: false,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
