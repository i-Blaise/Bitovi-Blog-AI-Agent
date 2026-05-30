import { useCallback, useState } from "react";
import { queryRag } from "./api/client";
import { Header } from "./components/Header";
import { Toast } from "./components/Toast";
import { ChatPanel } from "./components/chat/ChatPanel";
import { IngestionPanel } from "./components/ingest/IngestionPanel";
import type { ChatMessage } from "./types";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState(false);

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-u`, role: "user", text },
    ]);
    setIsThinking(true);

    try {
      const result = await queryRag(text);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: result.answer,
          genTime: result.generation_time,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: `**Error.** ${message}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:h-screen lg:py-5">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          onSend={handleSend}
        />
        <IngestionPanel onComplete={() => setToast(true)} />
      </div>
      <Toast open={toast} onClose={() => setToast(false)} />
    </div>
  );
}

export default App;
