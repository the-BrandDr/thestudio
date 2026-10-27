"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { FileText, Printer, Calendar, CheckCircle2, Wallet } from "lucide-react";
import OfficialDocumentModal from "@/components/admin/official-document-modal";
import { computeNigerianMonthlyPAYE } from "@/components/admin/tax-compliance-suite";

const DEFAULT_LEVEL_STEP_CONFIG: Record<string, { step1Gross: number; stepIncrement: number }> = {
  "L0 - Auxiliary & Facility Support": { step1Gross: 15000, stepIncrement: 1500 },
  "L1 - Intern / Graduate Trainee": { step1Gross: 20000, stepIncrement: 2000 },
  "L2 - Junior Associate": { step1Gross: 35000, stepIncrement: 3500 },
  "L3 - Mid-Level Specialist": { step1Gross: 50000, stepIncrement: 5000 },
  "L4 - Senior Specialist": { step1Gross: 75000, stepIncrement: 7500 },
  "L5 - Lead / Principal": { step1Gross: 110000, stepIncrement: 10000 },
  "L6 - Department Head": { step1Gross: 150000, stepIncrement: 15000 },
  "L7 - Executive / Director": { step1Gross: 200000, stepIncrement: 20000 },
};

function resolveFallbackGross(levelLabel: string, stepNum: number) {
  let cfgMap = DEFAULT_LEVEL_STEP_CONFIG;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("lavie_salary_structure_v1");
      if (saved) cfgMap = { ...DEFAULT_LEVEL_STEP_CONFIG, ...JSON.parse(saved) };
    } catch (_) {}
  }
  const matchedKey =
    Object.keys(cfgMap).find((k) => k.startsWith(String(levelLabel || "L3").slice(0, 2))) ||
    "L3 - Mid-Level Specialist";
  const cfg = cfgMap[matchedKey] || DEFAULT_LEVEL_STEP_CONFIG["L3 - Mid-Level Specialist"];
  const step = Math.min(7, Math.max(1, Number(stepNum) || 1));
  return Number(cfg.step1Gross || 20000) + (step - 1) * Number(cfg.stepIncrement || 2000);
}

