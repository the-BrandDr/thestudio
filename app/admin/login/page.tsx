"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Image from "next/image";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Hard navigation ensures cookies and server layout load cleanly
      window.location.href = "/admin";
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Invalid credentials.");
    }
  };

  return (
    <div className="w-full max-w-sm p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="h-7 flex items-center justify-center mb-5">
          <Image
            src="/logo-light2.svg"
            alt="Lavie Studios"
            width={110}
            height={24}
            priority
            style={{ width: "auto", height: "24px" }}
            className="object-contain"
          />
        </div>
        <h1 className="font-display text-xl font-bold tracking-tight">The Studio</h1>
        <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-1">
          Authorized Personnel Only
        </p>
      </div>

      {urlError && status === "idle" && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Session requires verification ({urlError}). Please sign in again.</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-mono tracking-widest text-[var(--text-dim)] mb-1.5 font-semibold">
            Corporate Email
          </label>
          <input
            type="email"
            required
            disabled={status === "submitting"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@studioslavie.com"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[#c7cb2d] transition disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-mono tracking-widest text-[var(--text-dim)] mb-1.5 font-semibold">
            Security Key
          </label>
          <input
            type="password"
            required
            disabled={status === "submitting"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] transition disabled:opacity-50"
          />
        </div>

        {status === "error" && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full px-6 py-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {status === "submitting" ? (
              <>Authenticating <Loader2 className="w-3.5 h-3.5 animate-spin" /></>
            ) : (
              <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-primary)] px-4">
      <React.Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Loading portal...</div>}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
