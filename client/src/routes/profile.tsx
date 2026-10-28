import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, Sparkles, Share2, Flame, Award, Heart, Copy, Check, LogOut } from "lucide-react";
import { Shell, Post, inr, Empty } from "@/components/social";
import { api, type ProfileT, type PostT } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — HelpMePay" },
      { name: "description", content: "Your published wishes, sponsored bills, and community statistics." },
      { property: "og:title", content: "Profile — HelpMePay" },
      { property: "og:description", content: "Your wishes and sponsorships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { isAuthenticated, logout, openAuthModal } = useAuth();
  const [tab, setTab] = useState<"Wishes" | "Sponsored" | "Saved">("Wishes");
  const [data, setData] = useState<ProfileT | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchProfile = () => {
    setLoading(true);
    api.getProfile()
      .then((res) => setData(res))
      .catch((err) => console.error("Error fetching profile:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, [isAuthenticated]);

  const handleUpdate = (updated: PostT) => {
    if (!data) return;
    setData({
      ...data,
      myWishes: data.myWishes.map((w) => (w.id === updated.id ? updated : w)),
      sponsoredWishes: data.sponsoredWishes.map((w) => (w.id === updated.id ? updated : w)),
    });
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Profile link copied! Share on Instagram / WhatsApp 🌟");
    setTimeout(() => setCopied(false), 2000);
  };

  const user = data?.user;
  const stats = data?.stats;
  const streak = (data as any)?.stats?.streak_days || (data as any)?.user?.streak_days || 1;

  return (
    <Shell title="My Impact Profile">
      {/* Banner */}
      <div className="relative h-32 sm:h-36 w-full brand-gradient-bg overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute right-4 top-4 flex gap-2">
          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                fetchProfile();
              }}
              className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-black text-white/90 backdrop-blur-md hover:bg-black/60 transition active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-black shadow-md hover:bg-zinc-100 transition active:scale-95"
            >
              <span>Sign In</span>
            </button>
          )}

          <button
            onClick={handleShareProfile}
            className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md hover:bg-black/60 transition active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Share"}</span>
          </button>
        </div>
      </div>

      {/* User Header */}
      <div className="px-4 sm:px-6">
        <div className="flex justify-between items-end">
          <div className="-mt-12 grid h-24 w-24 place-items-center rounded-3xl border-4 border-background brand-gradient-bg font-display text-3xl font-black text-white shadow-xl shadow-rose-500/20">
            {user?.avatar || "Y"}
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-black text-primary">
            <Flame className="h-4 w-4 fill-primary" />
            <span>{streak} Day Streak</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-2xl font-black text-foreground">
              {user?.name || "You"}
            </h2>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            @{user?.handle || "you"} · {user?.bio || "Making everyday wishes come true ✨"}
          </p>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-3xl border border-border bg-card py-3.5 shadow-xs">
            <p className="font-display text-xl font-black text-foreground">{stats?.wishes_count ?? 0}</p>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
              Wishes
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card py-3.5 shadow-xs">
            <p className="font-display text-xl font-black text-primary">{inr(stats?.total_paid ?? 0)}</p>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
              Impact Paid
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card py-3.5 shadow-xs">
            <p className="font-display text-xl font-black text-foreground">{stats?.followers ?? 0}</p>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
              Supporters
            </p>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="mt-6 flex border-b border-border bg-card/40 backdrop-blur-md">
        {(["Wishes", "Sponsored", "Saved"] as const).map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs sm:text-sm font-black transition relative ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t}</span>
              {isActive && (
                <span className="absolute inset-x-4 bottom-0 h-1 rounded-full brand-gradient-bg" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto h-7 w-7 text-primary animate-spin mb-2" />
          <p className="font-bold">Loading profile items...</p>
        </div>
      ) : tab === "Wishes" ? (
        data?.myWishes && data.myWishes.length > 0 ? (
          data.myWishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
        ) : (
          <Empty>You haven't shared any wishes yet. Tap "New Wish" to share your first bill!</Empty>
        )
      ) : tab === "Sponsored" ? (
        data?.sponsoredWishes && data.sponsoredWishes.length > 0 ? (
          data.sponsoredWishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
        ) : (
          <Empty>You haven't sponsored any bills yet. Help someone on the feed to earn your supporter badge!</Empty>
        )
      ) : (
        data?.savedWishes && data.savedWishes.length > 0 ? (
          data.savedWishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
        ) : (
          <Empty>Nothing saved yet. Tap the bookmark icon on any wish to save it for later.</Empty>
        )
      )}
    </Shell>
  );
}
