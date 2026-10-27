"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  User,
  Lock,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import PassportCropper from "@/components/admin/passport-cropper";
import StaffPayslipsPanel from "@/components/admin/staff-payslips-panel";

export default function StaffProfileAndSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Self-Service Password Reset State
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
        staffRows.find((s) => s.email?.toLowerCase() === email) ||
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
    };

    let { error } = await supabase.from("staff_profiles").update(payload).eq("id", profile.id);
    if (error && error.message?.includes("column")) {
      const { bank_sort_code, ...safePayload } = payload;
      const retry = await supabase.from("staff_profiles").update(safePayload).eq("id", profile.id);
      error = retry.error;
    }

    setSaving(false);
    if (error) {
      setStatusMsg({ type: "error", text: error.message });
    } else {
      setStatusMsg({ type: "success", text: "Profile & banking details updated successfully!" });
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
      setPwMessage({ type: "success", text: "Your portal password has been updated!" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs text-[var(--text-muted)]">
        Loading your staff profile...
      </div>
    );
  }

  const totalGross = Number(profile?.salary_amount || 0);
  const basicSal = Number(profile?.basic_salary || Math.round(totalGross * 0.85));
  const transSal = Number(profile?.transport_housing_allowance || Math.round(totalGross * 0.10));
  const netSal = Number(profile?.internet_allowance || totalGross - basicSal - transSal);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* PROFILE OVERVIEW & PERSONAL DETAILS FORM */}
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
                {profile?.job_title || "Team Member"} • {profile?.department || "Lavie Studios"}
              </p>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                {profile?.hierarchy_level || "L3"} (Step {profile?.step_level || 1}) • {profile?.employment_type || "Full-Time"}
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

        {/* COMPENSATION SUMMARY STRIP */}
        <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Monthly Gross</span>
            <span className="text-sm font-bold text-[#c7cb2d]">₦{totalGross.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Basic Salary (85%)</span>
            <span className="text-xs font-semibold">₦{basicSal.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Trans / Housing (10%)</span>
            <span className="text-xs font-semibold">₦{transSal.toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase text-[var(--text-dim)]">Internet (5%)</span>
            <span className="text-xs font-semibold">₦{netSal.toLocaleString()}</span>
          </div>
        </div>

        {/* PERSONAL & CONTACT DETAILS */}
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
              placeholder="+234..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Location</label>
            <input
              value={profile?.location || ""}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="Ogbomoso, Oyo State"
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
        </div>

        {/* BANKING DETAILS INCLUDING SORT CODE */}
        <div className="pt-2 border-t border-[var(--border-subtle)]/40">
          <span className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-3">
            Salary Disbursement Account Details
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
              <input
                value={profile?.bank_name || ""}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                placeholder="e.g. UBA / Polaris Bank"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Sort Code</label>
              <input
                value={profile?.bank_sort_code || ""}
                onChange={(e) => setProfile({ ...profile, bank_sort_code: e.target.value })}
                placeholder="e.g. 033154282"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
              <input
                value={profile?.bank_account_name || ""}
                onChange={(e) => setProfile({ ...profile, bank_account_name: e.target.value })}
                placeholder="Registered Account Name"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number (NUBAN)</label>
              <input
                maxLength={10}
                value={profile?.bank_account_no || ""}
                onChange={(e) => setProfile({ ...profile, bank_account_no: e.target.value })}
                placeholder="10-digit NUBAN"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </form>

      {/* STAFF PAYSLIPS PANEL */}
      <StaffPayslipsPanel staffProfile={profile} />

      {/* PORTAL PASSWORD RESET SECTION */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
            Account Security
          </span>
          <h3 className="font-display text-base font-bold">Update Portal Password</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Change your temporary onboarding password or update your personal sign-in credentials.
          </p>
        </div>

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
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
              New Password *
            </label>
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
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="py-2.5 px-5 rounded-xl bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {pwLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
