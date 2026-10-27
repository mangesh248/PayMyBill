import { useState, useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home,
  Search,
  Compass,
  Bell,
  Mail,
  User,
  Trophy,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Sparkles,
  Check,
} from "lucide-react";
import { api, inr, type PostT, type SponsorT } from "@/lib/api";
import { PaymentModal } from "./PaymentModal";
import { NewWishModal } from "./NewWishModal";
import { CommentsModal } from "./CommentsModal";

export { inr };
export type { PostT };

export const stories = [
  "Puppy vs...",
  "Date Bill 🍝",
  "Charger RIP",
  "Mom's Cake",
  "Live Gig 🎸",
  "Rent 🏠",
  "Goa Trip",
  "Dentist 🦷",
];

export function Avatar({ name, size = "h-10 w-10" }: { name: string; size?: string }) {
  const initial = name ? name.trim()[0]?.toUpperCase() : "U";
  return (
    <div
      className={`${size} grid shrink-0 place-items-center rounded-full bg-accent font-display font-extrabold text-accent-foreground shadow-sm`}
    >
      {initial}
    </div>
  );
}

export function Post({
  p,
  onUpdate,
}: {
  p: PostT;
  onUpdate?: (updated: PostT) => void;
}) {
  const [liked, setLiked] = useState(p.liked ?? false);
  const [likesCount, setLikesCount] = useState(p.likes ?? 0);
  const [saved, setSaved] = useState(p.saved ?? false);
  const [commentsCount, setCommentsCount] = useState(p.comments ?? 0);
  const [isPaying, setIsPaying] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setLiked(p.liked ?? false);
    setLikesCount(p.likes ?? 0);
    setSaved(p.saved ?? false);
    setCommentsCount(p.comments ?? 0);
  }, [p.liked, p.likes, p.saved, p.comments]);

  const pct = Math.min(100, Math.round((p.raised / p.goal) * 100));

  const handleLike = async () => {
    const nextLiked = !liked;
    const nextCount = likesCount + (nextLiked ? 1 : -1);
    setLiked(nextLiked);
    setLikesCount(Math.max(0, nextCount));

    try {
      const res = await api.toggleLike(p.id);
      setLikesCount(res.likes);
      setLiked(res.liked);
    } catch {
      // Rollback on failure
      setLiked(!nextLiked);
      setLikesCount(likesCount);
    }
  };

  const handleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      const res = await api.toggleSave(p.id);
      setSaved(res.saved);
    } catch {
      setSaved(!nextSaved);
    }
  };

  const handleShare = () => {
    const shareUrl = typeof window !== "undefined" ? window.location.origin + `/search?q=${encodeURIComponent(p.title)}` : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentSuccess = (updatedData: any) => {
    if (onUpdate) {
      onUpdate({
        ...p,
        raised: updatedData.raised,
        status: updatedData.status,
      });
    }
  };

  return (
    <>
      <article className="border-b border-border px-4 py-5 sm:px-6 transition-colors hover:bg-muted/15">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} />
          <div className="min-w-0 flex-1 truncate text-sm">
            <span className="font-bold text-foreground">{p.name}</span>{" "}
            <span className="text-muted-foreground">
              @{p.handle} · {p.time}
            </span>
          </div>
          <button
            aria-label="More"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted transition"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-2xl border border-border shadow-sm">
          <img
            src={p.img}
            alt={p.title}
            width={1024}
            height={768}
            loading="lazy"
            className="aspect-[16/10] w-full object-cover transition duration-300 hover:scale-102"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80";
            }}
          />
          <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-[11px] font-extrabold tracking-widest backdrop-blur shadow-sm">
            {p.tag}
          </span>
          {p.status === "funded" && (
            <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold tracking-widest text-primary-foreground shadow-sm">
              ✨ 100% FUNDED
            </span>
          )}
        </div>

        <h2 className="mt-4 font-display text-xl font-extrabold leading-tight text-foreground">
          {p.title}
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>

        {/* Financial Progress Bar */}
        <div className="mt-4 rounded-xl bg-muted/80 p-3.5 border border-border/50">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <b className="font-display text-lg text-foreground">{inr(p.raised)}</b>{" "}
              <span className="text-muted-foreground">of {inr(p.goal)}</span>
            </span>
            <span className="text-xs font-bold text-primary">{pct}% FUNDED</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-border">
            <div
              className="story-ring h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Actions bar */}
        <div className="mt-3.5 flex items-center gap-1 text-sm text-muted-foreground">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-muted ${
              liked ? "text-primary font-bold" : ""
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-current text-primary" : ""}`} />
            {likesCount}
          </button>

          <button
            onClick={() => setIsCommenting(true)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-muted"
          >
            <MessageCircle className="h-5 w-5" />
            {commentsCount}
          </button>

          <button
            aria-label="Share"
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 transition hover:bg-muted"
          >
            {copied ? <Check className="h-5 w-5 text-primary" /> : <Share2 className="h-5 w-5" />}
            {copied && <span className="text-xs text-primary font-bold">Copied!</span>}
          </button>

          <button
            aria-label="Save"
            onClick={handleSave}
            className={`rounded-full px-2.5 py-1.5 transition hover:bg-muted ${
              saved ? "text-foreground" : ""
            }`}
          >
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current text-primary" : ""}`} />
          </button>

          <button
            onClick={() => setIsPaying(true)}
            className="ml-auto rounded-full bg-foreground px-4 py-2 text-sm font-extrabold text-background shadow transition hover:opacity-90 active:scale-95"
          >
            Help →
          </button>
        </div>
      </article>

      {/* Payment Modal */}
      {isPaying && (
        <PaymentModal
          post={p}
          onClose={() => setIsPaying(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Comments Modal */}
      {isCommenting && (
        <CommentsModal
          post={p}
          onClose={() => setIsCommenting(false)}
          onCommentAdded={() => setCommentsCount((c) => c + 1)}
        />
      )}
    </>
  );
}

const nav = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/messages", icon: Mail, label: "Messages" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function Shell({
  title,
  children,
  onWishCreated,
}: {
  title: string;
  children: ReactNode;
  onWishCreated?: (newWish: PostT) => void;
}) {
  const [topSponsors, setTopSponsors] = useState<SponsorT[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.getLeaderboard()
      .then((data) => {
        if (mounted) setTopSponsors(data.topThree || []);
      })
      .catch((err) => console.error("Leaderboard fetch error:", err));

    api.getNotifications()
      .then((data) => {
        if (mounted) setUnreadCount(data.unreadCount || 0);
      })
      .catch((err) => console.error("Notifications fetch error:", err));

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreated = (newWish: PostT) => {
    if (onWishCreated) onWishCreated(newWish);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1260px] justify-center">
      {/* Left Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col gap-1 border-r border-border px-3 py-5 sm:flex lg:w-64">
        <Link to="/" className="mb-4 flex items-center gap-2 px-3">
          <Sparkles className="h-7 w-7 text-primary" />
          <span className="hidden font-display text-xl font-extrabold lg:inline">HelpMePay</span>
        </Link>
        {nav.map(({ to, icon: I, label }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            activeProps={{ className: "font-bold text-primary" }}
            className="relative flex items-center gap-4 rounded-full px-3 py-3 text-lg hover:bg-muted transition"
          >
            <I className="h-6 w-6" />
            <span className="hidden lg:inline">{label}</span>
            {label === "Notifications" && unreadCount > 0 && (
              <span className="absolute left-6 top-2 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground lg:left-7">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}

        <button
          onClick={() => setIsWishModalOpen(true)}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary py-3 font-display font-extrabold text-primary-foreground shadow-lg transition hover:opacity-90 active:scale-98"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden lg:inline">New Wish</span>
        </button>
      </aside>

      {/* Main Column */}
      <main className="w-full min-w-0 max-w-[600px] border-r border-border pb-20 sm:pb-0">
        <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
          <h1 className="font-display text-xl font-extrabold">{title}</h1>
        </header>
        {children}
      </main>

      {/* Right Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 space-y-4 overflow-y-auto px-5 py-4 lg:block xl:w-80">
        <Link
          to="/search"
          className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-muted/80"
        >
          <Search className="h-4 w-4" />
          Search wishes & bills
        </Link>

        {/* Trending Categories */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="font-display text-lg font-extrabold">Trending Bills</h3>
          {[
            ["RomanceTax", "1.2k wishes"],
            ["EmergencyDrip", "860 wishes"],
            ["AcademicCrisis", "540 wishes"],
            ["PetDamage", "410 wishes"],
          ].map(([t, c]) => (
            <Link key={t} to="/search" search={{ q: t }} className="mt-3 block group">
              <p className="font-bold group-hover:text-primary transition">#{t}</p>
              <p className="text-xs text-muted-foreground">{c}</p>
            </Link>
          ))}
        </section>

        {/* Top Sponsors Widget */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="font-display text-lg font-extrabold">Top Sponsors</h3>
          {topSponsors.map((s, i) => (
            <div key={s.handle || i} className="mt-3 flex items-center gap-3">
              <span className="w-4 font-display font-extrabold text-primary">{i + 1}</span>
              <Avatar name={s.name} size="h-9 w-9" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{inr(s.total)} paid</p>
              </div>
            </div>
          ))}
          <Link to="/leaderboard" className="mt-4 block text-sm font-bold text-primary hover:underline">
            See full leaderboard →
          </Link>
        </section>
      </aside>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-background/95 py-3 backdrop-blur sm:hidden">
        {nav
          .filter((n) => ["/", "/search", "/leaderboard", "/notifications", "/profile"].includes(n.to))
          .map(({ to, icon: I, label }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary font-bold" }}
              className="relative p-1"
            >
              <I className="h-6 w-6" />
              {label === "Notifications" && unreadCount > 0 && (
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
          ))}
      </nav>

      {/* Modal for Creating New Wish */}
      {isWishModalOpen && (
        <NewWishModal
          onClose={() => setIsWishModalOpen(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}
