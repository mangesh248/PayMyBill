import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
    <Shell title="Explore">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none]">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeCat === c
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading category wishes...
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No wishes in this category yet. Be the first to add one!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1">
          {items.map((p) => {
            const pct = Math.min(100, Math.round((p.raised / p.goal) * 100));
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPost(p)}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted"
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-xs font-bold text-white">
                  <p className="truncate text-[11px] font-extrabold">{p.title}</p>
                  <div className="mt-0.5 flex justify-between text-[10px] text-white/90">
                    <span>{inr(p.raised)}</span>
                    <span className="text-primary font-extrabold">{pct}%</span>
                  </div>
                </div>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground shadow">
                    Pay Bill →
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
