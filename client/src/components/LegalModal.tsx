import { useState } from "react";
import { X, ShieldCheck, FileText, Lock, RefreshCw, Sparkles } from "lucide-react";

interface LegalModalProps {
  initialTab?: "terms" | "privacy" | "refund";
  onClose: () => void;
}

export function LegalModal({ initialTab = "terms", onClose }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy" | "refund">(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl [scrollbar-width:none]">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="story-ring rounded-2xl p-[2px]">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-card">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-foreground">
              Help<span className="brand-gradient-text">MePay</span> Trust & Safety
            </h2>
            <p className="text-xs text-muted-foreground">Compliance, security & protection standards</p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="mt-5 flex gap-2 border-b border-border pb-3 text-xs font-black">
          {[
            { id: "terms", label: "Terms of Service", icon: FileText },
            { id: "privacy", label: "Privacy Policy", icon: Lock },
            { id: "refund", label: "Refund Guarantee", icon: RefreshCw },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition active:scale-95 ${
                  isActive
                    ? "brand-gradient-bg text-white shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-3.5 text-xs text-muted-foreground leading-relaxed">
          {activeTab === "terms" && (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground text-sm">1. Platform Purpose</h3>
              <p>
                HelpMePay is a peer-to-peer micro-sponsorship network designed to help individuals cover everyday emergency bills, student expenses, pet care, and health co-pays.
              </p>
              <h3 className="font-bold text-foreground text-sm">2. Truth in Posting</h3>
              <p>
                All shared bills and wish descriptions must reflect real, authentic financial obligations. Falsifying provider invoices, duplicate bill claims, or misleading supporters will result in permanent account termination and referral to financial fraud registries.
              </p>
              <h3 className="font-bold text-foreground text-sm">3. Zero Platform Fee</h3>
              <p>
                100% of the funds provided by sponsors (excluding standard third-party payment rail processing costs) are credited directly toward the recipient's verified bill.
              </p>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground text-sm">1. Financial Data Protection</h3>
              <p>
                HelpMePay never stores full credit card numbers, CVVs, or bank netbanking passwords. All payment transactions are encrypted in transit via TLS 1.3 and processed through PCI-DSS Level 1 compliant gateways.
              </p>
              <h3 className="font-bold text-foreground text-sm">2. Data Confidentiality</h3>
              <p>
                We do not sell personal data, phone numbers, or sponsorship histories to third-party ad networks or brokers. Your account information is strictly utilized to facilitate community transparency and bill verification.
              </p>
              <h3 className="font-bold text-foreground text-sm">3. Account Deletion</h3>
              <p>
                Users have the right to request full account data erasure at any time by contacting our support team or deleting their active wishes.
              </p>
            </div>
          )}

          {activeTab === "refund" && (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground text-sm">1. HelpMePay Protection Guarantee</h3>
              <p>
                If a funded bill is discovered to be fraudulent, canceled by the merchant, or over-funded beyond the verified goal, sponsors are eligible for an immediate reversal.
              </p>
              <h3 className="font-bold text-foreground text-sm">2. One-Tap Cancellation</h3>
              <p>
                Sponsors can trigger an instant cancellation and refund directly from their payment receipt screen within 24 hours of initiating payment.
              </p>
              <h3 className="font-bold text-foreground text-sm">3. Settlement Timeline</h3>
              <p>
                Reversed payments are processed back to the original funding source (UPI VPA, Debit Card, or Bank Account) within 2–5 business days according to standard banking settlement cycles.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-border pt-4 flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Version 1.0.0 (October 2026)</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl brand-gradient-bg px-5 py-2 font-black text-white shadow-xs hover:brightness-110 active:scale-95"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
