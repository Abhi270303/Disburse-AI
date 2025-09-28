"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { transcribeAudio } from "@/lib/audio-utils";
import { Chat } from "@/components/ui/chat";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "./chat-sidebar";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { chatStorage } from "@/lib/storage";
import scrollIntoView from "scroll-into-view-if-needed";

export function ChatDemo({ initialChatId }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(initialChatId);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isCreatingChat = useRef(false);
  const chatMessagesRef = useRef(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  // Initialize chat on first load
  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialized || isCreatingChat.current) return;

      console.log("Initializing chat with currentChatId:", currentChatId);
      try {
        // First, try to cleanup any corrupted sessions
        try {
          const cleanedCount = await chatStorage.cleanupCorruptedSessions();
          if (cleanedCount > 0) {
            console.log(
              `Cleaned up ${cleanedCount} corrupted sessions during initialization`
            );
          }
        } catch (cleanupError) {
          console.error(
            "Error cleaning up corrupted sessions during initialization:",
            cleanupError
          );
        }

        const savedSessions = await chatStorage.getAllSessions();
        console.log("Loaded saved sessions:", savedSessions);

        if (savedSessions && savedSessions.length > 0) {
          // Sort sessions by lastUpdated in descending order
          const sortedSessions = savedSessions.sort(
            (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
          );
          setChatSessions(sortedSessions);

          // If there's a current chat, load its messages
          if (currentChatId) {
            const currentSession = sortedSessions.find(
              (session) => session.id === currentChatId
            );
            if (currentSession) {
              console.log("Loading existing chat:", currentSession);
              setMessages(currentSession.messages || []);
            }
          } else if (window.location.pathname === "/") {
            // On root path, show empty state
            console.log("On root path, showing empty state");
            setCurrentChatId(null);
            setMessages([]);
          }
        } else {
          console.log("No saved sessions, showing empty state");
          setCurrentChatId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error loading chat sessions:", error);
        setCurrentChatId(null);
        setMessages([]);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeChat();
  }, [currentChatId]); // Only run when currentChatId changes

  // Update current chat when ID changes
  useEffect(() => {
    if (currentChatId && chatSessions?.length > 0) {
      const currentSession = chatSessions.find(
        (session) => session?.id === currentChatId
      );
      if (currentSession) {
        setMessages(currentSession.messages || []);
      }
    }
  }, [currentChatId, chatSessions]);

  // Save sessions to storage
  useEffect(() => {
    if (chatSessions.length > 0) {
      const saveSessions = async () => {
        try {
          // Sort sessions by lastUpdated before saving
          const sortedSessions = [...chatSessions].sort(
            (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
          );

          // Filter out sessions with invalid IDs before saving
          const validSessions = sortedSessions.filter(
            (session) =>
              session &&
              session.id &&
              typeof session.id === "string" &&
              session.id.trim() !== ""
          );

          if (validSessions.length > 0) {
            await chatStorage.saveAllSessions(validSessions);
          }
        } catch (error) {
          console.error("Error saving chat sessions:", error);
          // Try to cleanup corrupted sessions
          try {
            const cleanedCount = await chatStorage.cleanupCorruptedSessions();
            if (cleanedCount > 0) {
              console.log(`Cleaned up ${cleanedCount} corrupted sessions`);
            }
          } catch (cleanupError) {
            console.error(
              "Error cleaning up corrupted sessions:",
              cleanupError
            );
          }
        }
      };

      saveSessions();
    }
  }, [chatSessions]);

  // Debug useEffect to monitor chatSessions changes
  useEffect(() => {
    console.log("ChatSessions state changed:", chatSessions.length, "sessions");
  }, [chatSessions]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Add a ref to track if a submission is in progress
  const isSubmitting = useRef(false);

  // Modify the handleSubmit function to use the ref
  const handleSubmit = async (
    e,
    { experimental_attachments, chatMode = "free" } = {}
  ) => {
    e?.preventDefault();
    if (isSubmitting.current) {
      console.log("Already submitting, skipping");
      return;
    }

    console.log("Submitting message with attachments:", {
      input,
      experimental_attachments,
      currentChatId,
      messagesLength: messages.length,
    });

    if (!input.trim() && !experimental_attachments?.length) return;

    let chatId = currentChatId;
    let updatedMessages = messages;

    // Add user message
    const userMessage = {
      role: "user",
      content: input,
      experimental_attachments: experimental_attachments,
    };

    // Update messages state
    updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setIsAssistantLoading(true);
    isSubmitting.current = true;

    // Update chat title if this is the first message
    if (messages.length === 0 && chatId) {
      updateChatTitle(chatId, updatedMessages);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          session_id: chatId || "",
          username: "weshall",
          chatMode: chatMode,
          experimental_attachments: experimental_attachments || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Prepare for streaming SSE
      let assistantMessage = {
        role: "assistant",
        content: "",
      };
      let finalSessionId = chatId;
      let sessionIdSet = false;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\n/).filter(Boolean);
        buffer = "";

        for (const event of events) {
          let data;
          try {
            data = JSON.parse(event);
          } catch (e) {
            continue;
          }

          console.log("SSE event from backend:", data);

          if (data.type === "sessionId" && data.sessionId) {
            if (!sessionIdSet) {
              finalSessionId = data.sessionId;
              setCurrentChatId(finalSessionId);
              sessionIdSet = true;
            }
          }

          if (data.type === "chunk" && data.content) {
            assistantMessage.content += data.content;
            setMessages([...updatedMessages, assistantMessage]);
          }

          if (data.type === "qrCode") {
            // Add QR code data to the message
            assistantMessage.qrCodeData = {
              qrCodeDataURL: data.qrCodeDataURL,
              safeAddress: data.safeAddress,
              paymentId: data.paymentId,
              chainName: data.chainName,
              tokenAmount: data.tokenAmount,
              timeRemaining: data.timeRemaining,
            };
            setMessages([...updatedMessages, assistantMessage]);
          }

          if (data.type === "paymentRequired") {
            // Add payment required data to the message
            assistantMessage.paymentRequiredData = {
              paymentData: data.paymentData,
            };
            setMessages([...updatedMessages, assistantMessage]);
          }

          if (data.type === "multiAgentResponse") {
            // Add multi-agent response data to the message
            assistantMessage.multiAgentData = data.multiAgentData;
            setMessages([...updatedMessages, assistantMessage]);
          }

          if (data.type === "done") {
            // Final update of messages
            setMessages([...updatedMessages, assistantMessage]);

            // Update chat session
            setChatSessions((prev) => {
              const sessionId = finalSessionId || chatId;
              const prevSession = prev.find((s) => s.id === sessionId) || {};
              const updatedSession = {
                ...prevSession,
                id: sessionId,
                title: generateChatTitle([
                  ...updatedMessages,
                  assistantMessage,
                ]),
                messages: [...updatedMessages, assistantMessage],
                created: prevSession.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
              };
              const filtered = prev.filter((s) => s.id !== sessionId);
              return [updatedSession, ...filtered];
            });
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request.",
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsAssistantLoading(false);
      isSubmitting.current = false;
    }
  };

  const createNewChat = async () => {
    if (isCreatingChat.current) {
      console.log("Already creating a chat, skipping");
      return null;
    }

    try {
      isCreatingChat.current = true;
      console.log("Creating new chat and clearing all existing chats");

      // Clear all existing chats from storage first
      await chatStorage.clearAllSessions();

      // Clear state
      setChatSessions([]);
      setCurrentChatId(null);
      setMessages([]);

      // Force a small delay to ensure state updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: "New Chat",
        messages: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      // Set only the new chat
      setChatSessions([newChat]);
      setCurrentChatId(newChatId);
      setMessages([]);

      // Save the new session
      await chatStorage.saveSession(newChat);
      console.log("New chat created with ID:", newChatId, "Total sessions:", 1);
      return newChatId;
    } catch (error) {
      console.error("Error in createNewChat:", error);
      return null;
    } finally {
      isCreatingChat.current = false;
    }
  };

  const selectChat = (chatId) => {
    const selectedChat = chatSessions.find((chat) => chat.id === chatId);
    if (selectedChat) {
      setCurrentChatId(chatId);
      setMessages(selectedChat.messages || []);
    }
  };

  const generateChatTitle = (messages) => {
    if (messages.length > 0) {
      const firstUserMessage = messages.find((msg) => msg.role === "user");
      if (firstUserMessage) {
        // Truncate the message to create a title
        let title = firstUserMessage.content.slice(0, 30);
        if (firstUserMessage.content.length > 30) {
          title += "...";
        }
        return title;
      }
    }
    return "Untitled";
  };

  const updateChatTitle = (chatId, messages) => {
    if (messages.length > 0) {
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === chatId
            ? {
                ...session,
                title: generateChatTitle(messages),
                lastUpdated: new Date().toISOString(),
              }
            : session
        )
      );
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation(); // Prevent triggering the chat selection

    setChatSessions((prev) => prev.filter((session) => session.id !== chatId));
    await chatStorage.deleteSession(chatId);

    // If the last chat is deleted, navigate to root and show empty state
    if (chatSessions.length === 1 && chatSessions[0].id === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      router.push("/");
      return;
    }

    // If the current chat is deleted, navigate to root and show empty state
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      router.push("/");
      return;
    }
  };

  const append = (message) => {
    if (message.role === "user") {
      // If there's no current chat, create one first
      if (!currentChatId && !isCreatingChat.current) {
        createNewChat().then((newChatId) => {
          if (newChatId) {
            const updatedMessages = [...messages, message];
            setMessages(updatedMessages);
            setIsLoading(true);

            // Update chat title if this is the first message
            if (messages.length === 0) {
              updateChatTitle(newChatId, updatedMessages);
            }

            fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: updatedMessages,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then((data) => {
                const assistantMessage = {
                  role: "assistant",
                  content:
                    data.content ||
                    "I apologize, but I couldn't generate a response.",
                };

                const finalMessages = [...updatedMessages, assistantMessage];
                setMessages(finalMessages);

                // Update chat session
                setChatSessions((prev) => {
                  const sessionId = currentChatId || newChatId || lastSessionId;
                  const prevSession =
                    prev.find((s) => s.id === sessionId) || {};
                  const updatedSession = {
                    ...prevSession,
                    id: sessionId,
                    title: generateChatTitle(finalMessages),
                    messages: finalMessages,
                    created: prevSession.created || new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                  };
                  const filtered = prev.filter((s) => s.id !== sessionId);
                  return [updatedSession, ...filtered];
                });
              })
              .catch((error) => {
                console.error("Error:", error);
                const errorMessage = {
                  role: "assistant",
                  content:
                    "Sorry, I encountered an error while processing your request.",
                };

                const finalMessages = [...updatedMessages, errorMessage];
                setMessages(finalMessages);

                // Update chat session with error
                setChatSessions((prev) => {
                  const sessionId = currentChatId || newChatId || lastSessionId;
                  const prevSession =
                    prev.find((s) => s.id === sessionId) || {};
                  const updatedSession = {
                    ...prevSession,
                    id: sessionId,
                    title: generateChatTitle(finalMessages),
                    messages: finalMessages,
                    created: prevSession.created || new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                  };
                  const filtered = prev.filter((s) => s.id !== sessionId);
                  return [updatedSession, ...filtered];
                });
              })
              .finally(() => {
                setIsLoading(false);
              });
          }
        });
      } else {
        const updatedMessages = [...messages, message];
        setMessages(updatedMessages);
        setIsLoading(true);

        // Update chat title if this is the first message
        if (messages.length === 0) {
          updateChatTitle(currentChatId, updatedMessages);
        }

        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            const assistantMessage = {
              role: "assistant",
              content:
                data.content ||
                "I apologize, but I couldn't generate a response.",
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);

            // Update chat session
            setChatSessions((prev) => {
              const sessionId = currentChatId || newChatId || lastSessionId;
              const prevSession = prev.find((s) => s.id === sessionId) || {};
              const updatedSession = {
                ...prevSession,
                id: sessionId,
                title: generateChatTitle(finalMessages),
                messages: finalMessages,
                created: prevSession.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
              };
              const filtered = prev.filter((s) => s.id !== sessionId);
              return [updatedSession, ...filtered];
            });
          })
          .catch((error) => {
            console.error("Error:", error);
            const errorMessage = {
              role: "assistant",
              content:
                "Sorry, I encountered an error while processing your request.",
            };

            const finalMessages = [...updatedMessages, errorMessage];
            setMessages(finalMessages);

            // Update chat session with error
            setChatSessions((prev) => {
              const sessionId = currentChatId || newChatId || lastSessionId;
              const prevSession = prev.find((s) => s.id === sessionId) || {};
              const updatedSession = {
                ...prevSession,
                id: sessionId,
                title: generateChatTitle(finalMessages),
                messages: finalMessages,
                created: prevSession.created || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
              };
              const filtered = prev.filter((s) => s.id !== sessionId);
              return [updatedSession, ...filtered];
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } else {
      setMessages((prev) => [...prev, message]);
    }
  };

  const stop = () => {
    console.log("Stop requested (no-op in non-streaming implementation)");
  };

  // Add handleAssistantMessage helper
  const handleAssistantMessage = async (finalMessages, sessionId) => {
    setMessages(finalMessages);
    // Scroll to bottom using ChatMessages ref if available
    if (chatMessagesRef.current && chatMessagesRef.current.scrollToBottom) {
      chatMessagesRef.current.scrollToBottom(true);
    } else {
      setTimeout(() => {
        const chatContainer = document.querySelector(
          ".flex-1.overflow-y-auto.relative"
        );
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
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
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar Component */}
      <ChatSidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        createNewChat={createNewChat}
        selectChat={selectChat}
        deleteChat={deleteChat}
        userDropdownOpen={userDropdownOpen}
        setUserDropdownOpen={setUserDropdownOpen}
        messages={messages}
      />

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto md:ml-0">
        <div className="mx-auto max-w-3xl min-h-full grid place-items-center px-4 md:px-0">
          <Chat
            className="flex flex-col min-h-full w-full"
            messages={messages}
            handleSubmit={handleSubmit}
            input={input}
            handleInputChange={handleInputChange}
            isGenerating={isLoading}
            isTyping={isAssistantLoading || isLoading}
            stop={stop}
            append={append}
            setMessages={setMessages}
            transcribeAudio={transcribeAudio}
            suggestions={[
              "What is the weather in San Francisco?",
              "Tell me something interesting",
            ]}
            currentChatId={currentChatId}
            ref={chatMessagesRef}
          />
        </div>
      </div>
    </div>
  );
}
