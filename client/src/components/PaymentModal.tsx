import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  ShieldCheck,
  Heart,
  Sparkles,
  CreditCard,
  Smartphone,
  Building2,
  Zap,
  ArrowRight,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { api, inr, type PostT } from "@/lib/api";
import { toast } from "sonner";

interface PaymentModalProps {
  post: PostT | null;
  onClose: () => void;
  onSuccess: (updatedWish: any) => void;
}

export function PaymentModal({ post, onClose, onSuccess }: PaymentModalProps) {
  if (!post) return null;

  const remaining = Math.max(0, post.goal - post.raised);
  const [amount, setAmount] = useState<number>(
    remaining > 0 ? Math.min(500, remaining) : 500
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<"upi" | "card" | "netbanking" | "instant">("upi");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Quick preset chip amounts
  const presets = [100, 250, 500, 1000];
  if (remaining > 0 && !presets.includes(remaining)) {
    presets.push(remaining);
  }

  const selectedAmount = customAmount ? parseInt(customAmount, 10) || 0 : amount;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAmount <= 0) {
      setError("Please choose a valid contribution amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.payBill({
        wish_id: post.id,
        amount: selectedAmount,
        payment_method: method,
        message,
        is_anonymous: isAnonymous,
        idempotency_key: `client_pay_${post.id}_${Date.now()}`,
      });

      setReceipt(res.transaction);
      onSuccess(res.updatedWish);
      toast.success(`🎉 You sent ${inr(selectedAmount)} to help ${post.name}!`, {
        description: "Karma +50 added to your profile leaderboard.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to process payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyShareCard = () => {
    const text = `⚡ I just helped pay ${post.name}'s "${post.title}" bill on HelpMePay! Join and sponsor everyday wishes: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    toast.success("Copied flex text for WhatsApp / Instagram Story!");
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-card p-6 shadow-2xl [scrollbar-width:none]">
        {/* Mobile Drag Indicator */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Modal"
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <X className="h-5 w-5" />
        </button>

        {!receipt ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary border border-primary/20">
                <ShieldCheck className="h-3.5 w-3.5" /> 100% DIRECT VERIFIED RAIL
              </span>
              <span className="text-xs text-muted-foreground font-semibold">0% Platform Fee</span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-foreground">
              Help {post.name.split(" ")[0]} with this bill
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              “{post.title}”
            </p>

            {/* Bill progress bar */}
            <div className="mt-4 rounded-2xl bg-muted/60 p-4 border border-border/50">
              <div className="flex items-baseline justify-between text-sm">
                <div>
                  <span className="font-display text-xl font-black text-foreground">
                    {inr(post.raised)}
                  </span>
                  <span className="text-xs text-muted-foreground"> of {inr(post.goal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-primary">
                    {inr(remaining)} needed
                  </span>
                </div>
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-border/70">
                <div
                  className="story-ring h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((post.raised / post.goal) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <form onSubmit={handlePay} className="mt-5 space-y-4">
              {/* Amount selector */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Select Contribution (INR)
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {presets.map((p) => {
                    const isSelected = !customAmount && amount === p;
                    const isFull = p === remaining;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          setCustomAmount("");
                          setAmount(p);
                        }}
                        className={`relative rounded-2xl border py-2.5 text-sm font-black transition active:scale-95 ${
                          isSelected
                            ? "border-primary brand-gradient-bg text-white shadow-md shadow-rose-500/20"
                            : "border-border bg-muted/40 hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {inr(p)}
                        {isFull && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-black text-white shadow">
                            FULL
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5">
                  <input
                    type="number"
                    min="1"
                    placeholder="Or enter custom amount (e.g. ₹350)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              </div>

              {/* Payment Rail Options */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Payment Method
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { id: "upi", label: "UPI", icon: Smartphone, desc: "GPay / PhonePe" },
                    { id: "card", label: "Card", icon: CreditCard, desc: "Debit / Credit" },
                    { id: "netbanking", label: "Bank", icon: Building2, desc: "Net Banking" },
                    { id: "instant", label: "1-Click", icon: Zap, desc: "Direct Pay" },
                  ].map((m) => {
                    const active = method === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setMethod(m.id as any)}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                          active
                            ? "border-primary bg-primary/10 text-primary font-black shadow-sm"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="mt-1 text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Rail Detail Preview */}
                <div className="mt-2 rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground flex items-center justify-between">
                  {method === "upi" && <span>Supported: Google Pay, PhonePe, Paytm, Cred & BHIM</span>}
                  {method === "card" && <span>Visa, Mastercard, RuPay & International cards</span>}
                  {method === "netbanking" && <span>HDFC, ICICI, SBI, Axis, Kotak & 50+ Banks</span>}
                  {method === "instant" && <span>Instant verification directly settled to utility provider</span>}
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />
                </div>
              </div>

              {/* Personal message */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Encouraging Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. You got this! Sending good vibes ✨"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                />
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-black">Pay anonymously</p>
                    <p className="text-[11px] text-muted-foreground">
                      Hide your username from public sponsors leaderboard
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Fee Transparency Box */}
              <div className="rounded-2xl bg-muted/60 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direct contribution:</span>
                  <span className="font-bold">{inr(selectedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (100% Free):</span>
                  <span className="text-emerald-500 font-bold">₹0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment gateway fee:</span>
                  <span className="text-emerald-500 font-bold">₹0 (Waived)</span>
                </div>
                <div className="border-t border-border/80 pt-1 flex justify-between font-black text-foreground text-sm">
                  <span>Total Due:</span>
                  <span className="text-primary">{inr(selectedAmount)}</span>
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold text-destructive">{error}</p>
              )}

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={isSubmitting || selectedAmount <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient-bg py-3.5 font-display text-base font-black text-white shadow-xl shadow-rose-500/25 transition hover:brightness-110 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Securing & Transferring...</span>
                ) : (
                  <>
                    <span>Confirm & Send {inr(selectedAmount)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Success Screen with Confetti & Flex Share */
          <div className="py-6 text-center animate-in zoom-in-95 duration-300">
            {/* Animated Celebration Burst */}
            <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle className="h-10 w-10 stroke-[2.5]" />
              <div className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow">
                +50 ✨
              </div>
            </div>

            <h2 className="font-display text-2xl font-black text-foreground">
              You're a Real Hero! 🎉
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Successfully paid <b className="text-foreground">{inr(receipt.amount)}</b> directly toward {post.name}'s bill.
            </p>

            {/* Social Flex Preview Card */}
            <div className="mt-5 rounded-3xl border border-border bg-gradient-to-br from-card via-muted/40 to-muted/80 p-4 text-left shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="story-ring rounded-full p-[1.5px]">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-card font-display text-xs font-black">
                      {post.name[0]}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black">{post.name}</p>
                    <p className="text-[10px] text-muted-foreground">@{post.handle}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-500">
                  PAID DIRECTLY
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill:</span>
                  <span className="font-bold truncate max-w-[200px]">“{post.title}”</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-black text-primary font-display text-sm">{inr(receipt.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tx Reference:</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{receipt.payment_reference}</span>
                </div>
              </div>

              {receipt.message && (
                <div className="mt-3 rounded-xl bg-card p-2 text-xs italic text-foreground/80 border border-border/40">
                  “{receipt.message}”
                </div>
              )}
            </div>

            {/* Flex Sharing Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={copyShareCard}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/60 py-2.5 text-xs font-black text-foreground hover:bg-muted transition active:scale-95"
              >
                {copiedShare ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Flex Text</span>
                  </>
                )}
              </button>
              <button
                onClick={copyShareCard}
                className="flex items-center justify-center gap-1.5 rounded-2xl brand-gradient-bg px-4 py-2.5 text-xs font-black text-white shadow transition active:scale-95"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-foreground py-3 text-sm font-black text-background transition hover:opacity-90 active:scale-98"
            >
              Done & Return to Feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
