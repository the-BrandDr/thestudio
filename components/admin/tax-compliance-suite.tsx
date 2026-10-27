"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";

export function computeNigerianMonthlyPAYE(monthlyGross: number) {
  const gross = Math.max(0, Number(monthlyGross || 0));
  const annualGross = gross * 12;

  if (gross <= 70000) {
    return { monthlyPAYE: 0, annualCRA: 0, annualTaxableIncome: 0, isExempt: true };
  }

  const annualCRA = Math.round(Math.max(200000, annualGross * 0.01) + annualGross * 0.2);
  const annualTaxableIncome = Math.max(0, annualGross - annualCRA);

  if (annualTaxableIncome <= 0) {
    return { monthlyPAYE: 0, annualCRA, annualTaxableIncome: 0, isExempt: true };
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

  return {
    monthlyPAYE: Math.round(annualTax / 12),
    annualCRA,
    annualTaxableIncome: Math.round(annualTaxableIncome),
    isExempt: false,
  };
}

export default function TaxComplianceSuite({ execViewOnly = false }: { execViewOnly?: boolean }) {
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [vouchers, setVouchers] = React.useState<any[]>([]);
  const [smallCompanyExempt, setSmallCompanyExempt] = React.useState(true);
  const [savedNotice, setSavedNotice] = React.useState("");

  React.useEffect(() => {
    Promise.all([
      supabase.from("staff_profiles").select("*").eq("status", "active").order("staff_id", { ascending: true }),
      supabase.from("client_invoices").select("*"),
      supabase.from("expense_vouchers").select("*").eq("status", "approved"),
    ]).then(([{ data: s }, { data: inv }, { data: vch }]) => {
      if (s) setStaffList(s);
      if (inv) setInvoices(inv);
      if (vch) setVouchers(vch);
    });
  }, [supabase]);

  const payeRows = React.useMemo(() => {
    return staffList.map((st) => {
      const gross = Number(st.salary_amount || 0);
      const calc = computeNigerianMonthlyPAYE(gross);
      return {
        staff_id: st.staff_id,
        name: `${st.first_name || ""} ${st.last_name || ""}`.trim(),
        role: st.job_title || st.department,
        gross,
        monthlyPAYE: calc.monthlyPAYE,
        netPay: gross - calc.monthlyPAYE,
        isExempt: calc.isExempt,
      };
    });
  }, [staffList]);

  const totalMonthlyPayroll = payeRows.reduce((a, r) => a + r.gross, 0);
  const totalMonthlyPAYE = payeRows.reduce((a, r) => a + r.monthlyPAYE, 0);

  const periodInvoices = invoices.filter((i) =>
    String(i.created_at || i.issue_date || "").startsWith(selectedPeriod)
  );
  const monthlyVAT = periodInvoices.reduce(
    (a, i) => a + Number(i.vat_amount || Math.round(Number(i.subtotal || 0) * 0.075)),
    0
  );

  const yearPrefix = selectedPeriod.slice(0, 4);
  const annualTurnover = invoices
    .filter((i) => String(i.created_at || "").startsWith(yearPrefix))
    .reduce((a, i) => a + Number(i.total_amount || 0), 0);
  const annualCosts =
    vouchers
      .filter((v) => String(v.created_at || "").startsWith(yearPrefix))
      .reduce((a, v) => a + Number(v.amount || 0), 0) +
    totalMonthlyPayroll * 12;
  const annualProfit = Math.max(0, annualTurnover - annualCosts);
  const annualCIT = smallCompanyExempt ? 0 : Math.round(annualProfit * 0.2);

  const exportSimpleCSV = () => {
    const rows = [
      ["Staff ID", "Name", "Role", "Monthly Gross (NGN)", "Monthly PAYE (NGN)", "Net Pay (NGN)", "Status"],
      ...payeRows.map((r) => [
        r.staff_id,
        `"${r.name}"`,
        `"${r.role}"`,
        r.gross,
        r.monthlyPAYE,
        r.netPay,
        r.isExempt ? "Exempt" : "Taxable",
      ]),
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `Tax-Summary-${selectedPeriod}.csv`;
    a.click();
  };

  const saveQuickSnapshot = async () => {
    if (execViewOnly) return;
    await supabase.from("tax_compliance_records").insert({
      tax_period: selectedPeriod,
      tax_type: "Monthly Tax Summary",
      authority: "OYSIRS / FIRS",
      taxable_base: totalMonthlyPayroll,
      tax_payable: totalMonthlyPAYE + monthlyVAT,
      filing_status: "computed",
    });
    setSavedNotice("Saved to records");
    setTimeout(() => setSavedNotice(""), 2500);
  };

  return (
    <div className="space-y-4">
      {/* CLEAN TOP BAR */}
      <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-bold">Tax Summary</h2>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs font-mono text-[#c7cb2d]"
          />
          {savedNotice && (
            <span className="text-xs font-mono text-[#c7cb2d] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {savedNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!execViewOnly && (
            <button
              type="button"
              onClick={saveQuickSnapshot}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-xs font-semibold cursor-pointer"
            >
              Save Record
            </button>
          )}
          <button
            type="button"
            onClick={exportSimpleCSV}
            className="px-4 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* 3 SIMPLE OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Monthly Staff PAYE (OYSIRS)</span>
          <p className="font-mono text-2xl font-bold text-[#c7cb2d]">₦{totalMonthlyPAYE.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Payroll Base: ₦{totalMonthlyPayroll.toLocaleString()} • Due 10th
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Monthly VAT 7.5% (FIRS)</span>
          <p className="font-mono text-2xl font-bold text-[#c7cb2d]">₦{monthlyVAT.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            From {periodInvoices.length} invoice(s) in {selectedPeriod} • Due 21st
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Annual Company Tax (CIT)</span>
            <label className="flex items-center gap-1 text-[10px] text-[#c7cb2d] cursor-pointer">
              <input
                type="checkbox"
                checked={smallCompanyExempt}
                onChange={(e) => setSmallCompanyExempt(e.target.checked)}
                className="accent-[#c7cb2d]"
              />
              Small Co. (0%)
            </label>
          </div>
          <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">₦{annualCIT.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {smallCompanyExempt ? "0% Small Company Exemption Applied" : "20% Standard Provision"}
          </p>
        </div>
      </div>

      {/* CLEAN STAFF PAYE TABLE */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
              <th className="py-2.5 pr-3">Staff</th>
              <th className="py-2.5 px-2">Role</th>
              <th className="py-2.5 px-2">Monthly Gross</th>
              <th className="py-2.5 px-2">Monthly PAYE</th>
              <th className="py-2.5 px-2">Net Pay</th>
              <th className="py-2.5 pl-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono">
            {payeRows.map((r) => (
              <tr key={r.staff_id}>
                <td className="py-2.5 pr-3 font-sans font-bold">
                  {r.name} <span className="text-[10px] font-mono text-[#c7cb2d]">({r.staff_id})</span>
                </td>
                <td className="py-2.5 px-2 font-sans text-[var(--text-muted)]">{r.role}</td>
                <td className="py-2.5 px-2">₦{r.gross.toLocaleString()}</td>
                <td className="py-2.5 px-2 font-bold text-[#c7cb2d]">₦{r.monthlyPAYE.toLocaleString()}</td>
                <td className="py-2.5 px-2 font-bold">₦{r.netPay.toLocaleString()}</td>
                <td className="py-2.5 pl-2 font-sans">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)]">
                    {r.isExempt ? "0% Exempt" : "Taxable"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
