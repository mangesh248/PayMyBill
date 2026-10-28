import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  ShieldCheck,
  Zap,
  Sun,
  Moon,
  Flame,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  Flag,
  X,
} from "lucide-react";
import { api, inr, type PostT, type SponsorT } from "@/lib/api";
import { PaymentModal } from "./PaymentModal";
import { NewWishModal } from "./NewWishModal";
import { CommentsModal } from "./CommentsModal";
import { LegalModal } from "./LegalModal";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

export { inr };
export type { PostT };

export function rankSponsors<T extends { total: number }>(sponsors: T[]): T[] {
  return [...sponsors].sort((a, b) => b.total - a.total);
}

export function Avatar({ name, size = "h-10 w-10 text-sm" }: { name: string; size?: string }) {
  const initial = name ? name.trim()[0]?.toUpperCase() : "U";
  return (
    <div
      className={`${size} grid shrink-0 place-items-center rounded-full brand-gradient-bg font-display font-black text-white shadow-sm`}
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
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [liked, setLiked] = useState(p.liked ?? false);
  const [likesCount, setLikesCount] = useState(p.likes ?? 0);
  const [saved, setSaved] = useState(p.saved ?? false);
  const [commentsCount, setCommentsCount] = useState(p.comments ?? 0);
  const [isPaying, setIsPaying] = useState(false);
  const [prefilledAmount, setPrefilledAmount] = useState<number | undefined>(undefined);
  const [isCommenting, setIsCommenting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userReactions, setUserReactions] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<string>("fraud");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    setLiked(p.liked ?? false);
    setLikesCount(p.likes ?? 0);
    setSaved(p.saved ?? false);
    setCommentsCount(p.comments ?? 0);
  }, [p.liked, p.likes, p.saved, p.comments]);

  useEffect(() => {
    if (isAuthenticated && p.user_id && p.user_id !== user?.id) {
      api.getFollowStatus(p.user_id)
        .then((res) => setIsFollowing(res.isFollowing))
        .catch(() => {});
    }
  }, [p.user_id, isAuthenticated, user?.id]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      const res = await api.toggleFollow(p.user_id);
      setIsFollowing(res.following);
      toast.success(res.message);
    } catch {
      toast.error("Failed to update follow status");
    }
  };

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

  const shareToWhatsApp = () => {
    const text = `Help fund "${p.title}" on HelpMePay! Directly sponsor verified bills: ${window.location.origin}/search?q=${encodeURIComponent(p.title)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setIsMenuOpen(false);
  };

  const shareToTwitter = () => {
    const text = `Check out "${p.title}" on @HelpMePay! Crowdfund small bills directly: ${window.location.origin}/search?q=${encodeURIComponent(p.title)}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    setIsMenuOpen(false);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    setIsSubmittingReport(true);
    try {
      const res = await api.reportWish(p.id, { reason: reportReason, details: reportDetails });
      toast.success(res.message);
      setIsReporting(false);
      setReportDetails("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    setUserReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
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

  const openPaymentWithAmount = (amt?: number) => {
    setPrefilledAmount(amt);
    setIsPaying(true);
  };

  return (
    <>
      <article className="border-b border-border/80 px-4 py-5 sm:px-6 transition-all duration-200 hover:bg-muted/20">
        {/* Post Top Row */}
        <div className="flex items-center gap-3">
          <Avatar name={p.name} />
          <div className="min-w-0 flex-1 truncate text-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-foreground">{p.name}</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              {user?.handle !== p.handle && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black transition active:scale-95 ${
                    isFollowing
                      ? "bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {isFollowing ? "Following" : "+ Follow"}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              @{p.handle} · {p.time}
            </p>
          </div>
          <div className="relative">
            <button
              aria-label="More Options"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-30 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={shareToWhatsApp}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition text-left"
                >
                  <span>💬 Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={shareToTwitter}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition text-left"
                >
                  <span>🐦 Share on X (Twitter)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleShare();
                    setIsMenuOpen(false);
                    toast.success("Wish link copied to clipboard!");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition text-left"
                >
                  <span>📋 Copy Link</span>
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsReporting(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition text-left"
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>Report Wish</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Post Image Container */}
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-border shadow-sm group">
          <img
            src={p.img}
            alt={p.title}
            width={1024}
            height={768}
            loading="lazy"
            className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-102"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80";
            }}
          />
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span className="rounded-full bg-card/90 px-3 py-1 text-[11px] font-black tracking-wider backdrop-blur-md shadow-xs border border-border/40">
              {p.tag}
            </span>
          </div>

          {p.status === "funded" ? (
            <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black tracking-widest text-white shadow-md">
              ✨ 100% FUNDED
            </span>
          ) : p.provider_name ? (
            <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-950/85 px-3 py-1 text-[10px] font-black tracking-wide text-emerald-300 backdrop-blur-md border border-emerald-500/40 shadow-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>⚡ {p.provider_name}</span>
            </span>
          ) : (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black tracking-wide text-white backdrop-blur-md border border-white/20">
              ⚡ Direct Provider
            </span>
          )}
        </div>

        {/* Title and Story */}
        <h2 className="mt-3.5 font-display text-xl font-black leading-tight text-foreground">
          {p.title}
        </h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{p.body}</p>

        {/* Financial Progress Bar */}
        <div className="mt-4 rounded-2xl bg-muted/60 p-3.5 border border-border/50">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <b className="font-display text-lg font-black text-foreground">{inr(p.raised)}</b>{" "}
              <span className="text-xs text-muted-foreground">of {inr(p.goal)}</span>
            </span>
            <span className="text-xs font-black text-primary">{pct}% FUNDED</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-border/70">
            <div
              className="story-ring h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Quick-Pay Micro-Chips */}
          {p.status !== "funded" && (
            <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-border/40">
              <span className="text-[11px] font-extrabold text-muted-foreground mr-1">
                Quick Chip:
              </span>
              {[50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  onClick={() => openPaymentWithAmount(amt)}
                  className="rounded-full border border-border/80 bg-card px-2.5 py-1 text-xs font-black text-foreground hover:border-primary hover:text-primary transition active:scale-95 shadow-xs"
                >
                  +{inr(amt)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Emoji Reactions */}
        <div className="mt-3 flex items-center gap-1">
          {["🔥", "🥺", "❤️", "👏", "💸"].map((emoji) => {
            const count = userReactions[emoji] || 0;
            return (
              <button
                key={emoji}
                onClick={() => handleQuickReaction(emoji)}
                className={`rounded-full px-2 py-1 text-xs transition active:scale-90 hover:bg-muted ${
                  count > 0 ? "bg-primary/10 font-black text-primary" : "text-muted-foreground"
                }`}
              >
                {emoji} {count > 0 ? count : ""}
              </button>
            );
          })}
        </div>

        {/* Actions bar */}
        <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground border-t border-border/40 pt-2.5">
          <button
            onClick={handleLike}
            aria-label="Like"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-muted active:scale-95 ${
              liked ? "text-rose-500 font-black" : ""
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => setIsCommenting(true)}
            aria-label="Comments"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-muted active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{commentsCount}</span>
          </button>

          <button
            aria-label="Share"
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 transition hover:bg-muted active:scale-95"
          >
            {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Share2 className="h-5 w-5" />}
            {copied && <span className="text-xs text-emerald-500 font-black">Copied!</span>}
          </button>

          <button
            aria-label="Save"
            onClick={handleSave}
            className={`rounded-full px-2.5 py-1.5 transition hover:bg-muted active:scale-95 ${
              saved ? "text-primary" : ""
            }`}
          >
            <Bookmark className={`h-5 w-5 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>

          <button
            onClick={() => openPaymentWithAmount()}
            className="ml-auto flex items-center gap-1.5 rounded-2xl brand-gradient-bg px-4 py-2 text-xs font-black text-white shadow-md shadow-rose-500/20 transition hover:brightness-110 active:scale-95"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>Help →</span>
          </button>
        </div>
      </article>

      {/* Payment Modal */}
      {isPaying && (
        <PaymentModal
          post={p}
          initialAmount={prefilledAmount}
          onClose={() => {
            setIsPaying(false);
            setPrefilledAmount(undefined);
          }}
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

      {/* Report Modal */}
      {isReporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-rose-500">
                <Flag className="h-5 w-5" />
                <h3 className="font-display font-black text-foreground text-base">Report Wish</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReporting(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Reason for report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="fraud">Fraud / Fake Bill Request</option>
                  <option value="duplicate">Duplicate Wish</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="other">Other Concern</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Details (optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide additional context for our moderation team..."
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReporting(false)}
                  className="flex-1 rounded-xl bg-muted py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 py-2 text-xs font-black text-white shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
  const [trending, setTrending] = useState<{ category: string; count: number; tag?: string }[]>([]);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy" | "refund" | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, openAuthModal } = useAuth();

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

    api.getTrendingCategories()
      .then((data) => {
        if (mounted && Array.isArray(data?.trendingCategories)) {
          setTrending(data.trendingCategories);
        }
      })
      .catch((err) => console.error("Trending fetch error:", err));

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreated = (newWish: PostT) => {
    if (onWishCreated) onWishCreated(newWish);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      {/* Left Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col justify-between border-r border-border px-3 py-5 sm:flex lg:w-64">
        <div>
          {/* Logo */}
          <Link to="/" className="mb-6 flex items-center gap-2.5 px-3 group">
            <div className="story-ring rounded-2xl p-[2px] transition group-hover:scale-105">
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-card">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <span className="hidden font-display text-xl font-black tracking-tight lg:inline">
              Help<span className="brand-gradient-text">MePay</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-1">
            {nav.map(({ to, icon: I, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-primary/10 font-black text-primary shadow-xs" }}
                className="relative flex items-center gap-4 rounded-2xl px-3.5 py-3 text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-98"
              >
                <I className="h-5 w-5" />
                <span className="hidden lg:inline">{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute left-6 top-2.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] font-black text-white lg:left-7">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* New Wish Primary CTA */}
          <button
            onClick={() => setIsWishModalOpen(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient-bg py-3 font-display font-black text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110 active:scale-95"
          >
            <Plus className="h-5 w-5 stroke-[3]" />
            <span className="hidden lg:inline">New Wish</span>
          </button>
        </div>

        {/* Sidebar Footer User & Theme Switcher */}
        <div className="border-t border-border/80 pt-4">
          <div className="flex items-center justify-between px-2">
            {isAuthenticated && user ? (
              <Link to="/profile" className="flex items-center gap-2.5 min-w-0">
                <Avatar name={user.name} size="h-9 w-9 text-xs" />
                <div className="hidden min-w-0 flex-1 lg:block text-left">
                  <p className="truncate text-xs font-black text-foreground">{user.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">@{user.handle}</p>
                </div>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="flex items-center gap-1.5 rounded-xl brand-gradient-bg px-3 py-1.5 text-xs font-black text-white shadow-xs hover:brightness-110 transition active:scale-95"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Sign In</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="rounded-2xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Legal / Compliance links */}
          <div className="mt-3 hidden lg:flex items-center justify-between px-2 text-[10px] text-muted-foreground/80 font-medium">
            <button
              type="button"
              onClick={() => setLegalModalTab("terms")}
              className="hover:underline hover:text-foreground transition"
            >
              Terms
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalModalTab("privacy")}
              className="hover:underline hover:text-foreground transition"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalModalTab("refund")}
              className="hover:underline hover:text-foreground transition"
            >
              Guarantee
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <main className="w-full min-w-0 max-w-[620px] border-r border-border pb-28 sm:pb-8">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md">
          <h1 className="font-display text-xl font-black tracking-tight text-foreground">{title}</h1>
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark/Light"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
            {isAuthenticated && user ? (
              <Link to="/profile" aria-label="Profile">
                <Avatar name={user.name} size="h-7 w-7 text-xs" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="rounded-full brand-gradient-bg px-3 py-1 text-xs font-black text-white"
              >
                Sign In
              </button>
            )}
          </div>
        </header>
        {children}
      </main>

      {/* Right Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 space-y-4 overflow-y-auto px-5 py-4 lg:block xl:w-80 [scrollbar-width:none]">
        {/* Search Input Link */}
        <Link
          to="/search"
          className="flex items-center gap-2.5 rounded-2xl bg-muted/60 px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground border border-border/40"
        >
          <Search className="h-4 w-4" />
          <span>Search wishes, tags & bills...</span>
        </Link>

        {/* Trending Bills */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-black text-foreground">Trending Emergencies</h3>
          </div>
          {(trending.length > 0
            ? trending.map((item) => {
                const icons: Record<string, string> = {
                  Food: "🍝",
                  Pets: "🐶",
                  Tech: "🔌",
                  Medical: "🩺",
                  Rent: "🏠",
                  Education: "📚",
                  Transport: "🚗",
                  Utilities: "💡",
                  Shopping: "🛍️",
                };
                return [
                  item.category,
                  `${item.count} ${item.count === 1 ? "wish" : "wishes"}`,
                  icons[item.category] || "🔥",
                ];
              })
            : [
                ["Food", "Active now", "🍝"],
                ["Pets", "Active now", "🐶"],
                ["Tech", "Active now", "🔌"],
                ["Medical", "Active now", "🩺"],
              ]
          ).map(([t, c, icon]) => (
            <Link key={t} to="/search" search={{ q: t }} className="mt-3 block group">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-xs text-foreground group-hover:text-primary transition">
                  {icon} #{t}
                </p>
                <span className="text-[10px] text-muted-foreground">{c}</span>
              </div>
            </Link>
          ))}
        </section>

        {/* Top Sponsors Widget */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="font-display text-sm font-black text-foreground">Top Supporters</h3>
          </div>
          {topSponsors.map((s, i) => (
            <div key={s.handle || i} className="mt-3 flex items-center gap-3">
              <span className="w-4 font-display font-black text-primary text-xs">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <Avatar name={s.name} size="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate font-black text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{inr(s.total)} donated</p>
              </div>
            </div>
          ))}
          <Link
            to="/leaderboard"
            className="mt-4 block text-xs font-black text-primary hover:underline text-center"
          >
            View full podium & leaderboard →
          </Link>
        </section>

        {/* Safe Rail Guarantee Badge */}
        <div className="rounded-3xl border border-border/60 bg-muted/30 p-3.5 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
          <p className="text-xs font-black text-foreground">100% Direct Verification</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Contributions go directly to electricity, mobile, medical, or rental accounts with zero fees.
          </p>
        </div>
      </aside>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/90 px-3 py-2 backdrop-blur-xl sm:hidden shadow-lg safe-bottom">
        {nav
          .filter((n) => ["/", "/search", "/leaderboard", "/notifications", "/profile"].includes(n.to))
          .map(({ to, icon: I, label }, idx) => {
            // Put the New Wish button right in the middle (after 2nd item)
            if (idx === 2) {
              return (
                <div key="center-action" className="flex items-center gap-3">
                  <button
                    onClick={() => setIsWishModalOpen(true)}
                    aria-label="New Wish"
                    className="relative -top-3.5 grid h-12 w-12 place-items-center rounded-full brand-gradient-bg text-white shadow-lg shadow-rose-500/40 active:scale-90 transition hover:scale-105"
                  >
                    <Plus className="h-6 w-6 stroke-[3]" />
                  </button>
                  <Link
                    to={to}
                    aria-label={label}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: "text-primary font-black" }}
                    className="relative p-2.5 text-muted-foreground active:scale-90 transition"
                  >
                    <I className="h-6 w-6" />
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary font-black" }}
                className="relative p-2.5 text-muted-foreground active:scale-90 transition"
              >
                <I className="h-6 w-6" />
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* Modal for Creating New Wish */}
      {isWishModalOpen && (
        <NewWishModal
          onClose={() => setIsWishModalOpen(false)}
          onSuccess={handleCreated}
        />
      )}

      {/* Legal & Trust Standards Modal */}
      {legalModalTab && (
        <LegalModal
          initialTab={legalModalTab}
          onClose={() => setLegalModalTab(null)}
        />
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <Sparkles className="mx-auto h-6 w-6 text-primary mb-2 opacity-70" />
      <p className="font-semibold">{children}</p>
    </div>
  );
}
