import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trophy, Sparkles } from "lucide-react";
import { Shell, Avatar, inr } from "@/components/social";
import { api, type SponsorT } from "@/lib/api";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Sponsor Leaderboard — HelpMePay" },
      { name: "description", content: "Top sponsors ranked by total amount paid toward friends and community bills." },
      { property: "og:title", content: "Sponsor Leaderboard — HelpMePay" },
      { property: "og:description", content: "Top sponsors ranked by total bills paid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Leaderboard,
});

const medals = ["🥇", "🥈", "🥉"];

function Leaderboard() {
  const [period, setPeriod] = useState("All time");
  const [sponsors, setSponsors] = useState<SponsorT[]>([]);
  const [totalContributed, setTotalContributed] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard(period)
      .then((data) => {
        setSponsors(data.sponsors || []);
        setTotalContributed(data.totalContributed || 0);
        setTotalBills(data.totalBills || 0);
      })
      .catch((err) => console.error("Leaderboard error:", err))
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = sponsors.slice(0, 3);
  // Podium ordering: 2nd place (left), 1st place (center), 3rd place (right)
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <Shell title="Leaderboard">
      {/* Period Tabs */}
      <div className="flex gap-2 border-b border-border px-4 py-3">
        {["This week", "This month", "All time"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
              period === p
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Community Impact Summary Card */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <span className="text-xs text-muted-foreground">Total Community Relief</span>
          <p className="font-display text-2xl font-extrabold text-primary">{inr(totalContributed)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Bills Fully or Partially Funded</span>
          <p className="font-display text-2xl font-extrabold text-foreground">{totalBills} Bills</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Calculating sponsor standings...
        </div>
      ) : (
        <>
          {/* Podium Top 3 */}
          {podium.length > 0 && (
            <div className="grid grid-cols-3 items-end gap-3 border-b border-border px-4 pb-6 pt-6">
              {podium.map((s) => {
                const rankIndex = sponsors.findIndex((item) => item.handle === s.handle);
                const isWinner = rankIndex === 0;
                const isSecond = rankIndex === 1;

                return (
                  <div key={s.handle} className="flex min-w-0 flex-col items-center text-center">
                    <span className="text-2xl">{medals[rankIndex] || "🏅"}</span>
                    <div className="story-ring mt-1 rounded-full p-[3px]">
                      <div className="rounded-full bg-background p-[2px]">
                        <Avatar
                          name={s.name}
                          size={isWinner ? "h-20 w-20 text-2xl" : isSecond ? "h-16 w-16 text-xl" : "h-14 w-14"}
                        />
                      </div>
                    </div>
                    <p className="mt-2 w-full truncate text-sm font-extrabold text-foreground">{s.name}</p>
                    <p className="font-display text-sm font-extrabold text-primary">{inr(s.total)}</p>
                    <p className="text-[10px] text-muted-foreground">{s.bills} bills</p>

                    {/* Pedestal block */}
                    <div
                      className={`mt-2 w-full rounded-t-2xl border-t border-border bg-muted/70 transition-all ${
                        isWinner ? "h-24 bg-primary/10 border-primary/30" : isSecond ? "h-16" : "h-12"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Full List */}
          <ol>
            {sponsors.map((s, i) => (
              <li
                key={s.handle || i}
                className="flex items-center gap-3 border-b border-border px-4 py-3.5 transition hover:bg-muted/20"
              >
                <span className="w-7 text-center font-display text-base font-extrabold text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar name={s.name} size="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @{s.handle} · {s.bills} bills paid
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold text-foreground">{inr(s.total)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">total sponsored</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Pay any bill to join the leaderboard & climb the ranks!
      </p>
    </Shell>
  );
}
