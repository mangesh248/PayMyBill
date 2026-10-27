import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Shell, Post, Avatar, Empty } from "@/components/social";
import { api, type PostT } from "@/lib/api";
import { NewWishModal } from "@/components/NewWishModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HelpMePay — Swipe. Smile. Support." },
      { name: "description", content: "A social platform where people share everyday expenses, bills, and wishes—and sponsors directly fund them." },
      { property: "og:title", content: "HelpMePay" },
      { property: "og:description", content: "Directly pay and sponsor everyday bills and small wishes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState("For you");
  const [wishes, setWishes] = useState<PostT[]>([]);
  const [stories, setStories] = useState<{ id: string; title: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewWishOpen, setIsNewWishOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    api.getWishes({ tab })
      .then((data) => setWishes(data))
      .catch((err) => console.error("Error fetching feed:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [tab]);

  useEffect(() => {
    api.getStories()
      .then((data) => setStories(data))
      .catch((err) => console.error("Error fetching stories:", err));
  }, []);

  const handleUpdate = (updated: PostT) => {
    setWishes((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleCreated = (newWish: PostT) => {
    setWishes((prev) => [newWish, ...prev]);
  };

  return (
    <Shell title="Home" onWishCreated={handleCreated}>
      {/* Feed Tabs */}
      <div className="flex border-b border-border">
        {["For you", "Friends"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-sm font-semibold transition hover:bg-muted ${
              tab === t ? "text-foreground font-bold" : "text-muted-foreground"
            }`}
          >
            <span className={`pb-3.5 ${tab === t ? "border-b-4 border-primary font-display" : ""}`}>
              {t}
            </span>
          </button>
        ))}
      </div>

      {/* Stories / Quick Wishes Bar */}
      <div className="flex gap-4 overflow-x-auto border-b border-border px-4 py-4 [scrollbar-width:none]">
        {/* New Wish Circle Button */}
        <button
          onClick={() => setIsNewWishOpen(true)}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 group"
        >
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-primary text-primary transition group-hover:scale-105 group-hover:bg-primary/10">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold">New Wish</span>
        </button>

        {/* Stories from live database */}
        {stories.map((s) => (
          <button
            key={s.id}
            onClick={() => setIsNewWishOpen(true)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 group"
          >
            <div className="story-ring rounded-full p-[2.5px] transition group-hover:scale-105">
              <div className="rounded-full bg-background p-[2px]">
                <Avatar name={s.name || s.title} size="h-14 w-14" />
              </div>
            </div>
            <span className="w-full truncate text-xs font-medium text-foreground">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Wishes Feed */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <p>Loading community wishes & bills...</p>
        </div>
      ) : wishes.length === 0 ? (
        <Empty>No wishes found in this feed</Empty>
      ) : (
        wishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
      )}

      <Empty>✨ You're caught up on friends' wishes</Empty>

      {/* New Wish Modal */}
      {isNewWishOpen && (
        <NewWishModal
          onClose={() => setIsNewWishOpen(false)}
          onSuccess={handleCreated}
        />
      )}
    </Shell>
  );
}
