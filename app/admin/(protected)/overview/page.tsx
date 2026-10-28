"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  Briefcase,
  Mail,
  Users,
  ShieldCheck,
  MessageSquare,
  Calendar,
  Receipt,
  Plus,
  Landmark,
  UserCheck,
} from "lucide-react";
import { resolveAuthenticatedStaff, checkModuleAccess } from "@/utils/resolve-current-staff";

export default function AdminOverviewPage() {
  const supabase = createClient();
  const [me, setMe] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [counts, setCounts] = React.useState({
    caseStudies: 0,
    inquiries: 0,
    staffTotal: 0,
    myLeaves: 0,
    myVouchers: 0,
    chatMessages: 0,
  });

  React.useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const [
        { data: staffRows },
        { count: csCount },
        { count: inqCount },
        { data: leaveRows },
        { data: voucherRows },
        { count: msgCount },
      ] = await Promise.all([
        supabase.from("staff_profiles").select("*").order("staff_id", { ascending: true }),
        supabase.from("case_studies").select("*", { count: "exact", head: true }),
        supabase.from("contact_inquiries").select("*", { count: "exact", head: true }),
        supabase.from("leave_requests").select("*"),
        supabase.from("expense_vouchers").select("*"),
        supabase.from("studio_messages").select("*", { count: "exact", head: true }),
      ]);

      const resolved = resolveAuthenticatedStaff(authData?.user, staffRows || []);
      if (!mounted) return;
      setMe(resolved);

      const myCode = String(resolved?.staff_id || "").toUpperCase();
      const myId = resolved?.id;

      const myLeaveCount = (leaveRows || []).filter(
        (l) => (myId && l.staff_id === myId) || (myCode && String(l.staff_code || "").toUpperCase() === myCode)
      ).length;
      const myVoucherCount = (voucherRows || []).filter(
        (v) => (myId && v.staff_id === myId) || (myCode && String(v.staff_code || "").toUpperCase() === myCode)
      ).length;

      setCounts({
        caseStudies: csCount || 0,
        inquiries: inqCount || 0,
        staffTotal: (staffRows || []).length,
        myLeaves: myLeaveCount,
        myVouchers: myVoucherCount,
        chatMessages: msgCount || 0,
      });
      setLoading(false);
    }
    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const canPortfolio = checkModuleAccess(me, "portfolio");
  const canInquiries = checkModuleAccess(me, "inquiries");
  const canHR = checkModuleAccess(me, "hr");
  const canFinance = checkModuleAccess(me, "finance");

  const roleBadgeLabel = React.useMemo(() => {
    if (!me) return "STAFF";
    const job = me.job_title || me.role || "Team Member";
    const dept = me.department || "Studio";
    return `${job} • ${dept}`;
  }, [me]);

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs text-[var(--text-muted)]">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PERSONALIZED WELCOME HERO */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono font-bold uppercase">
              {me?.staff_id || "STAFF"}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">
              {roleBadgeLabel}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Welcome back, {me?.first_name || "Team Member"}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {me?.hierarchy_level || "Staff"} (Step {me?.step_level || 1}) • {me?.employment_type || "Full-Time"}
          </p>
        </div>

        {/* ROLE-FILTERED QUICK ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/workspace"
            className="px-4 py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Open Workspace & Chat
          </Link>

          {canPortfolio && (
            <Link
              href="/admin/portfolio"
              className="px-4 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Plus className="w-3.5 h-3.5" /> New Case Study
            </Link>
          )}

          {canHR && (
            <Link
              href="/admin/hr"
              className="px-4 py-2.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 hover:border-[#c7cb2d] transition"
            >
              <Users className="w-3.5 h-3.5 text-[#c7cb2d]" /> HR Desk
            </Link>
          )}

          {canFinance && (
            <Link
              href="/admin/finance"
              className="px-4 py-2.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 hover:border-[#c7cb2d] transition"
            >
              <Landmark className="w-3.5 h-3.5 text-[#c7cb2d]" /> Finance Desk
            </Link>
          )}
        </div>
      </div>

      {/* OPEN STAFF WORKSPACE METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/workspace"
          className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Studio Chat & Channels</span>
            <MessageSquare className="w-4 h-4 text-[#c7cb2d]" />
          </div>
          <p className="font-mono text-2xl font-bold">{counts.chatMessages}</p>
          <p className="text-[11px] text-[var(--text-dim)]">Team messages, @mentions & voice notes</p>
        </Link>

        <Link
          href="/admin/workspace?tab=leave"
          className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>My Leave Applications</span>
            <Calendar className="w-4 h-4 text-[#c7cb2d]" />
          </div>
          <p className="font-mono text-2xl font-bold">{counts.myLeaves}</p>
          <p className="text-[11px] text-[var(--text-dim)]">Apply for leave & track approvals</p>
        </Link>

        <Link
          href="/admin/workspace?tab=vouchers"
          className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>My Expense Vouchers</span>
            <Receipt className="w-4 h-4 text-[#c7cb2d]" />
          </div>
          <p className="font-mono text-2xl font-bold">{counts.myVouchers}</p>
          <p className="text-[11px] text-[var(--text-dim)]">Submit expense claims & receipt proofs</p>
        </Link>

        <Link
          href="/admin/settings"
          className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>My Profile & Payslips</span>
            <UserCheck className="w-4 h-4 text-[#c7cb2d]" />
          </div>
          <p className="font-mono text-base font-bold text-[#c7cb2d] truncate">
            {me?.job_title || "Staff Profile"}
          </p>
          <p className="text-[11px] text-[var(--text-dim)]">View approved payslips & bank details</p>
        </Link>
      </div>

      {/* ROLE-CLEARED MANAGEMENT CARDS */}
      {(canPortfolio || canInquiries || canHR || canFinance) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {canPortfolio && (
            <Link
              href="/admin/portfolio"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Case Studies</span>
                <Briefcase className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-mono text-2xl font-bold">{counts.caseStudies}</p>
              <p className="text-[11px] text-[var(--text-dim)]">Portfolio & Hero Showreel CMS</p>
            </Link>
          )}

          {canInquiries && (
            <Link
              href="/admin/inquiries"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Client Inquiries & Quotes</span>
                <Mail className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-mono text-2xl font-bold">{counts.inquiries}</p>
              <p className="text-[11px] text-[var(--text-dim)]">Inquiries, Quotes, Feedbacks & Newsletter</p>
            </Link>
          )}

          {canHR && (
            <Link
              href="/admin/hr"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Confidential HR Roster</span>
                <Users className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-mono text-2xl font-bold">{counts.staffTotal}</p>
              <p className="text-[11px] text-[var(--text-dim)]">Onboarding, Grading & Approvals</p>
            </Link>
          )}

          {canFinance && (
            <Link
              href="/admin/finance"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Finance & Payroll Desk</span>
                <ShieldCheck className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-mono text-base font-bold text-[#c7cb2d]">Executive / Finance</p>
              <p className="text-[11px] text-[var(--text-dim)]">Billing, Receipts, Payroll & Tax</p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
