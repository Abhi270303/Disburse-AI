"use client";
import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
} from "react";
import { ArrowDown, ThumbsDown, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import scrollIntoView from "scroll-into-view-if-needed";

import { cn } from "@/lib/utils";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageInput } from "@/components/ui/message-input";
import { MessageList } from "@/components/ui/message-list";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { chatStorage } from "@/lib/storage";

export const Chat = forwardRef(function Chat(
  {
    messages,
    handleSubmit,
    input,
    handleInputChange,
    stop,
    isGenerating,
    append,
    suggestions,
    className,
    onRateResponse,
    setMessages,
    transcribeAudio,
    currentChatId,
    isTyping,
  },
  ref
) {
  const [chatMode, setChatMode] = useState("free"); // "free" or "pro"
  const { theme } = useTheme();
  const isEmpty = messages.length === 0;
  const [isInputCentered, setIsInputCentered] = useState(isEmpty);
  const [editingMessage, setEditingMessage] = useState(null);
  const isInitialMount = useRef(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Reset centered state when messages change
  useEffect(() => {
    if (messages.length > 0 && isInputCentered) {
      setIsInputCentered(false);
    }
  }, [messages.length, isInputCentered]);

  // Handle initial mount and refresh
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
  }, []);

  const handleEditMessage = useCallback(
    async (content, originalMessage) => {
      console.log("handleEditMessage called with:", {
        content,
        originalMessage,
      });

      // Find the index of the message being edited
      const editIndex = messages.findIndex(
        (m) => m.role === "user" && m.content === originalMessage
      );

      console.log("Found edit index:", editIndex);

      if (editIndex !== -1) {
        // Create new messages array with edited message and remove subsequent messages
        const newMessages = messages.slice(0, editIndex + 1).map((m) => {
          if (m.role === "user" && m.content === originalMessage) {
            return { ...m, content };
          }
          return m;
        });

        console.log("Updating messages:", { old: messages, new: newMessages });

        // Update messages in state
        setMessages(newMessages);

        // Update storage
        try {
          if (currentChatId) {
            const currentSession = await chatStorage.getSession(currentChatId);
            if (currentSession) {
              await chatStorage.saveSession({
                ...currentSession,
                messages: newMessages,
                lastUpdated: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.error("Error updating chat session:", error);
        }

        // Reset editing state
        setEditingMessage(null);

        // Make API call to get response
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(async (data) => {
            const assistantMessage = {
              role: "assistant",
              content:
                data.content ||
                "I apologize, but I couldn't generate a response.",
            };

            const finalMessages = [...newMessages, assistantMessage];
            setMessages(finalMessages);

            // Update storage with final messages
            try {
              if (currentChatId) {
                const currentSession = await chatStorage.getSession(
                  currentChatId
                );
                if (currentSession) {
                  await chatStorage.saveSession({
                    ...currentSession,
                    messages: finalMessages,
                    lastUpdated: new Date().toISOString(),
                  });
                }
              }
            } catch (error) {
              console.error("Error updating chat session:", error);
            }
          })
          .catch(async (error) => {
            console.error("Error:", error);
            const errorMessage = {
              role: "assistant",
              content:
                "Sorry, I encountered an error while processing your request.",
            };

            const finalMessages = [...newMessages, errorMessage];
            setMessages(finalMessages);

            // Update storage with error message
            try {
              if (currentChatId) {
                const currentSession = await chatStorage.getSession(
                  currentChatId
                );
                if (currentSession) {
                  await chatStorage.saveSession({
                    ...currentSession,
                    messages: finalMessages,
                    lastUpdated: new Date().toISOString(),
                  });
                }
              }
            } catch (error) {
              console.error("Error updating chat session:", error);
            }
          });
      }
    },
    [messages, setMessages, currentChatId]
  );

  const handleSubmitWithEdit = useCallback(
    async (e, { experimental_attachments } = {}) => {
      e.preventDefault();
      console.log("handleSubmitWithEdit called with:", {
        input,
        experimental_attachments,
        chatMode,
      });

      // If we're in empty state, start transition
      if (isEmpty) {
        setIsTransitioning(true);
      }

      if (editingMessage) {
        // Remove the old message and add the edited one
        const newMessages = messages.filter(
          (m) => m.content !== editingMessage
        );
        setMessages(newMessages);
        setEditingMessage(null);
      }

      // Create the user message
      const userMessage = {
        role: "user",
        content: input,
        ...(experimental_attachments && { experimental_attachments }),
      };
      console.log("Created user message:", userMessage);

      // Update messages state
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Update storage
      try {
        if (currentChatId) {
          const currentSession = await chatStorage.getSession(currentChatId);
          if (currentSession) {
            await chatStorage.saveSession({
              ...currentSession,
              messages: newMessages,
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error updating chat session:", error);
      }

      // Call the original handleSubmit with chatMode
      await handleSubmit(e, { experimental_attachments, chatMode });
    },
    [
      messages,
      input,
      editingMessage,
      setMessages,
      currentChatId,
      isEmpty,
      chatMode,
    ]
  );

  // Enhanced stop function that marks pending tool calls as cancelled
  const handleStop = useCallback(() => {
    stop?.();

    if (!setMessages) return;

    const latestMessages = [...messagesRef.current];
    const lastAssistantMessage = latestMessages.findLast(
      (m) => m.role === "assistant"
    );

    if (!lastAssistantMessage) return;

    let needsUpdate = false;
    let updatedMessage = { ...lastAssistantMessage };

    if (lastAssistantMessage.toolInvocations) {
      const updatedToolInvocations = lastAssistantMessage.toolInvocations.map(
        (toolInvocation) => {
          if (toolInvocation.state === "call") {
            needsUpdate = true;
            return {
              ...toolInvocation,
              state: "result",
              result: {
                content: "Tool execution was cancelled",
                __cancelled: true,
              },
            };
          }
          return toolInvocation;
        }
      );

      if (needsUpdate) {
        updatedMessage = {
          ...updatedMessage,
          toolInvocations: updatedToolInvocations,
        };
      }
    }

    if (lastAssistantMessage.parts && lastAssistantMessage.parts.length > 0) {
      const updatedParts = lastAssistantMessage.parts.map((part) => {
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation &&
          part.toolInvocation.state === "call"
        ) {
          needsUpdate = true;
          return {
            ...part,
            toolInvocation: {
              ...part.toolInvocation,
              state: "result",
              result: {
                content: "Tool execution was cancelled",
                __cancelled: true,
              },
            },
          };
        }
        return part;
      });

      if (needsUpdate) {
        updatedMessage = {
          ...updatedMessage,
          parts: updatedParts,
        };
      }
    }

    if (needsUpdate) {
      const messageIndex = latestMessages.findIndex(
        (m) => m.id === lastAssistantMessage.id
      );
      if (messageIndex !== -1) {
        latestMessages[messageIndex] = updatedMessage;
        setMessages(latestMessages);
      }
    }
  }, [stop, setMessages, messagesRef]);

  const messageOptions = useCallback(
    (message) => {
      if (!message || !message.role) return {};
      if (message.role === "user") {
        return {
          onEdit: (content) => {
            console.log("onEdit called with:", { content, message });
            handleEditMessage(content, message.content);
          },
        };
      }
      return {
        actions: onRateResponse ? (
          <>
            <div className="border-r pr-1">
              <CopyButton
                content={message.content}
                copyMessage="Copied response to clipboard!"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onRateResponse(message.id, "thumbs-up")}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onRateResponse(message.id, "thumbs-down")}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <CopyButton
            content={message.content}
            copyMessage="Copied response to clipboard!"
          />
        ),
      };
    },
    [onRateResponse, handleEditMessage]
  );

  const chatMessagesRef = useRef(null);

  const handleAssistantMessage = async (finalMessages, sessionId) => {
    setMessages(finalMessages);
    chatMessagesRef.current?.scrollToBottom(true);
    // Save to storage
    if (sessionId) {
      const currentSession = await chatStorage.getSession(sessionId);
      if (currentSession) {
        await chatStorage.saveSession({
          ...currentSession,
          messages: finalMessages,
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  };

  return (
    <ChatContainer
      className={cn(
        "flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      {isEmpty && !isTransitioning ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Branding section */}
          <div className="flex flex-col items-center mb-8">
            {/* Sidebar logo */}
            <div className="mb-3">
              <Image
                src="/logo/main.svg"
                width={48}
                height={48}
                alt="Disburse logo"
                className={cn(
                  "rounded-xl transition-colors",
                  theme === "light" && "invert"
                )}
              />
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
              Disburse AI
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              Conversational AI for the future
            </div>
          </div>
          <div className="w-full max-w-xl rounded-2xl bg-background/80 flex flex-col items-center">
            <ChatForm
              className="w-full"
              isPending={isGenerating || isTyping}
              handleSubmit={handleSubmitWithEdit}
            >
              {({ files, setFiles, onSubmit }) => (
                <MessageInput
                  value={input}
                  onChange={handleInputChange}
                  stop={handleStop}
                  isGenerating={isGenerating}
                  transcribeAudio={transcribeAudio}
                  chatMode={chatMode}
                  onChatModeChange={setChatMode}
                  onSubmit={onSubmit}
                />
              )}
            </ChatForm>
          </div>
          <div className="mt-6 text-xs text-muted-foreground text-center">
            Powered by <span className="font-semibold">Disburse AI</span>
          </div>
        </div>
      ) : (
        <>
          <ChatMessages
            ref={ref}
            messages={messages}
            animation="fade"
            isInitialMount={isInitialMount.current}
          >
            <div className="px-6 py-6 space-y-4">
              <MessageList
                messages={messages}
                isTyping={isTyping}
                messageOptions={messageOptions}
              />
            </div>
          </ChatMessages>
          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent h-24 pointer-events-none" />
            <ChatForm
              className="p-6 relative"
              isPending={isGenerating || isTyping}
              handleSubmit={handleSubmitWithEdit}
            >
              {({ files, setFiles, onSubmit }) => (
                <MessageInput
                  value={input}
                  onChange={handleInputChange}
                  stop={handleStop}
                  isGenerating={isGenerating}
                  transcribeAudio={transcribeAudio}
                  chatMode={chatMode}
                  onChatModeChange={setChatMode}
                  onSubmit={onSubmit}
                />
              )}
            </ChatForm>
          </div>
        </>
      )}
    </ChatContainer>
  );
});
Chat.displayName = "Chat";

export const ChatMessages = forwardRef(function ChatMessages(
  { messages, children, isInitialMount },
  ref
) {
  const {
    containerRef,
    bottomRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  } = useAutoScroll([messages]);

  useImperativeHandle(ref, () => ({
    scrollToBottom,
  }));

  // Track if we should auto-scroll
  const shouldAutoScrollRef = useRef(true);
  const isTypingRef = useRef(false);
  const isInitialLoad = useRef(true);
  const lastScrollPosition = useRef(0);

  // Save scroll position before unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        lastScrollPosition.current = containerRef.current.scrollTop;
      }
    };
  }, []);

  // Add effect to scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // On initial load or refresh, restore last scroll position or scroll to bottom
      if (isInitialLoad.current) {
        if (lastScrollPosition.current > 0) {
          // Restore previous scroll position
          containerRef.current?.scrollTo({
            top: lastScrollPosition.current,
            behavior: "instant",
          });
        } else {
          // Scroll to bottom if no previous position
          scrollToBottom(true);
        }
        isInitialLoad.current = false;
        return;
      }
      // Only scroll to bottom for new assistant messages if we're already near bottom
      if (
        lastMessage &&
        lastMessage.role === "assistant" &&
        shouldAutoScrollRef.current
      ) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom]);

  // Handle scroll events to determine if we should auto-scroll
  const handleScrollWithCheck = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If user has scrolled up more than 100px from bottom, disable auto-scroll
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    handleScroll(e);
  };

  // Set typing state when input changes
  useEffect(() => {
    const handleInput = () => {
      isTypingRef.current = true;
      // Reset typing state after a short delay
      setTimeout(() => {
        isTypingRef.current = false;
      }, 1000);
    };

    const inputElement = document.querySelector("textarea");
    if (inputElement) {
      inputElement.addEventListener("input", handleInput);
      return () => inputElement.removeEventListener("input", handleInput);
    }
  }, []);

  // In ChatMessages, replace scrollIntoView logic with direct scroll
  useLayoutEffect(() => {
    if (messages.length > 0) {
      // Debug logging
      console.log("containerRef.current:", containerRef.current);
      if (containerRef.current) {
        console.log(
          "containerRef.current.scrollTop:",
          containerRef.current.scrollTop
        );
        console.log(
          "containerRef.current.scrollHeight:",
          containerRef.current.scrollHeight
        );
        // Direct scroll
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
        // Try with setTimeout
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
            console.log(
              "setTimeout scrollTop:",
              containerRef.current.scrollTop
            );
          }
        }, 50);
      }
      // Fallback: scrollIntoView on bottomRef
      if (bottomRef.current) {
        const scrollToBottom = () => {
          if (bottomRef.current) {
            bottomRef.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
            console.log("bottomRef.scrollIntoView called");
          }
        };
        // Try immediate scroll
        scrollToBottom();
        // Also try with a small delay to ensure DOM is ready
        setTimeout(scrollToBottom, 60);
      }
    }
  }, [messages]);

  return (
    <>
      <div
        className="flex-1 overflow-y-auto relative"
        ref={containerRef}
        onScroll={handleScrollWithCheck}
        onTouchStart={handleTouchStart}
      >
        <div className="px-6 py-6 space-y-4">
          {children}
          <div ref={bottomRef} style={{ scrollMarginBottom: 48, height: 0 }} />
          <div style={{ height: 32 }} /> {/* Spacer for extra scroll room */}
        </div>
      </div>

      {/* ArrowDown button - positioned relative to form */}
      {!shouldAutoScroll && (
        <div className="fixed bottom-[120px] right-6 z-50">
          <Button
            onClick={() => scrollToBottom(true)}
            className="h-8 w-8 rounded-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm hover:bg-background/80 transition-all duration-200 border border-border/20"
            size="icon"
            variant="ghost"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
});

export const ChatContainer = forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("grid h-full w-full grid-rows-[1fr_auto]", className)}
      {...props}
    />
  );
});
ChatContainer.displayName = "ChatContainer";

