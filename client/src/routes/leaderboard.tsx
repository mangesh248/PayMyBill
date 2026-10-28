import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trophy, Sparkles, Flame, ShieldCheck, Heart, Zap, Award } from "lucide-react";
import { Shell, Avatar, inr } from "@/components/social";
import { api, type SponsorT } from "@/lib/api";
import { toast } from "sonner";

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
const BADGES = ["👑 Top Angel", "🔥 5d Streak", "⚡ Fast Payer", "💎 Karma Legend"];

function Leaderboard() {
  const [period, setPeriod] = useState<"This week" | "This month" | "All time">("All time");
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

  const cheerSponsor = (_name: string) => {
    // In-place interaction without intrusive toast
  };

  const top3 = sponsors.slice(0, 3);
  // Podium ordering: 2nd place (left), 1st place (center), 3rd place (right)
  const podium: SponsorT[] = [top3[1], top3[0], top3[2]].filter((s): s is SponsorT => Boolean(s));

  return (
    <Shell title="Supporter Hall of Fame">
      {/* Period Tabs */}
      <div className="flex gap-2 border-b border-border px-4 py-3 bg-card/40 backdrop-blur-md">
        {(["This week", "This month", "All time"] as const).map((p) => {
          const isActive = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-2xl px-4 py-1.5 text-xs font-black transition active:scale-95 ${
                isActive
                  ? "brand-gradient-bg text-white shadow-md shadow-rose-500/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Community Impact Summary Card */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-4 shadow-sm">
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Total Community Relief
          </span>
          <p className="font-display text-2xl font-black text-primary mt-1">
            {inr(totalContributed)}
          </p>
          <span className="text-[10px] text-emerald-500 font-extrabold flex items-center gap-0.5 mt-0.5">
            100% directly to billers
          </span>
        </div>
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Settled Emergencies
          </span>
          <p className="font-display text-2xl font-black text-foreground mt-1">
            {totalBills} Bills
          </p>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5 mt-0.5">
            Active community support
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
          <p className="font-bold">Calculating sponsor standings...</p>
        </div>
      ) : (
        <>
          {/* Podium Top 3 with Neon Pedestals */}
          {podium.length > 0 && (
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-3 border-b border-border px-3 sm:px-6 pb-6 pt-6">
              {podium.map((s) => {
                const rankIndex = sponsors.findIndex((item) => item.handle === s.handle);
                const isWinner = rankIndex === 0;
                const isSecond = rankIndex === 1;

                return (
                  <div key={s.handle} className="flex min-w-0 flex-col items-center text-center">
                    <span className="text-2xl animate-bounce duration-1000">
                      {medals[rankIndex] || "🏅"}
                    </span>
                    <div
                      className={`story-ring mt-1 rounded-full p-[3px] shadow-lg ${
                        isWinner ? "shadow-amber-500/20" : ""
                      }`}
                    >
                      <div className="rounded-full bg-background p-[2px]">
                        <Avatar
                          name={s.name}
                          size={
                            isWinner
                              ? "h-16 w-16 sm:h-20 sm:w-20 text-xl font-black"
                              : isSecond
                              ? "h-14 w-14 sm:h-16 sm:w-16 text-lg font-black"
                              : "h-12 w-12 sm:h-14 sm:w-14 text-sm font-black"
                          }
                        />
                      </div>
                    </div>
                    <p className="mt-2 w-full truncate text-xs sm:text-sm font-black text-foreground">
                      {s.name}
                    </p>
                    <p className="font-display text-xs sm:text-sm font-black text-primary">
                      {inr(s.total)}
                    </p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary mt-0.5">
                      {s.bills} bills paid
                    </span>

                    {/* Pedestal block with Neon Glow */}
                    <div
                      className={`mt-2 w-full rounded-t-3xl border-t border-x transition-all duration-300 flex flex-col items-center justify-center ${
                        isWinner
                          ? "h-24 bg-gradient-to-t from-amber-500/25 to-amber-500/5 border-amber-500/50 shadow-md shadow-amber-500/20"
                          : isSecond
                          ? "h-18 bg-gradient-to-t from-slate-400/20 to-slate-400/5 border-slate-400/40"
                          : "h-14 bg-gradient-to-t from-orange-500/20 to-orange-500/5 border-orange-500/40"
                      }`}
                    >
                      <span className="font-display text-lg font-black text-foreground/80">
                        #{rankIndex + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Supporter List */}
          <ol className="divide-y divide-border/60">
            {sponsors.map((s, i) => (
              <li
                key={s.handle || i}
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-muted/30"
              >
                <span className="w-6 text-center font-display text-sm font-black text-muted-foreground">
                  {i < 3 ? medals[i] : i + 1}
                </span>
                <Avatar name={s.name} size="h-10 w-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-black text-sm text-foreground">{s.name}</p>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{s.handle} · {s.bills} bills paid
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-display font-black text-sm text-foreground">{inr(s.total)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      sponsored
                    </p>
                  </div>
                  <button
                    onClick={() => cheerSponsor(s.name)}
                    aria-label="Cheer"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition"
                  >
                    👏
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Motivational Bottom Callout */}
      <div className="mx-4 my-8 rounded-3xl border border-border bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-cyan-500/10 p-5 text-center">
        <Sparkles className="mx-auto h-7 w-7 text-primary mb-1 animate-pulse" />
        <h4 className="font-display text-base font-black text-foreground">
          Want to climb the Hall of Fame?
        </h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Help sponsor any friend's everyday bill or emergency. 100% goes directly to their provider account.
        </p>
      </div>
    </Shell>
  );
}
