"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Lock, Mail, BadgeCheck, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loginMode, setLoginMode] = React.useState<"staff_id" | "email">("staff_id");
  const [staffNumber, setStaffNumber] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Keep only numeric digits for the Staff ID suffix (since "LS-" is locked)
  const handleStaffNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    setStaffNumber(cleaned);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      let targetEmail = email.trim().toLowerCase();

      if (loginMode === "staff_id") {
        if (!staffNumber.trim()) {
          setErrorMsg("Please enter your Staff ID number (e.g. 01).");
          setLoading(false);
          return;
        }
        const fullStaffId = `LS-${staffNumber.trim()}`;

        // 1. Check client-side cached staff profiles or resolve via server API
        const res = await fetch("/api/admin/resolve-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: fullStaffId }),
        });
        const json = await res.json();

        if (!res.ok || !json?.email) {
          setErrorMsg(
            json?.error ||
              `Could not find an account linked to ${fullStaffId}. Try signing in with your Email.`
          );
          setLoading(false);
          return;
        }
        targetEmail = String(json.email).trim().toLowerCase();
      } else {
        // Even in Email mode, if someone typed "LS-01" instead of an email, resolve it automatically
        if (!targetEmail.includes("@") && targetEmail.toUpperCase().startsWith("LS-")) {
          const res = await fetch("/api/admin/resolve-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: targetEmail }),
          });
          const json = await res.json();
          if (res.ok && json?.email) {
            targetEmail = String(json.email).trim().toLowerCase();
          }
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error || !data?.session) {
        setErrorMsg(
          error?.message === "Invalid login credentials"
            ? "Invalid credentials. Please verify your Staff ID / Email and password."
            : error?.message || "Unable to sign in."
        );
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[#c7cb2d]/5 blur-[130px]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Lavie Studios"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d]">
            Studio Portal Access
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Staff & Executive Sign In
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Sign in with your assigned Staff ID or official studio email
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 shadow-2xl space-y-5">
          {/* Mode Switcher Tabs: Staff ID vs Email */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50">
            <button
              type="button"
              onClick={() => {
                setLoginMode("staff_id");
                setErrorMsg("");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-mono uppercase font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginMode === "staff_id"
                  ? "bg-[#c7cb2d] text-black shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              Staff ID
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("email");
                setErrorMsg("");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-mono uppercase font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginMode === "email"
                  ? "bg-[#c7cb2d] text-black shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginMode === "staff_id" ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                    STAFF ID *
                  </label>
                  <span className="text-[10px] font-mono text-[#c7cb2d]">
                    {staffNumber ? `ID: LS-${staffNumber.padStart(2, "0")}` : "Prefix LS- Locked"}
                  </span>
                </div>

                {/* Locked "LS-" Prefix + Numeric Staff Number Input */}
                <div className="flex items-stretch rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 focus-within:border-[#c7cb2d] overflow-hidden transition">
                  <div
                    className="px-4 py-3 bg-[var(--bg-card)] border-r border-[var(--border-subtle)]/60 flex items-center gap-1.5 select-none shrink-0"
                    title="Studio Staff ID Prefix (Locked)"
                  >
                    <Lock className="w-3 h-3 text-[#c7cb2d]" />
                    <span className="font-mono text-sm font-bold tracking-wider text-[#c7cb2d]">
                      LS-
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    autoFocus
                    value={staffNumber}
                    onChange={handleStaffNumberChange}
                    placeholder="01"
                    className="w-full bg-transparent px-3.5 py-3 text-sm font-mono font-bold tracking-wider text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1.5">
                  EMAIL ADDRESS *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-dim)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@studioslavie.com"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 focus:border-[#c7cb2d] rounded-xl pl-10 pr-3.5 py-3 text-xs text-[var(--text-primary)] focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1.5">
                PASSWORD *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--text-dim)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 focus:border-[#c7cb2d] rounded-xl pl-10 pr-10 py-3 text-xs text-[var(--text-primary)] focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-primary)] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-white text-black hover:bg-[#c7cb2d] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-mono text-[var(--text-muted)] hover:text-[#c7cb2d] transition"
          >
            ← Return to Main Website
          </Link>
        </div>
      </div>
    </div>
  );
}
