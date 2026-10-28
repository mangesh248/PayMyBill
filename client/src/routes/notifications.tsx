import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, IndianRupee, MessageCircle, UserPlus, CheckCheck, Sparkles, Zap } from "lucide-react";
import { Shell, Avatar, Empty } from "@/components/social";
import { api, type NotificationT } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — HelpMePay" },
      { name: "description", content: "Your latest bill sponsorships, contributions, likes, and comments." },
      { property: "og:title", content: "Notifications — HelpMePay" },
      { property: "og:description", content: "Your latest activity and sponsorships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

const getIcon = (type: string) => {
  switch (type) {
    case "contribution":
      return <Zap className="h-4 w-4 text-emerald-400 fill-emerald-400" />;
    case "like":
      return <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />;
    case "comment":
      return <MessageCircle className="h-4 w-4 text-sky-400 fill-sky-400/20" />;
    case "follow":
      return <UserPlus className="h-4 w-4 text-purple-400" />;
    default:
      return <Sparkles className="h-4 w-4 text-primary" />;
  }
};

function Notifications() {
  const [items, setItems] = useState<NotificationT[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifs = () => {
    setLoading(true);
    api.getNotifications()
      .then((data) => {
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch((err) => console.error("Error fetching notifications:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read! ✨");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark notifications as read");
    }
  };

  return (
    <Shell title="Notifications">
      {/* Subheader with Mark All Read */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card/40 backdrop-blur-md">
        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
          {unreadCount > 0 ? `${unreadCount} New Alerts` : "All Caught Up"}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-black text-primary hover:underline transition active:scale-95"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto h-7 w-7 text-primary animate-spin mb-2" />
          <p className="font-bold">Loading activity...</p>
        </div>
      ) : items.length === 0 ? (
        <Empty>No notifications yet. When people help or like your wishes, they will appear here!</Empty>
      ) : (
        <div className="divide-y divide-border/60">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3.5 px-4 py-4 transition ${
                !n.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"
              }`}
            >
              <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-muted/80 shadow-xs border border-border/50">
                {getIcon(n.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar name={n.who} size="h-6 w-6 text-xs" />
                  <span className="font-black text-foreground text-sm">{n.who}</span>
                  <span className="text-xs text-muted-foreground">· {n.time}</span>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/90">
                  {n.text}
                </p>
                {n.amount && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-black text-emerald-500">
                    <Zap className="h-3 w-3 fill-emerald-500" />
                    +₹{n.amount.toLocaleString("en-IN")} directly credited
                  </span>
                )}
              </div>

              {!n.is_read && (
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-2 ring-background" />
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
