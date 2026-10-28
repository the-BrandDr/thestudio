"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Printer, Calendar, Filter } from "lucide-react";
import OfficialDocumentModal from "@/components/admin/official-document-modal";
import { resolveStaffCompensation, computeNigerianMonthlyPAYE } from "@/components/admin/tax-compliance-suite";

const MONTHS_LIST = [
  { value: "all", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function StaffPayslipsPanel({ staffProfile }: { staffProfile?: any }) {
  const supabase = createClient();
  const [payslips, setPayslips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPayslip, setSelectedPayslip] = React.useState<any | null>(null);
  const [filterYear, setFilterYear] = React.useState<string>("all");
  const [filterMonth, setFilterMonth] = React.useState<string>("all");

  const loadPayslips = React.useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const userEmail = authData?.user?.email?.toLowerCase();

    let me = staffProfile;
    if (!me || !me.staff_id) {
      const { data: allStaff } = await supabase.from("staff_profiles").select("*");
      if (allStaff && allStaff.length > 0) {
        me =
          allStaff.find((s) => userEmail && s.email?.toLowerCase() === userEmail) ||
          (userEmail === "hipheholluhayegboyin@gmail.com" ? allStaff.find((s) => s.staff_id === "LS-01") : null) ||
          allStaff[0];
      }
    }

    const tablesToCheck = Array.from(
      new Set(["payroll_runs", "payroll_records", "payroll_runs", "staff_payroll", "payslips"])
    );

    let allRows: any[] = [];
    for (const t of tablesToCheck) {
      const { data, error } = await supabase.from(t).select("*").order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        allRows = [...allRows, ...data];
        break;
      }
    }

    if (me && allRows.length > 0) {
      const myId = String(me.id || "").toLowerCase();
      const myCode = String(me.staff_id || "").trim().toUpperCase();
      const myEmail = String(me.email || userEmail || "").trim().toLowerCase();
      const myFirst = String(me.first_name || "").trim().toLowerCase();
      const myLast = String(me.last_name || "").trim().toLowerCase();

      const mine = allRows.filter((row) => {
        // ONLY show Approved / Paid / Disbursed payslips to staff!
        const st = String(row.status || "").toLowerCase();
        const isApproved = st === "approved" || st === "paid" || st === "disbursed" || st === "completed";
        if (!isApproved) return false;

        const rId = String(row.staff_id || "").toLowerCase();
        const rCode = String(row.staff_code || row.employee_id || row.staff_id || "").trim().toUpperCase();
        const rEmail = String(row.staff_email || row.email || "").trim().toLowerCase();
        const rName = String(row.staff_name || row.full_name || row.name || "").trim().toLowerCase();

        if (myId && rId === myId) return true;
        if (myCode && (rCode === myCode || rName.includes(myCode.toLowerCase()))) return true;
        if (myEmail && rEmail === myEmail) return true;
        if (myFirst && myLast && rName.includes(myFirst) && rName.includes(myLast)) return true;
        if (myFirst && myCode === "LS-01" && rName.includes(myFirst)) return true;
        return false;
      });

      setPayslips(mine);
    } else {
      setPayslips([]);
    }

    setLoading(false);
  }, [supabase, staffProfile]);

  React.useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  // Extract available years from approved payslips (+ current year)
  const availableYears = React.useMemo(() => {
    const yrs = new Set<string>([String(new Date().getFullYear()), "2026", "2025"]);
    payslips.forEach((s) => {
      const p = String(s.pay_period || s.period || s.month || s.created_at || "");
      const m = p.match(/(20\d\d)/);
      if (m) yrs.add(m[1]);
    });
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [payslips]);

  const filteredPayslips = React.useMemo(() => {
    return payslips.filter((slip) => {
      const rawPeriod = String(slip.pay_period || slip.period || slip.month || slip.created_at || "");
      if (filterYear !== "all" && !rawPeriod.includes(filterYear)) return false;
      if (filterMonth !== "all") {
        // Match YYYY-MM or month name
        const monthObj = MONTHS_LIST.find((m) => m.value === filterMonth);
        const matchesNumeric = rawPeriod.includes(`-${filterMonth}`) || rawPeriod.endsWith(`/${filterMonth}`);
        const matchesName = monthObj && rawPeriod.toLowerCase().includes(monthObj.label.toLowerCase());
        if (!matchesNumeric && !matchesName) return false;
      }
      return true;
    });
  }, [payslips, filterYear, filterMonth]);

  const comp = resolveStaffCompensation(staffProfile);
  const paye = computeNigerianMonthlyPAYE(comp.gross);
  const defaultNet = Math.max(0, comp.gross - paye.monthlyPAYE);

  return (
    <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold">
            My Payslips ({filteredPayslips.length})
          </h2>
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Monthly payslips are displayed here
          </span>
        </div>

        {/* YEAR & MONTH FILTER */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--bg-main)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
            <Filter className="w-3.5 h-3.5 text-[#c7cb2d]" />
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="bg-transparent text-xs font-mono focus:outline-none cursor-pointer"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs font-mono cursor-pointer"
          >
            {MONTHS_LIST.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-muted)] py-6 text-center">Loading approved payslips...</p>
      ) : filteredPayslips.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[var(--bg-main)] text-center text-xs text-[var(--text-muted)]">
          No approved payslips found for the selected period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredPayslips.map((slip, idx) => {
            const periodLabel = slip.pay_period || slip.period || slip.month || "Monthly Payroll";
            const grossAmt = Number(slip.gross_pay || slip.basic_salary || slip.gross_salary || comp.gross);
            const taxAmt = Number(slip.tax_deducted || slip.paye_tax || slip.tax || 0);
            const netAmt = Number(slip.net_pay || slip.net_salary || slip.amount || Math.max(0, grossAmt - taxAmt) || defaultNet);

            return (
              <div
                key={slip.id || idx}
                onClick={() =>
                  setSelectedPayslip({
                    ...slip,
                    payslip_no: slip.payslip_no || `LS/PAY/${periodLabel}/${staffProfile?.staff_id || "01"}`,
                    staff_name: slip.staff_name || `${staffProfile?.first_name || ""} ${staffProfile?.last_name || ""}`.trim(),
                    staff_code: slip.staff_code || staffProfile?.staff_id || "LS-01",
                    department: slip.department || staffProfile?.department || "Executive",
                    job_title: slip.job_title || staffProfile?.job_title || "Staff",
                    pay_period: periodLabel,
                    basic_salary: Number(slip.basic_salary || Math.round(grossAmt * 0.85)),
                    allowances: Number(slip.allowances || Math.round(grossAmt * 0.15)),
                    gross_pay: grossAmt,
                    tax_deducted: taxAmt,
                    net_pay: netAmt,
                    bank_name: slip.bank_name || staffProfile?.bank_name || "",
                    bank_account_no: slip.bank_account_no || staffProfile?.bank_account_no || "",
                  })
                }
                className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 hover:border-[#c7cb2d] transition flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#c7cb2d]" />
                    <span className="font-display text-sm font-bold">{periodLabel}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-mono uppercase font-bold">
                      {slip.status || "Approved"}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Paid Gross: ₦{grossAmt.toLocaleString()} • PAYE: ₦{taxAmt.toLocaleString()}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-mono text-sm font-bold text-emerald-400">₦{netAmt.toLocaleString()}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#c7cb2d]">
                    <Printer className="w-3 h-3" /> Print PDF
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
