"use client";
import React, { useMemo, useState, useEffect } from "react";
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import {
  Ban,
  ChevronRight,
  Code2,
  Loader2,
  Terminal,
  Pencil,
  Check,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilePreview } from "@/components/ui/file-preview";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccount, useSignMessage, useWalletClient } from "wagmi";
import crypto from "crypto";
import { X402_PAYMENT_URL } from "@/lib/constants";

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-xl p-6 text-sm dark:shadow-sm transition-all duration-200",
  {
    variants: {
      isUser: {
        true: "bg-muted/50 border border-border/20 text-secondary-foreground ml-auto hover:bg-secondary/95 py-1.5 px-4 sm:max-w-[85%]",
        false: "text-foreground w-full p-5 max-w-full",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  }
);

export const ChatMessage = ({
  role,
  content,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  experimental_attachments,
  toolInvocations,
  parts,
  onEdit,
  onRemoveFile,
  qrCodeData,
  paymentRequiredData,
  userQuestion,
  multiAgentData,
}) => {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isPollingUI, setIsPollingUI] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentCard, setShowPaymentCard] = useState(true);
  const [aiResponseContent, setAiResponseContent] = useState(null);
  const [localMultiAgentData, setLocalMultiAgentData] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const pollingIntervalRef = React.useRef(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const textareaRef = React.useRef(null);

  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handlePayWithCrypto = async () => {
    if (!address || !walletClient || !paymentRequiredData) {
      console.error("Missing wallet connection or payment data");
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log("💳 Starting x402 payment process...");

      // Step 1: Get payment requirements (already have this from paymentRequiredData)
      const paymentRequirements = paymentRequiredData.paymentData.accepts[0];
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
        from: address,
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
        chainId: 80002, // Polygon Amoy testnet
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
        account: address,
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
        network: "polygon-amoy",
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

      // Step 6: Request chat with payment
      console.log("\n🚀 STEP 5: Requesting chat with x402 payment...");

      // Get the user's question from the prop or fallback to content
      const questionToSend = userQuestion || content || "hey";
      const encodedQuestion = encodeURIComponent(questionToSend);

      // For now, use GET request as the pro endpoint might not support POST with attachments yet
      // TODO: Update when the pro endpoint supports POST with attachments
      const chatResponse = await fetch(
        `${X402_PAYMENT_URL}/chat/pro?question=${encodedQuestion}`,
        {
          method: "GET",
          headers: {
            "X-PAYMENT": paymentHeader,
            "Content-Type": "application/json",
          },
        }
      );

      const chatData = await chatResponse.json();
      console.log(`📊 Response Status: ${chatResponse.status}`);
      console.log(`📋 Response Data:`, JSON.stringify(chatData, null, 2));

      if (chatResponse.status === 200) {
        console.log("🎉 SUCCESS! Chat response received after x402 payment!");
        console.log("📋 Response Data:", JSON.stringify(chatData, null, 2));

        // Check if it's a multi-agent response
        if (chatData.type === "multi_agent_response" && chatData.responses) {
          // Set the multi-agent data to display
          setAiResponseContent("Multi-agent response received");
          // Store the multi-agent data
          setLocalMultiAgentData(chatData);
        } else {
          // Single response
          setAiResponseContent(chatData.answer);
        }

        // Hide the payment card
        setShowPaymentCard(false);
      } else {
        console.log("❌ Payment still required - check facilitator logs");
        alert("Payment failed. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error in payment process:", error);
      alert(`Payment error: ${error.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    console.log("ChatMessage received attachments:", {
      experimental_attachments,
      role,
      content,
    });
  }, [experimental_attachments, role, content]);

  const files = useMemo(() => {
    if (!experimental_attachments?.length) return [];
    return experimental_attachments.map((attachment) => ({
      name: attachment.name || "File",
      type:
        attachment.type ||
        (attachment.url && attachment.url.split(";")[0].split(":")[1]),
      // Only store the file type and name, not the actual content
      url: attachment.url
        ? "data:" + attachment.url.split(";")[0].split(":")[1] + ";base64,"
        : undefined,
    }));
  }, [experimental_attachments]);

  const isUser = role === "user";

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const dateTime = createdAt ? new Date(createdAt).toISOString() : null;

  const handleEdit = () => {
    console.log("Starting edit for message:", content);
    setIsEditing(true);
    setEditedContent(content);
    // Focus the textarea after it's rendered
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(content.length, content.length);
    }, 0);
  };

  const handleSave = () => {
    console.log("Saving edit:", { original: content, edited: editedContent });
    // Always trigger edit to ensure subsequent messages are removed
    onEdit(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    console.log("Canceling edit");
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("Enter pressed, saving edit");
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      console.log("Escape pressed, canceling edit");
      handleCancel();
    }
  };

  if (isUser) {
    return (
      <div
        className={cn(
          "flex flex-col space-y-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {!isEditing && files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 justify-end">
            {files.map((file, index) => (
              <FilePreview
                key={index}
                file={file}
                onRemove={onRemoveFile ? () => onRemoveFile(index) : undefined}
              />
            ))}
          </div>
        )}
        {isEditing ? (
          <div
            className={cn(
              "flex flex-col w-full",
              isUser ? "items-end" : "items-start"
            )}
          >
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 justify-end">
                {files.map((file, index) => (
                  <FilePreview
                    key={index}
                    file={file}
                    onRemove={
                      onRemoveFile ? () => onRemoveFile(index) : undefined
                    }
                  />
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="md:w-[65%] bg-muted min-h-[100px] resize-none rounded-md border border-border/20 p-4 text-sm focus:border-foreground focus:ring-0"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 px-3"
                onClick={handleSave}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className={cn(chatBubbleVariants({ isUser, animation }))}>
              <MarkdownRenderer>{content}</MarkdownRenderer>
              {actions ? (
                <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background/95 backdrop-blur-sm p-1.5 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100 shadow-sm">
                  {actions}
                </div>
              ) : null}
            </div>
            {onEdit && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-transparent hover:text-foreground"
                  onClick={handleEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
        {showTimeStamp && createdAt ? (
          <time
            dateTime={dateTime}
            className={cn(
              "mt-1 block px-1 text-xs text-muted-foreground",
              animation !== "none" && "duration-500 animate-in fade-in-0"
            )}
          >
            {formattedTime}
          </time>
        ) : null}
      </div>
    );
  }

  if (parts && parts.length > 0) {
    return parts.map((part, index) => {
      if (part.type === "text") {
        return (
          <div
            className={cn(
              "flex flex-col",
              isUser ? "items-end" : "items-start"
            )}
            key={`text-${index}`}
          >
            <div className={cn(chatBubbleVariants({ isUser, animation }))}>
              <MarkdownRenderer>{part.text}</MarkdownRenderer>
              {actions ? (
                <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                  {actions}
                </div>
              ) : null}
            </div>
            {showTimeStamp && createdAt ? (
              <time
                dateTime={dateTime}
                className={cn(
                  "mt-1 block px-1 text-xs opacity-50",
                  animation !== "none" && "duration-500 animate-in fade-in-0"
                )}
              >
                {formattedTime}
              </time>
            ) : null}
          </div>
        );
      } else if (part.type === "reasoning") {
        return <ReasoningBlock key={`reasoning-${index}`} part={part} />;
      } else if (part.type === "tool-invocation") {
        return (
          <ToolCall
            key={`tool-${index}`}
            toolInvocations={[part.toolInvocation]}
          />
        );
      }
      return null;
    });
  }

  if (toolInvocations && toolInvocations.length > 0) {
    return <ToolCall toolInvocations={toolInvocations} />;
  }

  return (
    <div
      className={cn(
        "flex flex-col space-y-2",
        isUser ? "items-end" : "items-start"
      )}
    >
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 justify-end">
          {files.map((file, index) => (
            <FilePreview
              key={index}
              file={file}
              onRemove={onRemoveFile ? () => onRemoveFile(index) : undefined}
            />
          ))}
        </div>
      )}
      <div className={cn(chatBubbleVariants({ isUser, animation }))}>
        <MarkdownRenderer>{aiResponseContent || content}</MarkdownRenderer>

        {/* Display QR Code if present */}
        {qrCodeData && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex flex-col items-center space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                QR Code for Safe Address
              </h4>
              <img
                src={qrCodeData.qrCodeDataURL}
                alt="QR Code for Safe Address"
                className="w-48 h-48 border border-border/50 rounded-lg"
              />
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>
                  <strong>Safe Address:</strong> {qrCodeData.safeAddress}
                </p>
                <p>
                  <strong>Payment ID:</strong> {qrCodeData.paymentId}
                </p>
                <p>
                  <strong>Chain:</strong> {qrCodeData.chainName}
                </p>
                <p>
                  <strong>Token Amount:</strong> {qrCodeData.tokenAmount}
                </p>
                <p>
                  <strong>Time Remaining:</strong> {qrCodeData.timeRemaining}{" "}
                  seconds
                </p>
              </div>

              {/* Payment Status Section */}
              {paymentStatus && (
                <div className="w-full mt-4 p-3 bg-background/50 rounded-lg border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-foreground">
                      Payment Status
                    </h5>
                    <div className="flex items-center space-x-2">
                      {isPollingUI && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          paymentStatus.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : paymentStatus.status === "listening"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {paymentStatus.status}
                      </span>
                    </div>
                  </div>

                  {paymentStatus.status === "completed" ? (
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Transaction Hash:</strong>{" "}
                        {paymentStatus.transactionHash}
                      </p>
                      <p>
                        <strong>From Address:</strong>{" "}
                        {paymentStatus.fromAddress}
                      </p>
                      <p>
                        <strong>Actual Amount:</strong>{" "}
                        {paymentStatus.actualAmount}
                      </p>
                      <p>
                        <strong>Completed At:</strong>{" "}
                        {new Date(paymentStatus.completedAt).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Status:</strong> {paymentStatus.status}
                      </p>
                      <p>
                        <strong>Is Active:</strong>{" "}
                        {paymentStatus.isActive ? "Yes" : "No"}
                      </p>
                      {paymentStatus.eventListener && (
                        <p>
                          <strong>Time Remaining:</strong>{" "}
                          {paymentStatus.eventListener.timeRemaining} seconds
                        </p>
                      )}
                      <p>
                        <strong>Expires At:</strong>{" "}
                        {new Date(paymentStatus.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Display Payment Required Section */}
        {paymentRequiredData &&
          showPaymentCard &&
          paymentRequiredData.paymentData && (
            <div className="mt-4 flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="text-sm text-foreground">
                    {parseFloat(
                      (
                        paymentRequiredData.paymentData.accepts[0]
                          .maxAmountRequired / 1000000
                      ).toFixed(6)
                    )}{" "}
                    {paymentRequiredData.paymentData.accepts[0].extra.name} on{" "}
                    {paymentRequiredData.paymentData.accepts[0].network ===
                    "polygon-amoy"
                      ? "Polygon Amoy Testnet"
                      : paymentRequiredData.paymentData.accepts[0].network}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground font-mono">
                      To: {paymentRequiredData.paymentData.accepts[0].payTo}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 hover:bg-muted/50"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          paymentRequiredData.paymentData.accepts[0].payTo
                        );
                        setCopiedAddress(true);
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }}
                    >
                      {copiedAddress ? (
                        <svg
                          className="h-3 w-3 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handlePayWithCrypto}
                disabled={isProcessingPayment || !address}
              >
                {isProcessingPayment ? "Processing..." : "Pay Now"}
              </Button>
            </div>
          )}

        {/* Display Multi-Agent Response Section */}
        {(multiAgentData || localMultiAgentData) && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <h4 className="text-sm font-medium text-foreground">
                  🤖 Multi-Agent Pro Response
                </h4>
              </div>

              <div className="flex space-x-4">
                {/* Agent 1 Response */}
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Agent 1
                  </div>
                  <div className="text-sm text-foreground">
                    <MarkdownRenderer>
                      {
                        (multiAgentData || localMultiAgentData).responses.agent1
                          .answer
                      }
                    </MarkdownRenderer>
                  </div>
                </div>

                {/* Vertical Separator */}
                <div className="w-px bg-border"></div>

                {/* Agent 2 Response */}
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Agent 2
                  </div>
                  <div className="text-sm text-foreground">
                    <MarkdownRenderer>
                      {
                        (multiAgentData || localMultiAgentData).responses.agent2
                          .answer
                      }
                    </MarkdownRenderer>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="text-xs text-muted-foreground border-t border-border/30 pt-2">
                <p>
                  <strong>Summary:</strong>{" "}
                  {(multiAgentData || localMultiAgentData).summary}
                </p>
                <p>
                  <strong>Payment Flow:</strong>{" "}
                  {(multiAgentData || localMultiAgentData).payment_flow}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {actions ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
          {actions}
        </div>
      ) : null}
      {showTimeStamp && createdAt ? (
        <time
          dateTime={dateTime}
          className={cn(
            "mt-1 block px-1 text-xs text-muted-foreground",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      ) : null}
    </div>
  );
};

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const ReasoningBlock = ({ part }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group w-full overflow-hidden rounded-md border bg-muted/20"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              <span>Thinking</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent forceMount>
          <motion.div
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="border-t"
          >
            <div className="p-2">
              <div className="whitespace-pre-wrap text-xs">
                {part.reasoning}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

function ToolCall({ toolInvocations }) {
  if (!toolInvocations?.length) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {toolInvocations.map((invocation, index) => {
        const isCancelled =
          invocation.state === "result" &&
          invocation.result.__cancelled === true;

        if (isCancelled) {
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
            >
              <Ban className="h-4 w-4" />
              <span>
                Cancelled{" "}
                <span className="font-mono">
                  {"`"}
                  {invocation.toolName}
                  {"`"}
                </span>
              </span>
            </div>
          );
        }

        switch (invocation.state) {
          case "partial-call":
          case "call":
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
              >
                <Terminal className="h-4 w-4" />
                <span>
                  Calling{" "}
                  <span className="font-mono">
                    {"`"}
                    {invocation.toolName}
                    {"`"}
                  </span>
                  ...
                </span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            );
          case "result":
            return (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  <span>
                    Result from{" "}
                    <span className="font-mono">
                      {"`"}
                      {invocation.toolName}
                      {"`"}
                    </span>
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-foreground">
                  {JSON.stringify(invocation.result, null, 2)}
                </pre>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
