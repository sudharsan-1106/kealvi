"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError("");
  }, [isSignUp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (isSignUp && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignUp ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      {/* Brand Grid Scan Line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan to-transparent animate-pulse" style={{ animationDuration: '3s' }} />

      <div className="relative w-full max-w-md space-y-8 z-10">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-soft px-3 py-1 text-xs font-bold text-cyan neon-text-cyan uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-ping" />
            Live Access Node
          </span>
          <h2 className="mt-4 text-4xl font-black tracking-tighter text-foreground uppercase">
            {isSignUp ? (
              <>
                Initialize <span className="text-brand neon-text-pink">Profile</span>
              </>
            ) : (
              <>
                Connect <span className="text-cyan neon-text-cyan">Node</span>
              </>
            )}
          </h2>
          <p className="mt-2 text-xs text-muted tracking-wider uppercase font-mono">
            {isSignUp ? "[Status: Registration Protocol Required]" : "[Status: Authentication Required]"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl cyber-panel-pink p-6 sm:p-8">
          {error && (
            <div className="mb-4 rounded-xl bg-red-950/40 p-3 text-xs font-semibold text-red-400 border border-red-500/30 flex gap-2 items-center">
              <svg className="h-4.5 w-4.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-mono">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono block">
                  Identity Alias (Name)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priyan-99"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none cyber-input"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono block">
                Comms Address (Email)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alias@domain.net"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none cyber-input"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono block">
                Access Passcode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none cyber-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`mt-6 w-full flex justify-center items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white uppercase tracking-widest cursor-pointer transition-all duration-300 ${
                isSignUp 
                  ? "bg-brand hover:bg-brand-strong shadow-[0_0_15px_rgba(255,0,85,0.4)] hover:shadow-[0_0_22px_rgba(255,0,85,0.65)]" 
                  : "bg-cyan hover:bg-cyan-strong text-black shadow-[0_0_15px_rgba(0,240,255,0.35)] hover:shadow-[0_0_22px_rgba(0,240,255,0.65)]"
              } disabled:opacity-50 font-mono`}
            >
              {loading ? (
                <>
                  <svg className="w-4.5 h-4.5 animate-spin text-current" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Initializing...
                </>
              ) : (
                isSignUp ? "Activate Protocol" : "Authorize Node"
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 border-t border-muted/20 pt-4 text-center font-mono">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold text-muted hover:text-cyan hover:underline transition-colors uppercase tracking-wider cursor-pointer"
            >
              {isSignUp ? "<- Connect with Active Node" : "Request Node Registration ->"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
