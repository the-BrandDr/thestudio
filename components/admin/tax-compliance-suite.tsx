"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  FileSpreadsheet,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
} from "lucide-react";

/**
 * Strictly reads the staff member's saved salary from their profile row in staff_profiles.
 * Never falls back to or selects from the Salary Structure guide.
 */
export function resolveStaffCompensation(staffRow: any) {
  const savedGross = Number(staffRow?.salary_amount || 0);
  const savedBasic = Number(staffRow?.basic_salary || 0);
  const savedTrans = Number(staffRow?.transport_housing_allowance || 0);
  const savedNet = Number(staffRow?.internet_allowance || 0);
  const sumParts = savedBasic + savedTrans + savedNet;

  const gross = savedGross > 0 ? savedGross : sumParts;
  const basic = savedBasic > 0 ? savedBasic : Math.round(gross * 0.85);
  const transportHousing = savedTrans > 0 ? savedTrans : Math.round(gross * 0.10);
  const internet = savedNet > 0 ? savedNet : Math.max(0, gross - basic - transportHousing);

  return {
    gross,
    basic,
    transportHousing,
    internet,
    levelLabel: staffRow?.hierarchy_level || "L3 - Mid-Level Specialist",
    stepNum: Number(staffRow?.step_level || 1),
  };
}

export function computeNigerianMonthlyPAYE(paidMonthlyGross: number, monthlyRelief = 0) {
  const gross = Math.max(0, Number(paidMonthlyGross || 0));
  if (gross <= 0) {
    return {
      monthlyGross: 0,
      annualGross: 0,
      annualCRA: 0,
      annualTaxableIncome: 0,
      annualTax: 0,
      monthlyPAYE: 0,
      effectiveRatePct: 0,
      isExempt: true,
    };
  }

  const annualGross = gross * 12;
  const annualApprovedRelief = Math.max(0, Number(monthlyRelief || 0)) * 12;

  if (gross <= 70000) {
    return {
      monthlyGross: gross,
      annualGross,
      annualCRA: 0,
      annualTaxableIncome: 0,
      annualTax: 0,
      monthlyPAYE: 0,
      effectiveRatePct: 0,
      isExempt: true,
    };
  }

  const annualCRA = Math.round(Math.max(200000, annualGross * 0.01) + annualGross * 0.2);
  const annualTaxableIncome = Math.max(0, annualGross - annualCRA - annualApprovedRelief);

  if (annualTaxableIncome <= 0) {
    return {
      monthlyGross: gross,
      annualGross,
      annualCRA,
      annualTaxableIncome: 0,
      annualTax: 0,
      monthlyPAYE: 0,
      effectiveRatePct: 0,
      isExempt: true,
    };
  }

  let rem = annualTaxableIncome;
  let annualTax = 0;
  const bands = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 },
  ];

  for (const b of bands) {
    if (rem <= 0) break;
    const slice = Math.min(rem, b.limit);
    annualTax += slice * b.rate;
    rem -= slice;
  }

  const monthlyPAYE = Math.round(annualTax / 12);
  return {
    monthlyGross: gross,
    annualGross,
    annualCRA,
    annualTaxableIncome: Math.round(annualTaxableIncome),
    annualTax: Math.round(annualTax),
    monthlyPAYE,
    effectiveRatePct: Number(((monthlyPAYE / gross) * 100).toFixed(1)),
    isExempt: false,
  };
}

