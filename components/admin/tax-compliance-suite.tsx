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

export const DEFAULT_LEVEL_STEP_CONFIG: Record<string, { step1Gross: number; stepIncrement: number }> = {
  "L0 - Auxiliary & Facility Support": { step1Gross: 15000, stepIncrement: 1500 },
  "L1 - Intern / Graduate Trainee": { step1Gross: 20000, stepIncrement: 2000 },
  "L2 - Junior Associate": { step1Gross: 35000, stepIncrement: 3500 },
  "L3 - Mid-Level Specialist": { step1Gross: 50000, stepIncrement: 5000 },
  "L4 - Senior Specialist": { step1Gross: 75000, stepIncrement: 7500 },
  "L5 - Lead / Principal": { step1Gross: 110000, stepIncrement: 10000 },
  "L6 - Department Head": { step1Gross: 150000, stepIncrement: 15000 },
  "L7 - Executive / Director": { step1Gross: 200000, stepIncrement: 20000 },
};

/**
 * Resolves a staff member's accurate Monthly Gross, Basic (85%), Transport/Housing (10%), and Internet (5%).
 * If salary_amount in the DB is 0, it computes the exact amount from their Hierarchy Level & Step.
 */
export function resolveStaffCompensation(staffRow: any) {
  let cfgMap = DEFAULT_LEVEL_STEP_CONFIG;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("lavie_salary_structure_v1");
      if (saved) cfgMap = { ...DEFAULT_LEVEL_STEP_CONFIG, ...JSON.parse(saved) };
    } catch (_) {}
  }

  const rawGross = Number(staffRow?.salary_amount || staffRow?.gross_pay || 0);
  const levelStr =
    staffRow?.hierarchy_level ||
    (String(staffRow?.job_title || "").toLowerCase().includes("director") ||
    String(staffRow?.job_title || "").toLowerCase().includes("ceo")
      ? "L7 - Executive / Director"
      : "L3 - Mid-Level Specialist");
  const stepNum = Math.min(7, Math.max(1, Number(staffRow?.step_level || 1)));

  let gross = rawGross;
  if (gross <= 0) {
    const matchedKey =
      Object.keys(cfgMap).find((k) => k.startsWith(String(levelStr).slice(0, 2))) ||
      "L3 - Mid-Level Specialist";
    const cfg = cfgMap[matchedKey] || DEFAULT_LEVEL_STEP_CONFIG["L3 - Mid-Level Specialist"];
    gross = Number(cfg.step1Gross || 20000) + (stepNum - 1) * Number(cfg.stepIncrement || 2000);
  }

  const basic = Number(staffRow?.basic_salary) > 0 ? Number(staffRow.basic_salary) : Math.round(gross * 0.85);
  const transportHousing =
    Number(staffRow?.transport_housing_allowance) > 0
      ? Number(staffRow.transport_housing_allowance)
      : Math.round(gross * 0.10);
  const internet =
    Number(staffRow?.internet_allowance) > 0
      ? Number(staffRow.internet_allowance)
      : Math.max(0, gross - basic - transportHousing);

  return {
    gross,
    basic,
    transportHousing,
    internet,
    levelLabel: levelStr,
    stepNum,
  };
}

