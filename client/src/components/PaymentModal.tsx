import { useState } from "react";
import { X, CheckCircle, ShieldCheck, Heart, Sparkles, CreditCard, Smartphone, Building2, Zap, ArrowRight } from "lucide-react";
import { api, inr, type PostT } from "@/lib/api";

interface PaymentModalProps {
  post: PostT | null;
  onClose: () => void;
  onSuccess: (updatedWish: any) => void;
}

export function PaymentModal({ post, onClose, onSuccess }: PaymentModalProps) {
  if (!post) return null;

  const remaining = Math.max(0, post.goal - post.raised);
  const [amount, setAmount] = useState<number>(remaining > 0 ? Math.min(500, remaining) : 500);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<"upi" | "card" | "netbanking" | "instant">("upi");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || "Failed to process payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl [scrollbar-width:none]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {!receipt ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
                DIRECT BILL SPONSORSHIP
              </span>
              <span className="text-xs text-muted-foreground">0% Platform Fee</span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
              Help {post.name.split(" ")[0]} with this bill
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              “{post.title}”
            </p>

            {/* Bill progress bar */}
            <div className="mt-4 rounded-2xl bg-muted/70 p-4 border border-border/50">
              <div className="flex items-baseline justify-between text-sm">
                <div>
                  <span className="font-display text-xl font-extrabold text-foreground">{inr(post.raised)}</span>
                  <span className="text-xs text-muted-foreground"> of {inr(post.goal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-primary">
                    {inr(remaining)} needed
                  </span>
                </div>
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-border">
                <div
                  className="story-ring h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((post.raised / post.goal) * 100))}%` }}
                />
              </div>
            </div>

            <form onSubmit={handlePay} className="mt-5 space-y-4">
              {/* Amount selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Amount (INR)
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
                        className={`relative rounded-xl border py-2.5 text-sm font-extrabold transition ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {inr(p)}
                        {isFull && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-foreground">
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
                    className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Payment Rail Options */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                          active
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="mt-1 text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Rail Detail Preview */}
                <div className="mt-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground flex items-center justify-between">
                  {method === "upi" && <span>Supported: Google Pay, PhonePe, Paytm, BHIM UPI</span>}
                  {method === "card" && <span>Visa, Mastercard, RuPay & International cards accepted</span>}
                  {method === "netbanking" && <span>HDFC, ICICI, SBI, Axis, Kotak & 50+ Banks</span>}
                  {method === "instant" && <span>Instant verification directly applied to recipient bill</span>}
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 ml-2" />
                </div>
              </div>

              {/* Personal message */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Encouraging Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Hope this helps replace them soon! Bruno is forgiven 🐶"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold">Pay anonymously</p>
                    <p className="text-[11px] text-muted-foreground">Hide your username from public sponsors list</p>
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
              <div className="rounded-xl bg-muted/70 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direct contribution:</span>
                  <span className="font-bold">{inr(selectedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (100% free):</span>
                  <span className="text-primary font-bold">₹0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment gateway fee:</span>
                  <span className="text-primary font-bold">₹0 (Waived)</span>
                </div>
                <div className="border-t border-border/80 pt-1 flex justify-between font-extrabold text-foreground">
                  <span>Total Amount:</span>
                  <span>{inr(selectedAmount)}</span>
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold text-destructive">{error}</p>
              )}

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={isSubmitting || selectedAmount <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-base font-extrabold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <span>Confirm & Pay {inr(selectedAmount)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="py-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-primary">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-extrabold">Payment Successful!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You just paid <b className="text-foreground">{inr(receipt.amount)}</b> toward {post.name}'s bill.
            </p>

            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono font-bold">{receipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono">{receipt.payment_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-bold">{post.name} (@{post.handle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-primary">VERIFIED & COMPLETED</span>
              </div>
              {receipt.message && (
                <div className="border-t border-border pt-2 text-muted-foreground italic">
                  “{receipt.message}”
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-primary fill-current" />
              <span>Added to your sponsor leaderboard stats</span>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-foreground py-3 text-sm font-bold text-background transition hover:opacity-90"
            >
              Done & Return to Feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
