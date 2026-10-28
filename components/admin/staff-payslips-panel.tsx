"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Printer, Calendar } from "lucide-react";
import OfficialDocumentModal from "@/components/admin/official-document-modal";
import { resolveStaffCompensation, computeNigerianMonthlyPAYE } from "@/components/admin/tax-compliance-suite";

export default function StaffPayslipsPanel({ staffProfile }: { staffProfile?: any }) {
  const supabase = createClient();
  const [payslips, setPayslips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPayslip, setSelectedPayslip] = React.useState<any | null>(null);

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

    // Query the exact payroll table detected from Finance first, plus any fallback payroll tables
    const tablesToCheck = Array.from(
      new Set(["payroll_runs", "payroll_records", "payroll_runs", "staff_payroll", "payslips"])
    );

    let allRows: any[] = [];
    for (const t of tablesToCheck) {
      const { data, error } = await supabase.from(t).select("*").order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        allRows = [...allRows, ...data];
      }
    }

    if (me && allRows.length > 0) {
      const myId = String(me.id || "").toLowerCase();
      const myCode = String(me.staff_id || "").trim().toUpperCase();
      const myEmail = String(me.email || userEmail || "").trim().toLowerCase();
      const myFirst = String(me.first_name || "").trim().toLowerCase();
      const myLast = String(me.last_name || "").trim().toLowerCase();

      const mine = allRows.filter((row) => {
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

  const comp = resolveStaffCompensation(staffProfile);
  const paye = computeNigerianMonthlyPAYE(comp.gross);
  const defaultNet = Math.max(0, comp.gross - paye.monthlyPAYE);

  return (
    <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">My Monthly Payslips ({payslips.length})</h2>
        <span className="text-[11px] font-mono text-[var(--text-dim)]">Click any record to view & print PDF</span>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-muted)] py-6 text-center">Loading payslips...</p>
      ) : payslips.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[var(--bg-main)] text-center text-xs text-[var(--text-muted)]">
          No processed payslips found for {staffProfile?.first_name || "your account"} ({staffProfile?.staff_id || "LS"}) yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payslips.map((slip, idx) => {
            const periodLabel = slip.pay_period || slip.period || slip.month || "Monthly Payroll";
            const grossAmt = Number(slip.gross_pay || slip.basic_salary || slip.gross_salary || comp.gross);
            const taxAmt = Number(slip.tax_deducted || slip.paye_tax || slip.tax || paye.monthlyPAYE);
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
                    <span className="px-2 py-0.5 rounded bg-[#c7cb2d]/15 text-[#c7cb2d] text-[9px] font-mono uppercase font-bold">
                      {slip.status || "Paid"}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Gross: ₦{grossAmt.toLocaleString()} • PAYE: ₦{taxAmt.toLocaleString()}
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