export default function TaxComplianceSuite({ execViewOnly = false }: { execViewOnly?: boolean }) {
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [payrollRows, setPayrollRows] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [receipts, setReceipts] = React.useState<any[]>([]);
  const [vouchers, setVouchers] = React.useState<any[]>([]);
  const [records, setRecords] = React.useState<any[]>([]);
  const [smallCompanyExempt, setSmallCompanyExempt] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  const [filingModal, setFilingModal] = React.useState<{
    id?: string;
    tax_period: string;
    tax_type: string;
    authority: string;
    taxable_base: number;
    tax_payable: number;
    due_date: string;
    filing_status: string;
    remittance_ref: string;
    notes: string;
  } | null>(null);

  const loadData = React.useCallback(async () => {
    const [{ data: pay }, { data: inv }, { data: rct }, { data: vch }, { data: rec }] = await Promise.all([
      supabase.from("payroll_runs").select("*").order("created_at", { ascending: false }),
      supabase.from("client_invoices").select("*"),
      supabase.from("payment_receipts").select("*"),
      supabase.from("expense_vouchers").select("*").eq("status", "approved"),
      supabase.from("tax_compliance_records").select("*").order("created_at", { ascending: false }),
    ]);
    if (pay) setPayrollRows(pay);
    if (inv) setInvoices(inv);
    if (rct) setReceipts(rct);
    if (vch) setVouchers(vch);
    if (rec) setRecords(rec);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 1. STRICT DISBURSED PAYROLL PAYE:
  //    Only includes payroll rows for selectedPeriod whose status is approved / paid / disbursed!
  const disbursedPeriodPayrolls = React.useMemo(() => {
    return payrollRows.filter((row) => {
      const pPeriod = String(row.pay_period || row.period || row.month || row.created_at || "").slice(0, 7);
      const st = String(row.status || "").toLowerCase();
      const isDisbursed = st === "approved" || st === "paid" || st === "disbursed" || st === "completed";
      return pPeriod === selectedPeriod && isDisbursed;
    });
  }, [payrollRows, selectedPeriod]);

  const payeRows = React.useMemo(() => {
    return disbursedPeriodPayrolls.map((row) => {
      const paidGross = Number(row.gross_pay || row.basic_salary || row.net_pay || row.amount || 0);
      const calc = computeNigerianMonthlyPAYE(paidGross);
      const recordedTax =
        row.tax_deducted !== undefined && row.tax_deducted !== null
          ? Number(row.tax_deducted)
          : calc.monthlyPAYE;
      const netDisbursed = Number(row.net_pay || Math.max(0, paidGross - recordedTax));

      return {
        id: row.id,
        staff_code: row.staff_code || row.staff_id || "STAFF",
        name: row.staff_name || row.full_name || "Staff Member",
        role: row.job_title || row.department || "Staff",
        paidGross,
        monthlyPAYE: recordedTax,
        netPay: netDisbursed,
        isExempt: recordedTax <= 0,
      };
    });
  }, [disbursedPeriodPayrolls]);

  const totalDisbursedPayroll = payeRows.reduce((a, r) => a + r.paidGross, 0);
  const totalMonthlyPAYE = payeRows.reduce((a, r) => a + r.monthlyPAYE, 0);

  // 2. STRICT PAID VAT (7.5%): Only calculates VAT on PAID invoices (or issued receipts) in selectedPeriod
  const paidMonthInvoices = invoices.filter((i) => {
    const p = String(i.paid_at || i.created_at || i.issue_date || "").slice(0, 7);
    const st = String(i.status || "").toLowerCase();
    return p === selectedPeriod && (st === "paid" || st === "completed" || Number(i.amount_paid || 0) > 0);
  });

  const paidRevenueBase = paidMonthInvoices.reduce(
    (a, i) => a + Number(i.subtotal || i.amount_paid || i.total_amount || 0),
    0
  );
  const monthlyPaidVAT = paidMonthInvoices.reduce(
    (a, i) => a + Number(i.vat_amount || Math.round(Number(i.subtotal || 0) * 0.075)),
    0
  );

  // 3. ANNUAL CIT (Strictly on Paid Revenue minus Disbursed Payroll & Approved Vouchers)
  const yearStr = selectedPeriod.slice(0, 4);
  const annualPaidRevenue = invoices
    .filter((i) => {
      const st = String(i.status || "").toLowerCase();
      return String(i.created_at || "").startsWith(yearStr) && (st === "paid" || Number(i.amount_paid || 0) > 0);
    })
    .reduce((a, i) => a + Number(i.amount_paid || i.total_amount || 0), 0);

  const annualDisbursedSalaries = payrollRows
    .filter((r) => {
      const st = String(r.status || "").toLowerCase();
      const yr = String(r.pay_period || r.created_at || "").slice(0, 4);
      return yr === yearStr && (st === "approved" || st === "paid" || st === "disbursed");
    })
    .reduce((a, r) => a + Number(r.gross_pay || r.net_pay || 0), 0);

  const annualApprovedVouchers = vouchers
    .filter((v) => String(v.created_at || "").startsWith(yearStr))
    .reduce((a, v) => a + Number(v.amount || 0), 0);

  const assessableProfit = Math.max(0, annualPaidRevenue - annualDisbursedSalaries - annualApprovedVouchers);
  const estimatedCIT = smallCompanyExempt ? 0 : Math.round(assessableProfit * 0.2);

  const getNextMonthDue = (period: string, day: number) => {
    const [y, m] = period.split("-").map(Number);
    if (!y || !m) return `${day}th next month`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return `${nextY}-${String(nextM).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const openFilingModal = (type: "PAYE" | "VAT" | "CIT") => {
    if (type === "PAYE") {
      setFilingModal({
        tax_period: selectedPeriod,
        tax_type: "Monthly PAYE (Disbursed Payroll)",
        authority: "OYSIRS (Oyo State)",
        taxable_base: totalDisbursedPayroll,
        tax_payable: totalMonthlyPAYE,
        due_date: getNextMonthDue(selectedPeriod, 10),
        filing_status: totalMonthlyPAYE === 0 ? "exempt" : "remitted",
        remittance_ref: "",
        notes: `Disbursed staff count: ${payeRows.length}`,
      });
    } else if (type === "VAT") {
      setFilingModal({
        tax_period: selectedPeriod,
        tax_type: "Monthly VAT 7.5% (Paid Invoices)",
        authority: "FIRS / NRS",
        taxable_base: paidRevenueBase,
        tax_payable: monthlyPaidVAT,
        due_date: getNextMonthDue(selectedPeriod, 21),
        filing_status: monthlyPaidVAT === 0 ? "computed" : "remitted",
        remittance_ref: "",
        notes: `Paid invoices in period: ${paidMonthInvoices.length}`,
      });
    } else {
      setFilingModal({
        tax_period: `FY-${yearStr}`,
        tax_type: "Annual CIT",
        authority: "FIRS / NRS",
        taxable_base: assessableProfit,
        tax_payable: estimatedCIT,
        due_date: `${Number(yearStr) + 1}-06-30`,
        filing_status: smallCompanyExempt ? "exempt" : "filed",
        remittance_ref: "",
        notes: smallCompanyExempt ? "Small Company 0% CIT Exemption" : "Standard CIT Filing",
      });
    }
  };

  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingModal || execViewOnly) return;
    setSaving(true);

    const payload = {
      tax_period: filingModal.tax_period,
      tax_type: filingModal.tax_type,
      authority: filingModal.authority,
      taxable_base: Number(filingModal.taxable_base || 0),
      tax_payable: Number(filingModal.tax_payable || 0),
      due_date: filingModal.due_date,
      filing_status: filingModal.filing_status,
      remittance_ref: filingModal.remittance_ref.trim(),
      notes: filingModal.notes.trim(),
    };

    const { error } = filingModal.id
      ? await supabase.from("tax_compliance_records").update(payload).eq("id", filingModal.id)
      : await supabase.from("tax_compliance_records").insert(payload);

    setSaving(false);
    if (!error) {
      setFilingModal(null);
      setNotice("Saved to filing records");
      setTimeout(() => setNotice(""), 2500);
      loadData();
    } else {
      alert("Error saving record: " + error.message);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (execViewOnly || !window.confirm("Remove this filing record?")) return;
    await supabase.from("tax_compliance_records").delete().eq("id", id);
    loadData();
  };

  const exportTaxCSV = () => {
    const rows = [
      ["Staff Code", "Full Name", "Role", "Disbursed Gross (NGN)", "PAYE Tax (NGN)", "Net Disbursed (NGN)", "Status"],
      ...payeRows.map((r) => [
        r.staff_code,
        `"${r.name}"`,
        `"${r.role}"`,
        r.paidGross,
        r.monthlyPAYE,
        r.netPay,
        r.isExempt ? "Exempt" : "Taxable",
      ]),
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `Lavie-Disbursed-PAYE-${selectedPeriod}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* HEADER BAR */}
      <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-bold">Tax & Filing Records</h2>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs font-mono text-[#c7cb2d]"
          />
          {notice && (
            <span className="text-xs font-mono text-[#c7cb2d] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {notice}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={exportTaxCSV}
          className="px-4 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* 3 STATUTORY TAX SUMMARY CARDS (STRICTLY ON PAID / DISBURSED TRANSACTIONS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
              Disbursed Staff PAYE (OYSIRS • Due 10th)
            </span>
            <p className="font-mono text-2xl font-bold text-[#c7cb2d]">₦{totalMonthlyPAYE.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Disbursed Salaries: ₦{totalDisbursedPayroll.toLocaleString()} ({payeRows.length} paid in {selectedPeriod})
            </p>
          </div>
          {!execViewOnly && (
            <button
              type="button"
              onClick={() => openFilingModal("PAYE")}
              className="w-full py-2 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[var(--border-subtle)] text-xs font-bold transition cursor-pointer"
            >
              + Log PAYE Return
            </button>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
              Paid VAT 7.5% (FIRS • Due 21st)
            </span>
            <p className="font-mono text-2xl font-bold text-[#c7cb2d]">₦{monthlyPaidVAT.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Paid Revenue Base: ₦{paidRevenueBase.toLocaleString()} ({paidMonthInvoices.length} paid invoices)
            </p>
          </div>
          {!execViewOnly && (
            <button
              type="button"
              onClick={() => openFilingModal("VAT")}
              className="w-full py-2 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[var(--border-subtle)] text-xs font-bold transition cursor-pointer"
            >
              + Log VAT Return
            </button>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
                Annual CIT (FY-{yearStr})
              </span>
              <label className="flex items-center gap-1 text-[10px] font-mono text-[#c7cb2d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={smallCompanyExempt}
                  onChange={(e) => setSmallCompanyExempt(e.target.checked)}
                  className="accent-[#c7cb2d]"
                />
                Small Co. (0%)
              </label>
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
              ₦{estimatedCIT.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {smallCompanyExempt ? "0% Small Company Exemption Active" : `20% of ₦${assessableProfit.toLocaleString()}`}
            </p>
          </div>
          {!execViewOnly && (
            <button
              type="button"
              onClick={() => openFilingModal("CIT")}
              className="w-full py-2 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[var(--border-subtle)] text-xs font-bold transition cursor-pointer"
            >
              + Log Annual CIT Return
            </button>
          )}
        </div>
      </div>

      {/* DISBURSED PAYROLL PAYE SCHEDULE */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">
            Disbursed Salaries & PAYE Schedule ({selectedPeriod})
          </h3>
          <span className="text-[11px] font-mono text-[var(--text-dim)]">
            Computed strictly from approved/disbursed payroll runs
          </span>
        </div>

        {payeRows.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--bg-main)] text-center text-xs text-[var(--text-muted)]">
            No salaries have been disbursed/approved for <strong>{selectedPeriod}</strong> yet. PAYE is ₦0 until payroll is approved and disbursed.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto overflow-x-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 px-2">Role</th>
                  <th className="py-2 px-2">Disbursed Gross</th>
                  <th className="py-2 px-2">PAYE Deducted</th>
                  <th className="py-2 px-2">Net Paid</th>
                  <th className="py-2 pl-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono">
                {payeRows.map((r, i) => (
                  <tr key={r.id || i}>
                    <td className="py-2.5 pr-3 font-sans font-bold">
                      {r.name} <span className="text-[10px] font-mono text-[#c7cb2d]">({r.staff_code})</span>
                    </td>
                    <td className="py-2.5 px-2 font-sans text-[var(--text-muted)]">{r.role}</td>
                    <td className="py-2.5 px-2 font-bold">₦{r.paidGross.toLocaleString()}</td>
                    <td className="py-2.5 px-2 font-bold text-[#c7cb2d]">₦{r.monthlyPAYE.toLocaleString()}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-400">₦{r.netPay.toLocaleString()}</td>
                    <td className="py-2.5 pl-2 font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)]">
                        {r.isExempt ? "0% Exempt" : "Taxed on Paid Salary"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FILED TAX RETURNS & REMITTANCE RECORDS (SCROLLABLE CONTAINER) */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
        <h3 className="font-display text-sm font-bold">Filed Returns & Remittance Log ({records.length})</h3>
        {records.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">
            No filed tax returns recorded yet.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto overflow-x-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 px-2">Tax Type</th>
                  <th className="py-2 px-2">Authority</th>
                  <th className="py-2 px-2">Paid Base</th>
                  <th className="py-2 px-2">Tax Payable</th>
                  <th className="py-2 px-2">Receipt / RRR Ref</th>
                  <th className="py-2 px-2">Status</th>
                  {!execViewOnly && <th className="py-2 pl-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono">
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td className="py-2.5 pr-3 font-bold text-[#c7cb2d]">{rec.tax_period}</td>
                    <td className="py-2.5 px-2 font-sans font-bold">{rec.tax_type}</td>
                    <td className="py-2.5 px-2 font-sans text-[var(--text-muted)]">{rec.authority}</td>
                    <td className="py-2.5 px-2">₦{Number(rec.taxable_base || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-2 font-bold text-[#c7cb2d]">
                      ₦{Number(rec.tax_payable || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-emerald-400">{rec.remittance_ref || "—"}</td>
                    <td className="py-2.5 px-2 font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[10px] font-mono uppercase text-[#c7cb2d]">
                        {rec.filing_status}
                      </span>
                    </td>
                    {!execViewOnly && (
                      <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setFilingModal({
                              id: rec.id,
                              tax_period: rec.tax_period || selectedPeriod,
                              tax_type: rec.tax_type || "",
                              authority: rec.authority || "",
                              taxable_base: Number(rec.taxable_base || 0),
                              tax_payable: Number(rec.tax_payable || 0),
                              due_date: rec.due_date || "",
                              filing_status: rec.filing_status || "remitted",
                              remittance_ref: rec.remittance_ref || "",
                              notes: rec.notes || "",
                            })
                          }
                          className="p-1.5 rounded-lg bg-[var(--bg-main)] hover:text-[#c7cb2d] mr-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg bg-[var(--bg-main)] hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFiling}
            className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {filingModal.id ? "Update Filing Record" : `Log ${filingModal.tax_type}`}
              </h3>
              <button type="button" onClick={() => setFilingModal(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Period</label>
                <input
                  required
                  value={filingModal.tax_period}
                  onChange={(e) => setFilingModal({ ...filingModal, tax_period: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Status</label>
                <select
                  value={filingModal.filing_status}
                  onChange={(e) => setFilingModal({ ...filingModal, filing_status: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="computed">Computed</option>
                  <option value="filed">Filed</option>
                  <option value="remitted">Remitted & Paid</option>
                  <option value="exempt">Exempt (0%)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Paid Base (₦)
                </label>
                <input
                  type="number"
                  value={filingModal.taxable_base}
                  onChange={(e) => setFilingModal({ ...filingModal, taxable_base: Number(e.target.value || 0) })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                  Tax Payable (₦)
                </label>
                <input
                  type="number"
                  value={filingModal.tax_payable}
                  onChange={(e) => setFilingModal({ ...filingModal, tax_payable: Number(e.target.value || 0) })}
                  className="w-full bg-[var(--bg-main)] border border-[#c7cb2d]/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#c7cb2d]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Receipt / FIRS RRR / OYSIRS Reference
              </label>
              <input
                value={filingModal.remittance_ref}
                onChange={(e) => setFilingModal({ ...filingModal, remittance_ref: e.target.value })}
                placeholder="e.g. RRR-2904-8831-9012"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Notes</label>
              <input
                value={filingModal.notes}
                onChange={(e) => setFilingModal({ ...filingModal, notes: e.target.value })}
                placeholder="Optional note..."
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFilingModal(null)}
                className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
              >
                {saving ? "Saving..." : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
