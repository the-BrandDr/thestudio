"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, AlertCircle, Save } from "lucide-react";
import PassportCropper from "@/components/admin/passport-cropper";
import StaffPayslipsPanel from "@/components/admin/staff-payslips-panel";
import { resolveStaffCompensation, computeNigerianMonthlyPAYE } from "@/components/admin/tax-compliance-suite";

export default function StaffProfileAndSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwMessage, setPwMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadMyProfile = React.useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const email = authData?.user?.email?.toLowerCase();

    const { data: staffRows } = await supabase
      .from("staff_profiles")
      .select("*")
      .order("staff_id", { ascending: true });

    if (staffRows && staffRows.length > 0) {
      const me =
        staffRows.find((s) => email && s.email?.toLowerCase() === email) ||
        (email === "hipheholluhayegboyin@gmail.com" ? staffRows.find((s) => s.staff_id === "LS-01") : null) ||
        staffRows[0];

      if (me) {
        setProfile({
          ...me,
          bank_sort_code: me.bank_sort_code || "",
        });
      }
    }
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    setStatusMsg(null);

    const comp = resolveStaffCompensation(profile);

    const payload: Record<string, any> = {
      first_name: (profile.first_name || "").trim(),
      last_name: (profile.last_name || "").trim(),
      phone: (profile.phone || "").trim(),
      location: (profile.location || "").trim(),
      passport_url: profile.passport_url || "",
      bank_name: (profile.bank_name || "").trim(),
      bank_sort_code: (profile.bank_sort_code || "").trim(),
      bank_account_name: (profile.bank_account_name || "").trim(),
      bank_account_no: (profile.bank_account_no || "").trim(),
      // Also persist resolved salary if DB had 0
      salary_amount: Number(profile.salary_amount) > 0 ? Number(profile.salary_amount) : comp.gross,
      basic_salary: Number(profile.basic_salary) > 0 ? Number(profile.basic_salary) : comp.basic,
      transport_housing_allowance:
        Number(profile.transport_housing_allowance) > 0
          ? Number(profile.transport_housing_allowance)
          : comp.transportHousing,
      internet_allowance:
        Number(profile.internet_allowance) > 0 ? Number(profile.internet_allowance) : comp.internet,
    };

    let { error } = await supabase.from("staff_profiles").update(payload).eq("id", profile.id);
    if (error && error.message?.includes("column")) {
      const { bank_sort_code, basic_salary, transport_housing_allowance, internet_allowance, ...safePayload } = payload;
      const retry = await supabase.from("staff_profiles").update(safePayload).eq("id", profile.id);
      error = retry.error;
    }

    setSaving(false);
    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStatusMsg({ type: "success", text: "Profile saved!" });
      loadMyProfile();
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMessage({ type: "error", text: error.message });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage({ type: "success", text: "Password updated!" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs text-[var(--text-muted)]">
        Loading profile...
      </div>
    );
  }

  const comp = resolveStaffCompensation(profile);
  const paye = computeNigerianMonthlyPAYE(comp.gross);
  const netTakeHome = Math.max(0, comp.gross - paye.monthlyPAYE);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. PERSONAL PROFILE, SINGLE ACCURATE SALARY SUMMARY & BANK DETAILS */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)]/50 pb-5">
          <div className="flex items-center gap-4">
            <PassportCropper
              currentUrl={profile?.passport_url || ""}
              onUploaded={(url: string) => setProfile((prev: any) => ({ ...prev, passport_url: url }))}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">
                  {profile?.first_name} {profile?.last_name}
                </h1>
                {profile?.staff_id && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] text-xs font-mono font-bold">
                    {profile.staff_id}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                {profile?.job_title || "Executive"} • {profile?.department || "Lavie Studios"}
              </p>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                {comp.levelLabel} (Step {comp.stepNum}) • {profile?.employment_type || "Full-Time"}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer hover:opacity-90 transition"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
              statusMsg.type === "success"
                ? "bg-[#c7cb2d]/10 border-[#c7cb2d]/40 text-[#c7cb2d]"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* SINGLE UNIFIED SALARY & NET PAY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 font-mono">
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Monthly Gross</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">₦{comp.gross.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Basic (85%)</span>
            <span className="text-xs font-semibold">₦{comp.basic.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Trans/Hous (10%)</span>
            <span className="text-xs font-semibold">₦{comp.transportHousing.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Internet (5%)</span>
            <span className="text-xs font-semibold">₦{comp.internet.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[#c7cb2d]">Net Pay (After PAYE)</span>
            <span className="text-sm font-bold text-emerald-400">₦{netTakeHome.toLocaleString()}</span>
          </div>
        </div>

        {/* PERSONAL CONTACT FIELDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">First Name</label>
            <input
              value={profile?.first_name || ""}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Last Name</label>
            <input
              value={profile?.last_name || ""}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Phone Number</label>
            <input
              value={profile?.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Location</label>
            <input
              value={profile?.location || ""}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
        </div>

        {/* BANK DETAILS */}
        <div className="pt-2 border-t border-[var(--border-subtle)]/40">
          <span className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-3">
            Salary Account Details
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
              <input
                value={profile?.bank_name || ""}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Sort Code</label>
              <input
                value={profile?.bank_sort_code || ""}
                onChange={(e) => setProfile({ ...profile, bank_sort_code: e.target.value })}
                placeholder="Optional"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
              <input
                value={profile?.bank_account_name || ""}
                onChange={(e) => setProfile({ ...profile, bank_account_name: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number</label>
              <input
                maxLength={10}
                value={profile?.bank_account_no || ""}
                onChange={(e) => setProfile({ ...profile, bank_account_no: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </form>

      {/* 2. MY MONTHLY PAYSLIPS */}
      <StaffPayslipsPanel staffProfile={profile} />

      {/* 3. PASSWORD UPDATE */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
        <h2 className="font-display text-base font-bold">Update Password</h2>

        {pwMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border ${
              pwMessage.type === "success"
                ? "bg-[#c7cb2d]/10 border-[#c7cb2d]/40 text-[#c7cb2d]"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {pwMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="py-2.5 px-5 rounded-xl bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
          >
            {pwLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
