import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, IndianRupee, MessageCircle, UserPlus, CheckCheck } from "lucide-react";
import { Shell, Avatar, Empty } from "@/components/social";
import { api, type NotificationT } from "@/lib/api";

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
      return <IndianRupee className="h-5 w-5 text-primary" />;
    case "like":
      return <Heart className="h-5 w-5 text-rose-500 fill-rose-500/20" />;
    case "comment":
      return <MessageCircle className="h-5 w-5 text-sky-500" />;
    case "follow":
      return <UserPlus className="h-5 w-5 text-emerald-500" />;
    default:
      return <IndianRupee className="h-5 w-5 text-primary" />;
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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Shell title="Notifications">
      {/* Subheader with Mark All Read */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {unreadCount > 0 ? `${unreadCount} Unread Notifications` : "All Caught Up"}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading notifications...
        </div>
      ) : items.length === 0 ? (
        <Empty>No notifications yet. When people help or like your wishes, they will appear here!</Empty>
      ) : (
        items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 border-b border-border px-4 py-4 transition ${
              !n.is_read ? "bg-primary/5" : "hover:bg-muted/15"
            }`}
          >
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted/80 shadow-sm">
              {getIcon(n.type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Avatar name={n.who} size="h-6 w-6 text-xs" />
                <span className="font-bold text-foreground text-sm">{n.who}</span>
                <span className="text-xs text-muted-foreground">· {n.time}</span>
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-foreground/90">
                {n.text}
              </p>
              {n.amount && (
                <span className="mt-1.5 inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-extrabold text-primary">
                  +₹{n.amount.toLocaleString("en-IN")} received
                </span>
              )}
            </div>

            {!n.is_read && (
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>
        ))
      )}
    </Shell>
  );
}
