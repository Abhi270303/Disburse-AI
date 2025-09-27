import { ChatDemo } from "@/components/chat";

export default function ChatPage({ params }) {
  return <ChatDemo initialChatId={params.id} />;
}
