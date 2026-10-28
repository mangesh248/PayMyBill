import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Flame, Users, Zap, Sparkles } from "lucide-react";
import { Shell, Post, Avatar, Empty } from "@/components/social";
import { api, type PostT } from "@/lib/api";
import { NewWishModal } from "@/components/NewWishModal";
import { StoryModal } from "@/components/StoryModal";
import { PaymentModal } from "@/components/PaymentModal";

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

export function PostSkeleton() {
  return (
    <div className="border-b border-border/80 p-4 sm:p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 rounded-md bg-muted" />
          <div className="h-2.5 w-20 rounded-md bg-muted/60" />
        </div>
      </div>
      <div className="aspect-[16/10] w-full rounded-2xl bg-muted/70" />
      <div className="h-5 w-3/4 rounded-md bg-muted" />
      <div className="h-3.5 w-full rounded-md bg-muted/60" />
      <div className="h-12 w-full rounded-2xl bg-muted/50" />
    </div>
  );
}

function Index() {
  const [tab, setTab] = useState<"For you" | "Friends" | "Urgent ⚡">("For you");
  const [wishes, setWishes] = useState<PostT[]>([]);
  const [stories, setStories] = useState<{ id: string; title: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isNewWishOpen, setIsNewWishOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyPaymentPost, setStoryPaymentPost] = useState<any | null>(null);

  const PAGE_LIMIT = 8;

  const loadData = (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const apiTab = tab === "Urgent ⚡" ? "For you" : tab;
    const sortParam = tab === "Urgent ⚡" ? "urgent" : undefined;

    api.getWishes({ tab: apiTab, sort: sortParam, page: pageNum, limit: PAGE_LIMIT })
      .then((data) => {
        if (append) {
          setWishes((prev) => [...prev, ...data]);
        } else {
          setWishes(data);
        }
        setHasMore(data.length === PAGE_LIMIT);
        setPage(pageNum);
      })
      .catch((err) => console.error("Error fetching feed:", err))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadData(1, false);
  }, [tab]);

  useEffect(() => {
    api.getStories()
      .then((data) => setStories(data))
      .catch((err) => console.error("Error fetching stories:", err));
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleUpdate = (updated: PostT) => {
    setWishes((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleCreated = (newWish: PostT) => {
    setWishes((prev) => [newWish, ...prev]);
  };

  return (
    <Shell title="Community Feed" onWishCreated={handleCreated}>
      {/* Feed Tabs with GenZ Icons & Smooth Underline */}
      <div className="flex border-b border-border bg-card/40 backdrop-blur-md">
        {[
          { id: "For you", label: "For You", icon: Flame },
          { id: "Friends", label: "Friends", icon: Users },
          { id: "Urgent ⚡", label: "Urgent ⚡", icon: Zap },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-black transition relative flex items-center justify-center gap-1.5 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {isActive && (
                <span className="absolute inset-x-4 bottom-0 h-1 rounded-full brand-gradient-bg" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stories / Quick Wishes Bar with Instagram-Style Rings */}
      <div className="flex gap-3.5 overflow-x-auto border-b border-border/80 px-4 py-4 [scrollbar-width:none]">
        {/* New Wish Circle Button */}
        <button
          onClick={() => setIsNewWishOpen(true)}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 group"
        >
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-primary text-primary transition group-hover:scale-105 group-hover:bg-primary/10 active:scale-95">
            <Plus className="h-6 w-6 stroke-[3]" />
          </div>
          <span className="text-[11px] font-black text-foreground">New Wish</span>
        </button>

        {/* Stories from live database */}
        {stories.map((s, idx) => (
          <button
            key={s.id || idx}
            onClick={() => setActiveStoryIndex(idx)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 group"
          >
            <div className="story-ring rounded-full p-[2.5px] transition group-hover:scale-105 active:scale-95 shadow-sm">
              <div className="rounded-full bg-background p-[2px]">
                <Avatar name={s.name || s.title} size="h-14 w-14 text-sm" />
              </div>
            </div>
            <span className="w-full truncate text-center text-[11px] font-bold text-foreground">
              {s.title}
            </span>
          </button>
        ))}
      </div>

      {/* Wishes Feed */}
      {loading ? (
        <div>
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : wishes.length === 0 ? (
        <Empty>No wishes found in this feed yet</Empty>
      ) : (
        wishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
      )}

      {/* Load More Button or Caught Up State */}
      {!loading && wishes.length > 0 && (
        <div className="p-6 text-center">
          {hasMore ? (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-muted/80 hover:bg-muted px-6 py-2.5 text-xs font-black text-foreground transition active:scale-95 disabled:opacity-50 border border-border"
            >
              {loadingMore ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Loading wishes...</span>
                </>
              ) : (
                <span>Load More Wishes ↓</span>
              )}
            </button>
          ) : (
            <Empty>✨ You're caught up on community wishes!</Empty>
          )}
        </div>
      )}

      {/* New Wish Modal */}
      {isNewWishOpen && (
        <NewWishModal
          onClose={() => setIsNewWishOpen(false)}
          onSuccess={handleCreated}
        />
      )}

      {/* Interactive Story Modal */}
      {activeStoryIndex !== null && stories.length > 0 && (
        <StoryModal
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onOpenPayment={(storyWish) => setStoryPaymentPost(storyWish)}
        />
      )}

      {/* Payment Modal triggered from Story */}
      {storyPaymentPost && (
        <PaymentModal
          post={storyPaymentPost}
          onClose={() => setStoryPaymentPost(null)}
          onSuccess={(updated) => {
            setStoryPaymentPost(null);
            handleUpdate(updated);
          }}
        />
      )}
    </Shell>
  );
}
