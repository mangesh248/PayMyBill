import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
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
    <Shell title="Search">
      {/* Search Input Bar */}
      <div className="border-b border-border p-4 bg-card/40">
        <label className="flex items-center gap-2.5 rounded-full border border-border bg-muted/60 px-4 py-3 focus-within:border-primary transition">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by keywords, tags (#RomanceTax), or names..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Searching wishes...</div>
      ) : results.length === 0 ? (
        <Empty>{q ? `No wishes match "${q}"` : "Type something above to search wishes"}</Empty>
      ) : (
        results.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
      )}
    </Shell>
  );
}
