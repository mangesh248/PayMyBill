import { useState } from "react";
import {
  X,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Zap,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Printer,
  RotateCcw,
  Lock,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { api, inr, type PostT } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

interface PaymentModalProps {
  post: PostT | null;
  initialAmount?: number | undefined;
  onClose: () => void;
  onSuccess: (updatedWish: any) => void;
}

type CheckoutStep = "amount_selection" | "gateway_processing" | "success_receipt";

export function PaymentModal({ post, initialAmount, onClose, onSuccess }: PaymentModalProps) {
  if (!post) return null;

  const { isAuthenticated, user, openAuthModal } = useAuth();
  const remaining = Math.max(0, post.goal - post.raised);

  const [step, setStep] = useState<CheckoutStep>("amount_selection");
  const [amount, setAmount] = useState<number>(
    initialAmount && initialAmount > 0
      ? Math.min(initialAmount, remaining > 0 ? remaining : initialAmount)
      : remaining > 0
      ? Math.min(500, remaining)
      : 500
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<"upi" | "card" | "netbanking" | "instant">("upi");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Gateway order state
  const [orderData, setOrderData] = useState<{
    order_id: string;
    amount: number;
    amount_inr: number;
    key_id: string;
    is_mock: boolean;
  } | null>(null);

  // Simulated gateway interaction states
  const [upiVpa, setUpiVpa] = useState<string>("user@okhdfcbank");
  const [showQr, setShowQr] = useState<boolean>(false);
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  // Quick preset chip amounts
  const presets = [100, 250, 500, 1000];
  if (remaining > 0 && !presets.includes(remaining)) {
    presets.push(remaining);
  }

  const selectedAmount = customAmount ? parseInt(customAmount, 10) || 0 : amount;

  // Step 1: Create Order & Transition to Gateway
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAmount <= 0) {
      setError("Please choose a valid contribution amount (min ₹10)");
      return;
    }
    if (selectedAmount > remaining && remaining > 0) {
      setError(`Maximum remaining amount needed is ${inr(remaining)}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const order = await api.createOrder({
        wish_id: post.id,
        amount: selectedAmount,
        payment_method: method,
        message,
        is_anonymous: isAnonymous,
      });

      setOrderData(order);
      setStep("gateway_processing");
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Confirm Payment through Gateway (Verify Signature)
  const handleGatewayAuthorize = async () => {
    if (!orderData) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const paymentId = `pay_${method.toUpperCase()}_${Date.now()}`;
      // In live production, signature comes from Razorpay checkout handler
      const signature = `sig_${Date.now()}`;

      const res = await api.verifyPayment({
        order_id: orderData.order_id,
        payment_id: paymentId,
        signature,
        wish_id: post.id,
      });

      setReceipt(res.transaction);
      onSuccess(res.updatedWish);
      setStep("success_receipt");
      toast.success(`🎉 Sent ${inr(orderData.amount_inr)} to help ${post.name}!`, {
        description: "Transaction verified & settled directly to service provider.",
      });
    } catch (err: any) {
      setError(err.message || "Verification failed. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refund handler (P8 from audit)
  const handleRequestRefund = async () => {
    if (!receipt?.id) return;
    const confirm = window.confirm(
      `Are you sure you want to cancel and reverse this contribution of ${inr(receipt.amount)}?`
    );
    if (!confirm) return;

    setIsRefunding(true);
    try {
      const res = await api.refundPayment({
        transaction_id: receipt.id,
        reason: "User requested immediate reversal via HelpMePay protection guarantee",
      });

      toast.info(res.message);
      onSuccess(res.updatedWish);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund.");
    } finally {
      setIsRefunding(false);
    }
  };

  const copyShareCard = () => {
    const text = `⚡ I just sponsored ${post.name}'s "${post.title}" bill directly on HelpMePay! Join and sponsor everyday emergency bills: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    toast.success("Copied flex text for WhatsApp & Instagram!");
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const shareFlexCard = async () => {
    const text = `⚡ I just helped pay ${post.name}'s "${post.title}" bill directly on HelpMePay! #DirectBillPay #HelpMePay`;
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `HelpMePay Sponsorship for ${post.name}`,
          text,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to WhatsApp
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
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

        {/* ──────────── STEP 1: Amount & Rail Selection ──────────── */}
        {step === "amount_selection" && (
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary border border-primary/20">
                <ShieldCheck className="h-3.5 w-3.5" /> 100% DIRECT VERIFIED RAIL
              </span>
              <span className="text-xs text-muted-foreground font-semibold">0% Platform Fee</span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-foreground">
              Help {post.name.split(" ")[0]} with this bill
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">“{post.title}”</p>

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
                  <span className="text-xs font-black text-primary">{inr(remaining)} needed</span>
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

            <form onSubmit={handleInitiatePayment} className="mt-5 space-y-4">
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
                    min="10"
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
                  Payment Rail
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { id: "upi", label: "UPI", icon: Smartphone },
                    { id: "card", label: "Card", icon: CreditCard },
                    { id: "netbanking", label: "Bank", icon: Building2 },
                    { id: "instant", label: "Direct", icon: Zap },
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

                <div className="mt-2 rounded-2xl bg-muted/50 p-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
                  {method === "upi" && <span>GPay, PhonePe, Paytm, Cred & BHIM via UPI Rail</span>}
                  {method === "card" && <span>Visa, Mastercard, RuPay & International Cards</span>}
                  {method === "netbanking" && <span>HDFC, ICICI, SBI, Axis, Kotak & 50+ Banks</span>}
                  {method === "instant" && <span>Direct API settlement to utility service provider</span>}
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-2" />
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
                  placeholder="e.g. Hope this helps you get back on track! ✨"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                />
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-border p-3 bg-muted/30">
                <div>
                  <p className="text-xs font-black">Pay anonymously</p>
                  <p className="text-[11px] text-muted-foreground">
                    Hide your name on public community sponsor leaderboards
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded cursor-pointer"
                />
              </div>

              {error && <p className="text-xs font-bold text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting || selectedAmount <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient-bg py-3.5 font-display text-base font-black text-white shadow-xl shadow-rose-500/25 transition hover:brightness-110 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Initiating Gateway...</span>
                ) : (
                  <>
                    <span>Proceed to Pay {inr(selectedAmount)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ──────────── STEP 2: Gateway Interactive Processing ──────────── */}
        {step === "gateway_processing" && orderData && (
          <div className="py-2 animate-in zoom-in-95 duration-200">
            {/* Gateway Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl brand-gradient-bg text-white shadow-xs">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Secure Payment Gateway</h3>
                  <p className="text-[10px] text-muted-foreground">
                    256-bit Bank Grade Encryption · Order: {orderData.order_id.slice(0, 16)}...
                  </p>
                </div>
              </div>
              <span className="font-display text-base font-black text-primary">
                {inr(orderData.amount_inr)}
              </span>
            </div>

            {/* Gateway Body according to method */}
            <div className="mt-5 space-y-4">
              {method === "upi" && (
                <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Pay via UPI App</span>
                    <button
                      type="button"
                      onClick={() => setShowQr(!showQr)}
                      className="text-primary hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <QrCode className="h-3 w-3" /> {showQr ? "Use UPI ID" : "Show QR Code"}
                    </button>
                  </div>

                  {showQr ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl text-black">
                      <div className="border-4 border-black p-2 rounded-lg">
                        <QrCode className="h-32 w-32" />
                      </div>
                      <p className="mt-2 text-[10px] font-mono text-zinc-600">
                        Scan with GPay / PhonePe / Paytm / Cred
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] text-muted-foreground font-semibold">
                        Enter UPI VPA / Phone Number
                      </label>
                      <input
                        type="text"
                        value={upiVpa}
                        onChange={(e) => setUpiVpa(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-mono outline-none focus:border-primary transition"
                      />
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {["@okhdfcbank", "@paytm", "@ybl", "@axl"].map((suffix) => (
                          <button
                            type="button"
                            key={suffix}
                            onClick={() => setUpiVpa((prev) => prev.split("@")[0] + suffix)}
                            className="rounded-lg border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {method === "card" && (
                <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-3">
                  <p className="text-xs font-bold text-foreground">Card Verification</p>
                  <div className="rounded-xl border border-border/60 bg-gradient-to-r from-zinc-900 to-zinc-800 p-3.5 text-white shadow">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>TEST CARD</span>
                      <span className="font-black text-rose-400">RUPAY / VISA</span>
                    </div>
                    <p className="mt-3 font-mono text-sm tracking-widest">•••• •••• •••• 4242</p>
                    <div className="mt-2 flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>EXP: 12/28</span>
                      <span>CVV: •••</span>
                    </div>
                  </div>
                </div>
              )}

              {method === "netbanking" && (
                <div className="rounded-2xl border border-border/80 bg-muted/40 p-4">
                  <p className="text-xs font-bold text-foreground mb-2">Select Primary Bank</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map((b, i) => (
                      <div
                        key={b}
                        className={`rounded-xl border p-2.5 font-bold cursor-pointer transition ${
                          i === 0
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {method === "instant" && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-foreground space-y-2">
                  <div className="flex items-center gap-2 font-black text-emerald-500">
                    <Zap className="h-4 w-4" /> Direct Service Provider Disbursement
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    This contribution is automatically verified and wired straight to the authorized utility or biller on file. Funds cannot be diverted.
                  </p>
                </div>
              )}

              {error && <p className="text-xs font-bold text-destructive">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("amount_selection")}
                  className="rounded-2xl border border-border px-4 py-3 text-xs font-black text-muted-foreground hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleGatewayAuthorize}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl brand-gradient-bg py-3 font-display text-sm font-black text-white shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Verifying Bank Gateway...</span>
                  ) : (
                    <>
                      <span>Authorize Payment ({inr(orderData.amount_inr)})</span>
                      <CheckCircle className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────────── STEP 3: Success Screen with Flex Card & Tax Receipt ──────────── */}
        {step === "success_receipt" && receipt && (
          <div className="py-4 text-center animate-in zoom-in-95 duration-300">
            <div className="relative mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle className="h-8 w-8 stroke-[2.5]" />
              <div className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow">
                +50 ✨
              </div>
            </div>

            <h2 className="font-display text-2xl font-black text-foreground">Payment Complete! 🎉</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Directly sponsored <b className="text-foreground">{inr(receipt.amount)}</b> toward {post.name}'s bill.
            </p>

            {/* Social Flex Card for IG/WhatsApp */}
            <div className="mt-4 rounded-3xl border border-border bg-gradient-to-br from-card via-muted/40 to-muted/80 p-4 text-left shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
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
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-500">
                  VERIFIED DIRECT SETTLEMENT
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill:</span>
                  <span className="font-bold truncate max-w-[220px]">“{post.title}”</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-black text-primary font-display text-sm">{inr(receipt.amount)}</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>Reference:</span>
                  <span>{receipt.payment_reference || receipt.id}</span>
                </div>
              </div>

              {receipt.message && (
                <div className="mt-3 rounded-xl bg-card p-2 text-xs italic text-foreground/80 border border-border/40">
                  “{receipt.message}”
                </div>
              )}
            </div>

            {/* Actions: Copy Flex & Print Receipt */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={copyShareCard}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/60 py-2.5 text-xs font-black text-foreground hover:bg-muted transition active:scale-95"
              >
                {copiedShare ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Flex Text</span>
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/60 px-3.5 py-2.5 text-xs font-black text-foreground hover:bg-muted transition active:scale-95"
                title="Print official receipt"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Receipt</span>
              </button>
              <button
                type="button"
                onClick={shareFlexCard}
                className="flex items-center justify-center gap-1.5 rounded-2xl brand-gradient-bg px-4 py-2.5 text-xs font-black text-white shadow transition active:scale-95 hover:brightness-110"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
            </div>

            {/* Refund Guard Link */}
            <div className="mt-4 border-t border-border pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" /> Protected by HelpMePay Guarantee
              </span>
              <button
                type="button"
                onClick={handleRequestRefund}
                disabled={isRefunding}
                className="text-destructive/80 hover:text-destructive underline font-semibold transition"
              >
                {isRefunding ? "Processing refund..." : "Cancel & Refund"}
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-3 w-full rounded-2xl bg-foreground py-3 text-sm font-black text-background transition hover:opacity-90 active:scale-98"
            >
              Done & Return to Feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
