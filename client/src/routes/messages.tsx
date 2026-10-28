import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Shell, Avatar, Empty } from "@/components/social";
import { api, type ConversationT, type MessageT } from "@/lib/api";
import { toast } from "sonner";

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

const QUICK_THANKS = [
  "Thank you so much! 🙏",
  "You're a lifesaver! 💖",
  "Bill is verified! ⚡",
  "Sending biggest hugs 🤗",
];

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
      setConversations((prev) =>
        prev.map((c) => (c.id === activePartner.id ? { ...c, last: messageText, time: "Just now" } : c))
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (activePartner) {
    return (
      <Shell title={activePartner.name}>
        {/* Chat Thread Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card/60 backdrop-blur-md">
          <button
            onClick={() => setActivePartner(null)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar name={activePartner.name} size="h-9 w-9 text-xs" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-sm font-black text-foreground">{activePartner.name}</p>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">@{activePartner.handle}</p>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex flex-col space-y-3 p-4 min-h-[55vh] max-h-[65vh] overflow-y-auto [scrollbar-width:none]">
          {threadLoading ? (
            <p className="py-12 text-center text-xs text-muted-foreground">Loading chat history...</p>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Sparkles className="mx-auto h-6 w-6 text-primary mb-1 opacity-70" />
              <p>Say hi or thank your sponsor!</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.is_me ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-sm shadow-xs ${
                    m.is_me
                      ? "rounded-br-xs brand-gradient-bg text-white font-medium shadow-rose-500/10"
                      : "rounded-bl-xs bg-muted/70 text-foreground border border-border/40"
                  }`}
                >
                  <p className="leading-relaxed">{m.text}</p>
                </div>
                <span className="mt-1 px-1.5 text-[10px] text-muted-foreground">{m.time}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-t border-border/60 bg-card/20 [scrollbar-width:none]">
          {QUICK_THANKS.map((chip) => (
            <button
              key={chip}
              onClick={() => setText(chip)}
              className="shrink-0 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="flex gap-2 p-3.5 bg-background">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${activePartner.name.split(" ")[0]}…`}
            className="flex-1 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm outline-none focus:border-primary transition"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Send"
            className="rounded-2xl brand-gradient-bg p-3 text-white transition hover:brightness-110 disabled:opacity-40 active:scale-95 shadow-md shadow-rose-500/20"
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
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto h-7 w-7 text-primary animate-spin mb-2" />
          <p className="font-bold">Loading conversations...</p>
        </div>
      ) : conversations.length === 0 ? (
        <Empty>No active conversations yet. Messages and notes from sponsors will appear here!</Empty>
      ) : (
        <div className="divide-y divide-border/60">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openThread(c)}
              className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition hover:bg-muted/20 active:scale-99"
            >
              <Avatar name={c.name} size="h-12 w-12 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="truncate font-black text-foreground text-sm">{c.name}</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">{c.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5">{c.last}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