export const ChatForm = forwardRef(
  ({ children, handleSubmit, isPending, className }, ref) => {
    const [files, setFiles] = useState(null);

    const onSubmit = async (event, { experimental_attachments } = {}) => {
      event.preventDefault();
      console.log("ChatForm onSubmit called with:", {
        files,
        experimental_attachments,
      });

      try {
        // If we have experimental_attachments from MessageInput, use those directly
        if (experimental_attachments) {
          console.log(
            "Using experimental_attachments from MessageInput:",
            experimental_attachments
          );
          await handleSubmit(event, { experimental_attachments });
          setFiles(null);
          return;
        }

        // If we have files in the form state, convert them
        if (files && files.length > 0) {
          console.log("Converting files from form state:", files);
          const fileList = await Promise.all(
            Array.from(files).map(async (file) => {
              const dataUrl = await fileToDataUrl(file);
              return {
                name: file.name,
                type: file.type,
                url: dataUrl,
              };
            })
          );
          console.log("Converted files from form state:", fileList);
          await handleSubmit(event, { experimental_attachments: fileList });
          setFiles(null);
          return;
        }

        // If no files or attachments, just submit normally
        console.log("Submitting without attachments");
        await handleSubmit(event);
      } catch (error) {
        console.error("Error in form submission:", error);
      }
    };

    return (
      <form ref={ref} onSubmit={onSubmit} className={className} noValidate>
        {children({ files, setFiles, onSubmit })}
      </form>
    );
  }
);
ChatForm.displayName = "ChatForm";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
