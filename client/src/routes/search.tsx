import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, X, Sparkles, TrendingUp } from "lucide-react";
import { Shell, Post, Empty } from "@/components/social";
import { api, type PostT } from "@/lib/api";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Wishes & Bills — HelpMePay" },
      { name: "description", content: "Search wishes, emergency bills, and community stories." },
      { property: "og:title", content: "Search Wishes & Bills — HelpMePay" },
      { property: "og:description", content: "Find wishes and people." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

const POPULAR_TAGS = [
  "RomanceTax",
  "EmergencyDrip",
  "AcademicCrisis",
  "PetDamage",
  "RentLifeline",
  "TechRescue",
];

function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PostT[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api.getWishes({ q: q.trim() || undefined })
        .then((data) => setResults(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [q]);

  const handleUpdate = (updated: PostT) => {
    setResults((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  return (
    <Shell title="Search Community">
      {/* Search Input Bar */}
      <div className="border-b border-border p-4 bg-card/40 backdrop-blur-md">
        <label className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted/50 px-4 py-3 focus-within:border-primary transition">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bills, tags (#RomanceTax), or names..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        {/* Popular Tags Quick Filters */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <span className="text-[11px] font-black text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
            <TrendingUp className="h-3 w-3 text-primary" /> Popular:
          </span>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setQ(tag)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                q === tag
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 bg-card hover:border-primary/50 text-muted-foreground"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto h-7 w-7 text-primary animate-spin mb-2" />
          <p className="font-bold">Searching community wishes...</p>
        </div>
      ) : results.length === 0 ? (
        <Empty>{q ? `No wishes match "${q}"` : "Type a keyword or select a hashtag above to explore"}</Empty>
      ) : (
        results.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
      )}
    </Shell>
  );
}
