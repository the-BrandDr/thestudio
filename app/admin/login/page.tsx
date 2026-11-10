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
          setErrorMsg("Please enter your Staff ID number.");
          setLoading(false);
          return;
        }
        const fullStaffId = `LS-${staffNumber.trim()}`;

        const res = await fetch("/api/admin/resolve-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: fullStaffId }),
        });
        const json = await res.json();

        if (!res.ok || !json?.email) {
          setErrorMsg(
            json?.error ||
              `No account linked to ${fullStaffId}. Try signing in with your Email.`
          );
          setLoading(false);
          return;
        }
        targetEmail = String(json.email).trim().toLowerCase();
      } else {
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
            ? "Invalid credentials. Please verify your details and try again."
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
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Encapsulated Single Compact Bordered Card */}
      <div className="w-full max-w-[380px] relative z-10 p-6 sm:p-7 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/80 shadow-2xl space-y-5">
        {/* Compact Brand Logo & Title Header Inside Card */}
        <div className="flex flex-col items-center text-center space-y-2.5 border-b border-[var(--border-subtle)]/50 pb-4">
          <Link href="/" className="inline-flex items-center gap-2.5 hover:opacity-90 transition">
            <div className="inline-flex items-center gap-2">
            <img <img src="/logo-light.svg" alt="Lavie Studios" className="h-7 w-auto object-contain mx-auto" /> { (e.currentTarget as HTMLImageElement).src = "/logo.png"; }} />
          </div>
          </Link>
          <div className="space-y-0.5">
            <h1 className="font-display text-lg font-bold tracking-tight">
              Staff & Executive Sign In
            </h1>
            <p className="text-[11px] text-[var(--text-muted)]">
              Access your studio workspace
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs: Staff ID vs Email */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50">
          <button
            type="button"
            onClick={() => {
              setLoginMode("staff_id");
              setErrorMsg("");
            }}
            className={`py-2 px-2.5 rounded-lg text-[11px] font-mono uppercase font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              loginMode === "staff_id"
                ? "bg-[#c7cb2d] text-black"
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
            className={`py-2 px-2.5 rounded-lg text-[11px] font-mono uppercase font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              loginMode === "email"
                ? "bg-[#c7cb2d] text-black"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
        </div>

        {/* Compact Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          {loginMode === "staff_id" ? (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                STAFF ID
              </label>
              <div className="flex items-stretch rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 focus-within:border-[#c7cb2d] overflow-hidden transition">
                <div className="px-3.5 py-2.5 bg-[var(--bg-card)] border-r border-[var(--border-subtle)]/60 flex items-center select-none shrink-0">
                  <span className="font-mono text-xs font-bold tracking-wider text-[#c7cb2d]">
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
                  className="w-full bg-transparent px-3 py-2.5 text-xs font-mono font-bold tracking-wider text-[var(--text-primary)] focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@studioslavie.com"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 focus:border-[#c7cb2d] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 focus:border-[#c7cb2d] rounded-xl pl-9 pr-9 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-primary)] cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-[11px] text-red-300">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-white text-black hover:bg-[#c7cb2d] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              "Signing In..."
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link Inside the Bordered Card */}
        <div className="pt-2 border-t border-[var(--border-subtle)]/40 text-center">
          <Link
            href="/"
            className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[#c7cb2d] transition"
          >
            ← Return to Website
          </Link>
        </div>
      </div>
    </div>
  );
}
