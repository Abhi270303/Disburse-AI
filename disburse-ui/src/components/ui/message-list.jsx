import { ChatMessage } from "@/components/ui/chat-message";
import { TypingIndicator } from "@/components/ui/typing-indicator";

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
}) {
  return (
    <div className="space-y-4 overflow-visible">
      {messages.map((message, index) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions;

        // Find the user's question for assistant messages
        let userQuestion = null;
        if (message.role === "assistant" && index > 0) {
          // Look for the most recent user message before this assistant message
          for (let i = index - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
              userQuestion = messages[i].content;
              break;
            }
          }
        }

        return (
          <ChatMessage
            key={index}
            showTimeStamp={showTimeStamps}
            {...message}
            userQuestion={userQuestion}
            multiAgentData={message.multiAgentData}
            {...additionalOptions}
          />
        );
      })}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