export default function StaffPayslipsPanel({
  staffProfile,
  staff,
}: {
  staffProfile?: any;
  staff?: any;
}) {
  const supabase = createClient();
  const [resolvedStaff, setResolvedStaff] = React.useState<any | null>(staffProfile || staff || null);
  const [payslips, setPayslips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPayslip, setSelectedPayslip] = React.useState<any | null>(null);

  const fetchStaffAndPayslips = React.useCallback(async () => {
    setLoading(true);

    // 1. Resolve current staff profile reliably
    let me = staffProfile || staff || null;
    const { data: authData } = await supabase.auth.getUser();
    const userEmail = authData?.user?.email?.toLowerCase();

    if (!me || !me.staff_id) {
      const { data: allStaff } = await supabase
        .from("staff_profiles")
        .select("*")
        .order("staff_id", { ascending: true });

      if (allStaff && allStaff.length > 0) {
        me =
          allStaff.find((s) => userEmail && s.email?.toLowerCase() === userEmail) ||
          (userEmail === "hipheholluhayegboyin@gmail.com" ? allStaff.find((s) => s.staff_id === "LS-01") : null) ||
          me ||
          allStaff[0];
      }
    }

    setResolvedStaff(me);

    // 2. Query all possible payroll tables and filter flexibly by UUID, staff_code (e.g. LS-01), email, or full name
    const candidateTables = Array.from(
      new Set(["payment_receipts", "payroll_records", "staff_payroll", "payslips"])
    );

    let collected: any[] = [];
    for (const tbl of candidateTables) {
      const { data, error } = await supabase
        .from(tbl)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        collected = [...collected, ...data];
        break;
      }
    }

    if (me && collected.length > 0) {
      const myUuid = String(me.id || "").toLowerCase();
      const myCode = String(me.staff_id || "").trim().toUpperCase();
      const myEmail = String(me.email || userEmail || "").trim().toLowerCase();
      const myFullName = `${me.first_name || ""} ${me.last_name || ""}`.trim().toLowerCase();
      const myFirstName = String(me.first_name || "").trim().toLowerCase();

      const matched = collected.filter((row) => {
        const rStaffId = String(row.staff_id || "").toLowerCase();
        const rCode = String(row.staff_code || row.employee_id || row.staff_id || "").trim().toUpperCase();
        const rEmail = String(row.staff_email || row.email || "").trim().toLowerCase();
        const rName = String(row.staff_name || row.full_name || "").trim().toLowerCase();

        if (myUuid && rStaffId === myUuid) return true;
        if (myCode && rCode === myCode) return true;
        if (myEmail && rEmail === myEmail) return true;
        if (myFullName && rName && rName === myFullName) return true;
        if (myFirstName && myCode === "LS-01" && rName.includes(myFirstName)) return true;
        return false;
      });

      setPayslips(matched);
    } else {
      setPayslips([]);
    }

    setLoading(false);
  }, [supabase, staffProfile, staff]);

  React.useEffect(() => {
    fetchStaffAndPayslips();
  }, [fetchStaffAndPayslips]);

  // Compute remuneration breakdown (falls back to Level & Step matrix if DB salary_amount is 0)
  const rawDbGross = Number(resolvedStaff?.salary_amount || 0);
  const grossMonthly =
    rawDbGross > 0
      ? rawDbGross
      : resolveFallbackGross(
          resolvedStaff?.hierarchy_level || (resolvedStaff?.staff_id === "LS-01" ? "L7 - Executive / Director" : "L3 - Mid-Level Specialist"),
          Number(resolvedStaff?.step_level || 1)
        );

  const basicSal = Number(resolvedStaff?.basic_salary || Math.round(grossMonthly * 0.85));
  const transSal = Number(resolvedStaff?.transport_housing_allowance || Math.round(grossMonthly * 0.10));
  const netAllow = Number(resolvedStaff?.internet_allowance || grossMonthly - basicSal - transSal);

  const payeInfo = computeNigerianMonthlyPAYE(grossMonthly);
  const monthlyPaye = payeInfo.monthlyPAYE;
  const netTakeHome = Math.max(0, grossMonthly - monthlyPaye);

  return (
    <div className="space-y-6">
      {/* REMUNERATION & SALARY BREAKDOWN CARD */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#c7cb2d]" />
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-primary)]">
              Remuneration & Salary Breakdown
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {resolvedStaff?.hierarchy_level || "L7 - Executive / Director"} • Step {resolvedStaff?.step_level || 1} (Monthly Structure)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Gross Monthly Salary</span>
            <p className="font-mono text-xl font-bold text-[var(--text-primary)]">
              ₦{grossMonthly.toLocaleString()}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-muted)]">
              Basic (85%): ₦{basicSal.toLocaleString()} • Trans/H (10%): ₦{transSal.toLocaleString()} • Net (5%): ₦{netAllow.toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Monthly PAYE Tax</span>
            <p className="font-mono text-xl font-bold text-[#c7cb2d]">
              ₦{monthlyPaye.toLocaleString()} {payeInfo.isExempt ? "(Tax-Exempt)" : ""}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-muted)]">
              {payeInfo.isExempt ? "Statutory Minimum Wage / CRA Relief" : "Graduated PITA Schedule"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Net Take-Home Pay</span>
            <p className="font-mono text-xl font-bold text-emerald-400">
              ₦{netTakeHome.toLocaleString()}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-muted)]">
              {resolvedStaff?.bank_name
                ? `${resolvedStaff.bank_name} • ${resolvedStaff.bank_account_no || "Account on file"}`
                : "Disbursement account on file"}
            </p>
          </div>
        </div>
      </div>

      {/* MY MONTHLY PAYSLIPS LIST */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
            My Monthly Payslips ({payslips.length})
          </h3>
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Click any month to view & print official PDF
          </span>
        </div>

        {loading ? (
          <div className="p-8 rounded-2xl bg-[var(--bg-main)] text-center text-xs text-[var(--text-muted)]">
            Loading your payslip records...
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--bg-main)] text-center space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              No processed payslips available for your account yet.
            </p>
            <p className="text-[11px] text-[var(--text-dim)]">
              Once Finance runs or approves monthly payroll in the Finance Desk, your payslips will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payslips.map((slip) => {
              const periodLabel = slip.pay_period || slip.period || slip.month || "Monthly Payroll";
              const netAmt = Number(slip.net_pay || slip.net_salary || slip.amount || netTakeHome);
              const grossAmt = Number(slip.gross_pay || slip.basic_salary || slip.gross_salary || grossMonthly);
              const taxAmt = Number(slip.tax_deducted || slip.paye_tax || slip.tax || 0);

              return (
                <div
                  key={slip.id}
                  onClick={() =>
                    setSelectedPayslip({
                      ...slip,
                      payslip_no: slip.payslip_no || `LS/PAY/${periodLabel}/${resolvedStaff?.staff_id || "01"}`,
                      staff_name: slip.staff_name || `${resolvedStaff?.first_name || ""} ${resolvedStaff?.last_name || ""}`.trim(),
                      staff_code: slip.staff_code || resolvedStaff?.staff_id || "LS-01",
                      department: slip.department || resolvedStaff?.department || "Executive",
                      job_title: slip.job_title || resolvedStaff?.job_title || "Staff",
                      pay_period: periodLabel,
                      basic_salary: Number(slip.basic_salary || Math.round(grossAmt * 0.85)),
                      allowances: Number(slip.allowances || Math.round(grossAmt * 0.15)),
                      gross_pay: grossAmt,
                      tax_deducted: taxAmt,
                      net_pay: netAmt,
                      bank_name: slip.bank_name || resolvedStaff?.bank_name || "",
                      bank_account_no: slip.bank_account_no || resolvedStaff?.bank_account_no || "",
                    })
                  }
                  className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 hover:border-[#c7cb2d] transition flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#c7cb2d]" />
                      <span className="font-display text-sm font-bold group-hover:text-[#c7cb2d] transition">
                        {periodLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#c7cb2d]/15 text-[#c7cb2d] text-[9px] font-mono uppercase font-bold">
                        {slip.status || "Approved"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">
                      Gross: ₦{grossAmt.toLocaleString()} • Tax: ₦{taxAmt.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-mono text-sm font-bold text-emerald-400">
                      ₦{netAmt.toLocaleString()}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#c7cb2d]">
                      <Printer className="w-3 h-3" /> Print PDF
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OFFICIAL BRANDED PAYSLIP PDF MODAL */}
      {selectedPayslip && (
        <OfficialDocumentModal
          type="payslip"
          data={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
}
