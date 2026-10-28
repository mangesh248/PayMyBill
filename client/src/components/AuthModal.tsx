import React, { useState } from "react";
import { X, Sparkles, Lock, AtSign, User, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, openAuthModal, login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(authModalMode);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode with context
  React.useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        if (!handle.trim() || !password) {
          setError("Please enter your handle and password.");
          setIsLoading(false);
          return;
        }
        await login(handle.trim().replace(/^@/, ""), password);
      } else {
        if (!name.trim() || !handle.trim() || !password) {
          setError("Name, handle, and password are required.");
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters long.");
          setIsLoading(false);
          return;
        }
        await register(name.trim(), handle.trim().replace(/^@/, ""), password, bio.trim());
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setMode("login");
    setHandle("you");
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl brand-gradient-bg shadow-md shadow-rose-500/20 mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="font-display text-2xl font-black tracking-tight text-foreground">
            {mode === "login" ? "Welcome Back" : "Join HelpMePay"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "Sign in to sponsor bills, post wishes, and track karma"
              : "Create an account to start giving and receiving community help"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="mt-6 grid grid-cols-2 rounded-2xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`rounded-xl py-2 text-xs font-black transition ${
              mode === "login" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`rounded-xl py-2 text-xs font-black transition ${
              mode === "register" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive animate-in fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="text-xs font-bold text-muted-foreground">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted/40 py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-muted-foreground">Handle / Username</label>
            <div className="relative mt-1">
              <AtSign className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                placeholder="handle (e.g. maya_s)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full rounded-2xl border border-border bg-muted/40 py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-border bg-muted/40 py-2.5 pl-10 pr-10 text-sm font-medium outline-none focus:border-primary transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="text-xs font-bold text-muted-foreground">Bio (Optional)</label>
              <input
                type="text"
                placeholder="A line about you or what you care about"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-border bg-muted/40 py-2.5 px-4 text-sm font-medium outline-none focus:border-primary transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient-bg py-3 font-display font-black text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110 active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Get Started"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill */}
        <div className="mt-5 border-t border-border pt-4 text-center">
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Demo login with default account (you)
          </button>
        </div>
      </div>
    </div>
  );
}
