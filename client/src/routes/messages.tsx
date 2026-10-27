import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { Shell, Avatar, Empty } from "@/components/social";
import { api, type ConversationT, type MessageT } from "@/lib/api";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — HelpMePay" },
      { name: "description", content: "Chat with friends and sponsors about bills and wishes." },
      { property: "og:title", content: "Messages — HelpMePay" },
      { property: "og:description", content: "Chat with friends and sponsors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Messages,
});

function Messages() {
  const [conversations, setConversations] = useState<ConversationT[]>([]);
  const [activePartner, setActivePartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<MessageT[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchConversations = () => {
    setLoading(true);
    api.getConversations()
      .then((data) => setConversations(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const openThread = (c: ConversationT) => {
    setActivePartner(c);
    setThreadLoading(true);
    api.getMessageThread(c.id)
      .then((data) => {
        setActivePartner(data.partner);
        setMessages(data.messages);
      })
      .catch((err) => console.error(err))
      .finally(() => setThreadLoading(false));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activePartner) return;

    const messageText = text.trim();
    setText("");
    setSending(true);

    try {
      const created = await api.sendMessage({
        recipient_id: activePartner.id,
        text: messageText,
      });

      setMessages((prev) => [...prev, created]);
      // Update conversations preview
      setConversations((prev) =>
        prev.map((c) => (c.id === activePartner.id ? { ...c, last: messageText, time: "Just now" } : c))
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (activePartner) {
    return (
      <Shell title={activePartner.name}>
        {/* Chat Thread Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card/60 backdrop-blur">
          <button
            onClick={() => setActivePartner(null)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar name={activePartner.name} size="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{activePartner.name}</p>
            <p className="text-xs text-muted-foreground">@{activePartner.handle}</p>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex flex-col space-y-3 p-4 min-h-[60vh] max-h-[70vh] overflow-y-auto [scrollbar-width:none]">
          {threadLoading ? (
            <p className="py-12 text-center text-xs text-muted-foreground">Loading chat history...</p>
          ) : messages.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">
              Send a note or thank your sponsor!
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.is_me ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    m.is_me
                      ? "rounded-br-xs bg-primary text-primary-foreground font-medium"
                      : "rounded-bl-xs bg-muted/80 text-foreground"
                  }`}
                >
                  <p className="leading-relaxed">{m.text}</p>
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground">{m.time}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3.5 bg-background">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${activePartner.name.split(" ")[0]}…`}
            className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Send"
            className="rounded-full bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title="Messages">
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <Empty>No active conversations yet. Messages and notes from sponsors will appear here!</Empty>
      ) : (
        conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => openThread(c)}
            className="flex w-full items-center gap-3.5 border-b border-border px-4 py-4 text-left transition hover:bg-muted/20"
          >
            <Avatar name={c.name} size="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="truncate font-bold text-foreground text-sm">{c.name}</p>
                <span className="text-[11px] text-muted-foreground">{c.time}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground mt-0.5">{c.last}</p>
            </div>
          </button>
        ))
      )}
    </Shell>
  );
}