export function computeNigerianMonthlyPAYE(monthlyGross: number, monthlyRelief = 0) {
  const gross = Math.max(0, Number(monthlyGross || 0));
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
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
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
    const [{ data: s }, { data: inv }, { data: vch }, { data: rec }] = await Promise.all([
      supabase.from("staff_profiles").select("*").eq("status", "active").order("staff_id", { ascending: true }),
      supabase.from("client_invoices").select("*"),
      supabase.from("expense_vouchers").select("*").eq("status", "approved"),
      supabase.from("tax_compliance_records").select("*").order("created_at", { ascending: false }),
    ]);
    if (s) setStaffList(s);
    if (inv) setInvoices(inv);
    if (vch) setVouchers(vch);
    if (rec) setRecords(rec);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 1. Accurate Staff PAYE Computation (Never shows ₦0 if Level/Step is assigned)
  const payeRows = React.useMemo(() => {
    return staffList.map((st) => {
      const comp = resolveStaffCompensation(st);
      const calc = computeNigerianMonthlyPAYE(comp.gross);
      return {
        staff_id: st.staff_id,
        name: `${st.first_name || ""} ${st.last_name || ""}`.trim(),
        role: st.job_title || st.department,
        level: `${String(comp.levelLabel).split(" - ")[0]} • S${comp.stepNum}`,
        gross: comp.gross,
        monthlyPAYE: calc.monthlyPAYE,
        netPay: comp.gross - calc.monthlyPAYE,
        isExempt: calc.isExempt,
      };
    });
  }, [staffList]);

  const totalPayrollGross = payeRows.reduce((a, r) => a + r.gross, 0);
  const totalMonthlyPAYE = payeRows.reduce((a, r) => a + r.monthlyPAYE, 0);

  // 2. Monthly VAT (7.5%)
  const monthInvoices = invoices.filter((i) =>
    String(i.created_at || i.issue_date || "").startsWith(selectedPeriod)
  );
  const monthRevenueBase = monthInvoices.reduce((a, i) => a + Number(i.subtotal || i.total_amount || 0), 0);
  const monthlyVAT = monthInvoices.reduce(
    (a, i) => a + Number(i.vat_amount || Math.round(Number(i.subtotal || 0) * 0.075)),
    0
  );

  // 3. Annual CIT
  const yearStr = selectedPeriod.slice(0, 4);
  const annualRevenue = invoices
    .filter((i) => String(i.created_at || "").startsWith(yearStr))
    .reduce((a, i) => a + Number(i.total_amount || 0), 0);
  const annualExpenses =
    vouchers
      .filter((v) => String(v.created_at || "").startsWith(yearStr))
      .reduce((a, v) => a + Number(v.amount || 0), 0) +
    totalPayrollGross * 12;
  const assessableProfit = Math.max(0, annualRevenue - annualExpenses);
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
        tax_type: "Monthly PAYE",
        authority: "OYSIRS (Oyo State)",
        taxable_base: totalPayrollGross,
        tax_payable: totalMonthlyPAYE,
        due_date: getNextMonthDue(selectedPeriod, 10),
        filing_status: totalMonthlyPAYE === 0 ? "exempt" : "remitted",
        remittance_ref: "",
        notes: `Staff count: ${payeRows.length}`,
      });
    } else if (type === "VAT") {
      setFilingModal({
        tax_period: selectedPeriod,
        tax_type: "Monthly VAT (7.5%)",
        authority: "FIRS / NRS",
        taxable_base: monthRevenueBase,
        tax_payable: monthlyVAT,
        due_date: getNextMonthDue(selectedPeriod, 21),
        filing_status: monthlyVAT === 0 ? "computed" : "remitted",
        remittance_ref: "",
        notes: `Invoices in period: ${monthInvoices.length}`,
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
      ["Staff ID", "Full Name", "Role", "Grade", "Monthly Gross (NGN)", "Monthly PAYE (NGN)", "Net Take-Home (NGN)", "Status"],
      ...payeRows.map((r) => [
        r.staff_id,
        `"${r.name}"`,
        `"${r.role}"`,
        `"${r.level}"`,
        r.gross,
        r.monthlyPAYE,
        r.netPay,
        r.isExempt ? "Exempt" : "Taxable",
      ]),
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `Lavie-Tax-Schedule-${selectedPeriod}.csv`;
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

      {/* 3 STATUTORY TAX SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
              Monthly Staff PAYE (OYSIRS • Due 10th)
            </span>
            <p className="font-mono text-2xl font-bold text-[#c7cb2d]">₦{totalMonthlyPAYE.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Payroll Base: ₦{totalPayrollGross.toLocaleString()} ({payeRows.length} staff)
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
              Monthly VAT 7.5% (FIRS • Due 21st)
            </span>
            <p className="font-mono text-2xl font-bold text-[#c7cb2d]">₦{monthlyVAT.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Invoiced Base: ₦{monthRevenueBase.toLocaleString()} ({monthInvoices.length} invoices)
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

      {/* STAFF PAYE SCHEDULE (WITH ACCURATE LEVEL/STEP SALARIES) */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3 overflow-x-auto">
        <h3 className="font-display text-sm font-bold">Staff PAYE Schedule</h3>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
              <th className="py-2 pr-3">Staff</th>
              <th className="py-2 px-2">Role</th>
              <th className="py-2 px-2">Grade & Step</th>
              <th className="py-2 px-2">Monthly Gross</th>
              <th className="py-2 px-2">Monthly PAYE</th>
              <th className="py-2 px-2">Net Take-Home</th>
              <th className="py-2 pl-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono">
            {payeRows.map((r) => (
              <tr key={r.staff_id}>
                <td className="py-2.5 pr-3 font-sans font-bold">
                  {r.name} <span className="text-[10px] font-mono text-[#c7cb2d]">({r.staff_id})</span>
                </td>
                <td className="py-2.5 px-2 font-sans text-[var(--text-muted)]">{r.role}</td>
                <td className="py-2.5 px-2 text-[11px] text-[#c7cb2d]">{r.level}</td>
                <td className="py-2.5 px-2 font-bold">₦{r.gross.toLocaleString()}</td>
                <td className="py-2.5 px-2 font-bold text-[#c7cb2d]">₦{r.monthlyPAYE.toLocaleString()}</td>
                <td className="py-2.5 px-2 font-bold text-emerald-400">₦{r.netPay.toLocaleString()}</td>
                <td className="py-2.5 pl-2 font-sans">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)]">
                    {r.isExempt ? "0% Exempt (≤ ₦70k / CRA)" : "Taxable (PITA)"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FILED TAX RETURNS & REMITTANCE RECORDS */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3 overflow-x-auto">
        <h3 className="font-display text-sm font-bold">Filed Returns & Remittance Log ({records.length})</h3>
        {records.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">
            No filed tax returns recorded yet. Click "+ Log Return" on any card above to record a filing.
          </p>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
                <th className="py-2 pr-3">Period</th>
                <th className="py-2 px-2">Tax Type</th>
                <th className="py-2 px-2">Authority</th>
                <th className="py-2 px-2">Taxable Base</th>
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
        )}
      </div>

      {/* FILING MODAL */}
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
                  Taxable Base (₦)
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
