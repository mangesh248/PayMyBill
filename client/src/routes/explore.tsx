import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Compass, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { Shell, inr } from "@/components/social";
import { api, type PostT } from "@/lib/api";
import { PaymentModal } from "@/components/PaymentModal";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Bills & Wishes — HelpMePay" },
      { name: "description", content: "Discover trending bills, emergency repairs, and wishes across categories." },
      { property: "og:title", content: "Explore Bills & Wishes — HelpMePay" },
      { property: "og:description", content: "Discover trending wishes and help pay everyday bills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

const cats = [
  "All",
  "Romance Tax",
  "Emergency Drip",
  "Academic Crisis",
  "Pet Damage",
  "Food & Groceries",
  "Medical & Wellness",
  "Tech & Tools",
  "Rent Lifeline",
  "Celebration & Birthday",
  "Travel & Transit",
];

function Explore() {
  const [activeCat, setActiveCat] = useState("All");
  const [items, setItems] = useState<PostT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostT | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getWishes({ category: activeCat === "All" ? undefined : activeCat })
      .then((data) => setItems(data))
      .catch((err) => console.error("Error exploring wishes:", err))
      .finally(() => setLoading(false));
  }, [activeCat]);

  const handleUpdate = (updated: any) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === selectedPost?.id ? { ...p, raised: updated.raised, status: updated.status } : p
      )
    );
  };

  return (
    <Shell title="Explore Bills">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 bg-card/40 backdrop-blur-md [scrollbar-width:none]">
        {cats.map((c) => {
          const isActive = activeCat === c;
          return (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 rounded-2xl px-4 py-1.5 text-xs font-black transition active:scale-95 ${
                isActive
                  ? "brand-gradient-bg text-white shadow-md shadow-rose-500/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto h-7 w-7 text-primary animate-spin mb-2" />
          <p className="font-bold">Discovering emergencies & wishes...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <p className="font-bold">No wishes in this category yet.</p>
          <p className="text-xs mt-1">Be the first to share one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 sm:p-3">
          {items.map((p) => {
            const pct = Math.min(100, Math.round((p.raised / p.goal) * 100));
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPost(p)}
                className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm transition active:scale-98"
              >
                <img
                  src={p.img}
                  alt={p.title}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80";
                  }}
                />

                {/* Top Badge */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-md">
                    {p.tag}
                  </span>
                  {p.status === "funded" ? (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white shadow">
                      PAID ✨
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black text-white shadow">
                      {pct}%
                    </span>
                  )}
                </div>

                {/* Bottom Overlay Gradient */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 text-white">
                  <p className="truncate text-xs font-black drop-shadow">{p.title}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/90">
                    <span className="font-display font-extrabold">{inr(p.raised)}</span>
                    <span className="text-[10px] text-white/70">goal {inr(p.goal)}</span>
                  </div>
                </div>

                {/* Hover overlay hint on desktop */}
                <div className="absolute inset-0 hidden sm:flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="flex items-center gap-1 rounded-2xl brand-gradient-bg px-3.5 py-1.5 text-xs font-black text-white shadow-lg">
                    <Zap className="h-3.5 w-3.5 fill-current" /> Pay Bill →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Bill Modal */}
      {selectedPost && (
        <PaymentModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onSuccess={handleUpdate}
        />
      )}
    </Shell>
  );
}
