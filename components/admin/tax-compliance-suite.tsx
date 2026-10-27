"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  ShieldCheck,
  Calculator,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Building2,
  Landmark,
  Plus,
  Check,
  FileText,
  AlertCircle,
} from "lucide-react";

/**
 * Nigerian Statutory Personal Income Tax (PAYE) Calculator
 * - Exempts earners at or below ₦70,000/month (₦840,000/year National Minimum Wage threshold)
 * - Computes Consolidated Relief Allowance (CRA): Higher of ₦200,000 or 1% of Gross + 20% of Gross
 * - Applies statutory graduated PITA bands:
 *   First ₦300k @ 7% | Next ₦300k @ 11% | Next ₦500k @ 15% | Next ₦500k @ 19% | Next ₦1.6M @ 21% | Above ₦3.2M @ 24%
 */
export function computeNigerianMonthlyPAYE(
  monthlyGross: number,
  monthlyApprovedRelief = 0
): {
  monthlyGross: number;
  annualGross: number;
  annualCRA: number;
  annualApprovedRelief: number;
  annualTaxableIncome: number;
  annualTax: number;
  monthlyPAYE: number;
  effectiveRatePct: number;
  isExempt: boolean;
  exemptionReason: string;
} {
  const gross = Math.max(0, Number(monthlyGross || 0));
  const annualGross = gross * 12;
  const annualApprovedRelief = Math.max(0, Number(monthlyApprovedRelief || 0)) * 12;

  // Statutory Minimum Wage & Low-Income Exemption (<= ₦70,000/mo or ₦840,000/yr)
  if (gross <= 70000) {
    return {
      monthlyGross: gross,
      annualGross,
      annualCRA: 0,
      annualApprovedRelief,
      annualTaxableIncome: 0,
      annualTax: 0,
      monthlyPAYE: 0,
      effectiveRatePct: 0,
      isExempt: true,
      exemptionReason: "Minimum Wage / Low-Income Statutory Exemption (≤ ₦70,000/mo)",
    };
  }

  const fixedOrOnePct = Math.max(200000, annualGross * 0.01);
  const twentyPct = annualGross * 0.2;
  const annualCRA = Math.round(fixedOrOnePct + twentyPct);

  const totalDeductions = annualCRA + annualApprovedRelief;
  const annualTaxableIncome = Math.max(0, annualGross - totalDeductions);

  if (annualTaxableIncome <= 0) {
    return {
      monthlyGross: gross,
      annualGross,
      annualCRA,
      annualApprovedRelief,
      annualTaxableIncome: 0,
      annualTax: 0,
      monthlyPAYE: 0,
      effectiveRatePct: 0,
      isExempt: true,
      exemptionReason: "Covered by Consolidated Relief Allowance (CRA)",
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
    constslice = Math.min(rem, b.limit);
    annualTax += constslice * b.rate;
    rem -= constslice;
  }

  const monthlyPAYE = Math.round(annualTax / 12);
  const effectiveRatePct = Number(((monthlyPAYE / gross) * 100).toFixed(2));

  return {
    monthlyGross: gross,
    annualGross,
    annualCRA,
    annualApprovedRelief,
    annualTaxableIncome: Math.round(annualTaxableIncome),
    annualTax: Math.round(annualTax),
    monthlyPAYE,
    effectiveRatePct,
    isExempt: false,
    exemptionReason: "Standard Graduated PAYE",
  };
}

export default function TaxComplianceSuite({ execViewOnly = false }: { execViewOnly?: boolean }) {
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [vouchers, setVouchers] = React.useState<any[]>([]);
  const [taxRecords, setTaxRecords] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [statusNotice, setStatusNotice] = React.useState("");

  // Small Company Exemption toggle (Nigeria Finance Act: Turnover <= ₦25M - ₦50M is 0% CIT)
  const [smallCompanyExemption, setSmallCompanyExemption] = React.useState(true);
  const [whtCredits, setWhtCredits] = React.useState(0);

  // Remittance filing form
  const [remitModal, setRemitModal] = React.useState<any | null>(null);
  const [remitRef, setRemitRef] = React.useState("");
  const [remitStatus, setRemitStatus] = React.useState("remitted");
  const [remitNotes, setRemitNotes] = React.useState("");

  const loadComplianceData = React.useCallback(async () => {
    const [
      { data: sData },
      { data: invData },
      { data: vchData },
      { data: recData },
    ] = await Promise.all([
      supabase.from("staff_profiles").select("*").eq("status", "active").order("staff_id", { ascending: true }),
      supabase.from("client_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_vouchers").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("tax_compliance_records").select("*").order("created_at", { ascending: false }),
    ]);

    if (sData) setStaffList(sData);
    if (invData) setInvoices(invData);
    if (vchData) setVouchers(vchData);
    if (recData) setTaxRecords(recData);
  }, [supabase]);

  React.useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  // 1. Compute Monthly PAYE Schedule for all Active Staff
  const payeSchedule = React.useMemo(() => {
    return staffList.map((st) => {
      const gross = Number(st.salary_amount || 0);
      const basic = Number(st.basic_salary || Math.round(gross * 0.85));
      const transHousing = Number(st.transport_housing_allowance || Math.round(gross * 0.10));
      const internet = Number(st.internet_allowance || gross - basic - transHousing);
      const calc = computeNigerianMonthlyPAYE(gross, Number(st.tax_relief_amount || 0));
      return {
        staff_id: st.staff_id,
        name: `${st.first_name || ""} ${st.last_name || ""}`.trim(),
        department: st.department,
        level: `${(st.hierarchy_level || "L1").split(" - ")[0]} • S${st.step_level || 1}`,
        gross,
        basic,
        transHousing,
        internet,
        ...calc,
        netPay: gross - calc.monthlyPAYE,
      };
    });
  }, [staffList]);

  const totalMonthlyPayrollGross = payeSchedule.reduce((a, r) => a + r.gross, 0);
  const totalMonthlyPAYE = payeSchedule.reduce((a, r) => a + r.monthlyPAYE, 0);
  const totalAnnualCRA = payeSchedule.reduce((a, r) => a + r.annualCRA, 0);

  // 2. Compute Monthly VAT (7.5%) Schedule for Selected Period (YYYY-MM)
  const periodInvoices = invoices.filter((inv) =>
    String(inv.created_at || inv.issue_date || "").startsWith(selectedPeriod)
  );
  const periodVouchers = vouchers.filter((v) =>
    String(v.created_at || "").startsWith(selectedPeriod)
  );

  const periodNetRevenue = periodInvoices.reduce((a, inv) => a + Number(inv.subtotal || inv.total_amount || 0), 0);
  const outputVAT = periodInvoices.reduce(
    (a, inv) => a + Number(inv.vat_amount || Math.round(Number(inv.subtotal || 0) * 0.075)),
    0
  );
  const periodExpenses = periodVouchers.reduce((a, v) => a + Number(v.amount || 0), 0);
  const netVatPayable = Math.max(0, outputVAT);

  // 3. Compute Annualized Corporate Income Tax (CIT) Provision
  const currentYear = selectedPeriod.slice(0, 4);
  const annualRevenue = invoices
    .filter((inv) => String(inv.created_at || "").startsWith(currentYear))
    .reduce((a, inv) => a + Number(inv.total_amount || 0), 0);
  const annualExpenses =
    vouchers
      .filter((v) => String(v.created_at || "").startsWith(currentYear))
      .reduce((a, v) => a + Number(v.amount || 0), 0) +
    totalMonthlyPayrollGross * 12;

  const assessableAnnualProfit = Math.max(0, annualRevenue - annualExpenses);
  const citRate = smallCompanyExemption || annualRevenue <= 25000000 ? 0 : annualRevenue <= 100000000 ? 0.2 : 0.3;
  const estimatedAnnualCIT = Math.round(assessableAnnualProfit * citRate);

  // Compute Statutory Filing Due Dates (10th of next month for PAYE, 21st of next month for VAT/WHT)
  const getNextMonthDueDate = (periodStr: string, dayNum: number) => {
    const [y, m] = periodStr.split("-").map(Number);
    if (!y || !m) return `${dayNum}th of following month`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return `${nextY}-${String(nextM).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
  };

  // Lock & Save Official Tax Compliance Record into Database
  const handleRecordComplianceSnapshot = async (taxCategory: "PAYE" | "VAT" | "CIT") => {
    if (execViewOnly) {
      alert("Executive Oversight Mode (View-Only): Recording tax filings requires Finance clearance.");
      return;
    }
    setSaving(true);
    setStatusNotice("");

    let recordPayload: Record<string, any> = {};

    if (taxCategory === "PAYE") {
      recordPayload = {
        tax_period: selectedPeriod,
        tax_type: "PAYE (Monthly Staff Income Tax)",
        authority: "Oyo State IRS (OYSIRS)",
        taxable_base: totalMonthlyPayrollGross,
        relief_or_input_credit: Math.round(totalAnnualCRA / 12),
        tax_payable: totalMonthlyPAYE,
        staff_or_tx_count: payeSchedule.length,
        due_date: getNextMonthDueDate(selectedPeriod, 10),
        filing_status: totalMonthlyPAYE === 0 ? "exempt" : "computed",
        breakdown_snapshot: payeSchedule,
        notes:
          totalMonthlyPAYE === 0
            ? "All active staff within statutory minimum wage / CRA exemption threshold."
            : `Monthly PAYE schedule for ${payeSchedule.length} staff members.`,
      };
    } else if (taxCategory === "VAT") {
      recordPayload = {
        tax_period: selectedPeriod,
        tax_type: "VAT (7.5% Monthly Value Added Tax)",
        authority: "FIRS / NRS (TaxPro Max)",
        taxable_base: periodNetRevenue,
        relief_or_input_credit: Number(whtCredits || 0),
        tax_payable: netVatPayable,
        staff_or_tx_count: periodInvoices.length,
        due_date: getNextMonthDueDate(selectedPeriod, 21),
        filing_status: "computed",
        breakdown_snapshot: periodInvoices.map((i) => ({
          invoice_no: i.invoice_no,
          client: i.client_name,
          subtotal: i.subtotal,
          vat: i.vat_amount,
        })),
        notes: `Monthly VAT return covering ${periodInvoices.length} invoice(s).`,
      };
    } else {
      recordPayload = {
        tax_period: `FY-${currentYear}`,
        tax_type: "CIT (Annual Company Income Tax Provision)",
        authority: "FIRS / NRS (Annual Corporate Filing)",
        taxable_base: assessableAnnualProfit,
        relief_or_input_credit: annualExpenses,
        tax_payable: estimatedAnnualCIT,
        staff_or_tx_count: invoices.length,
        due_date: `${Number(currentYear) + 1}-06-30`,
        filing_status: citRate === 0 ? "exempt" : "computed",
        breakdown_snapshot: [
          {
            annualRevenue,
            annualExpenses,
            assessableAnnualProfit,
            citRatePct: citRate * 100,
            smallCompanyExemption,
          },
        ],
        notes:
          citRate === 0
            ? "0% CIT Rate applied under Nigerian Small Company Exemption threshold (Annual filing still required)."
            : `Annual CIT provision at ${citRate * 100}% rate.`,
      };
    }

    const { error } = await supabase.from("tax_compliance_records").insert(recordPayload);
    setSaving(false);

    if (error) {
      setStatusNotice(`⚠️ Could not save record: ${error.message} (Run the tax_compliance_records SQL in Supabase)`);
    } else {
      setStatusNotice(`✅ Locked & archived ${taxCategory} compliance record for ${recordPayload.tax_period}!`);
      loadComplianceData();
    }
  };

  const handleUpdateRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remitModal) return;
    setSaving(true);
    await supabase
      .from("tax_compliance_records")
      .update({
        filing_status: remitStatus,
        remittance_ref: remitRef.trim(),
        notes: remitNotes.trim() || remitModal.notes,
      })
      .eq("id", remitModal.id);
    setSaving(false);
    setRemitModal(null);
    loadComplianceData();
  };

  // Export Official Audit CSV for OYSIRS / FIRS Inspection
  const exportComplianceCSV = () => {
    const headers = [
      "Staff ID",
      "Full Name",
      "Department",
      "Grade & Step",
      "Monthly Gross (NGN)",
      "Basic 85% (NGN)",
      "Trans/Housing 10% (NGN)",
      "Internet 5% (NGN)",
      "Annual Gross (NGN)",
      "Annual CRA Relief (NGN)",
      "Annual Taxable Income (NGN)",
      "Monthly PAYE Tax (NGN)",
      "Net Take-Home Pay (NGN)",
      "Compliance Status",
    ];
    const rows = payeSchedule.map((r) => [
      r.staff_id,
      `"${r.name}"`,
      `"${r.department}"`,
      `"${r.level}"`,
      r.gross,
      r.basic,
      r.transHousing,
      r.internet,
      r.annualGross,
      r.annualCRA,
      r.annualTaxableIncome,
      r.monthlyPAYE,
      r.netPay,
      `"${r.exemptionReason}"`,
    ]);

    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Lavie-Studios-Tax-Schedule-${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 mt-8">
      {/* HEADER & PERIOD SELECTOR */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Statutory Tax Computation & Audit Ledger (RC - 9210438)
          </span>
          <h2 className="font-display text-xl font-bold mt-0.5">
            Nigerian Tax Compliance & Remittance Register
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Monthly PAYE (OYSIRS — Due 10th) • Monthly VAT 7.5% (FIRS — Due 21st) • Annual CIT Provision (Small Company Exemption Ready)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[var(--bg-main)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Tax Period:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[#c7cb2d] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={exportComplianceCSV}
            className="px-4 py-2 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Audit CSV
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3.5 rounded-2xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 text-xs font-mono text-[#c7cb2d]">
          {statusNotice}
        </div>
      )}

      {/* 3 STATUTORY TAX PILLARS: MONTHLY PAYE, MONTHLY VAT & ANNUAL CIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PILLAR 1: MONTHLY PAYE (STATE IRS) */}
        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] text-[10px] font-mono font-bold uppercase">
                Monthly • Due 10th Next Month
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">OYSIRS (Oyo State)</span>
            </div>
            <h3 className="font-display text-base font-bold">Staff PAYE Income Tax</h3>
            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Monthly Payroll Gross:</span>
                <span>₦{totalMonthlyPayrollGross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Monthly CRA Reliefs:</span>
                <span className="text-[#c7cb2d]">-₦{Math.round(totalAnnualCRA / 12).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[var(--border-subtle)]/40 font-bold text-sm">
                <span>PAYE Remittable:</span>
                <span className="text-[#c7cb2d]">₦{totalMonthlyPAYE.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Staff earning ≤ ₦70,000/mo are automatically marked <strong>0% Exempt</strong> under statutory minimum wage rules.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleRecordComplianceSnapshot("PAYE")}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[#c7cb2d]/40 text-[#c7cb2d] text-xs font-bold uppercase transition cursor-pointer"
          >
            Lock & Log {selectedPeriod} PAYE Return
          </button>
        </div>

        {/* PILLAR 2: MONTHLY VAT 7.5% & WHT (FEDERAL FIRS / NRS) */}
        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] text-[10px] font-mono font-bold uppercase">
                Monthly • Due 21st Next Month
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">FIRS / NRS</span>
            </div>
            <h3 className="font-display text-base font-bold">Monthly VAT (7.5%) & WHT</h3>
            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Period Invoiced Base:</span>
                <span>₦{periodNetRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Output VAT (7.5%):</span>
                <span>₦{outputVAT.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[var(--text-muted)] text-[10px]">WHT Credit Notes (₦):</span>
                <input
                  type="number"
                  value={whtCredits || ""}
                  onChange={(e) => setWhtCredits(Number(e.target.value || 0))}
                  placeholder="0"
                  className="w-24 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded px-2 py-0.5 text-right text-xs"
                />
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[var(--border-subtle)]/40 font-bold text-sm">
                <span>Net VAT Remittable:</span>
                <span className="text-[#c7cb2d]">₦{netVatPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleRecordComplianceSnapshot("VAT")}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[#c7cb2d]/40 text-[#c7cb2d] text-xs font-bold uppercase transition cursor-pointer"
          >
            Lock & Log {selectedPeriod} VAT Return
          </button>
        </div>

        {/* PILLAR 3: ANNUAL COMPANY INCOME TAX (CIT) PROVISION */}
        <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                Annual Filing • FY-{currentYear}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">FIRS CIT</span>
            </div>
            <h3 className="font-display text-base font-bold">Company Income Tax (CIT)</h3>
            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">YTD Gross Turnover:</span>
                <span>₦{annualRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Allowable Deductible Costs:</span>
                <span>-₦{annualExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[var(--border-subtle)]/40 font-bold text-sm">
                <span>Est. Annual CIT ({citRate * 100}%):</span>
                <span className="text-[#c7cb2d]">₦{estimatedAnnualCIT.toLocaleString()}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={smallCompanyExemption}
                onChange={(e) => setSmallCompanyExemption(e.target.checked)}
                className="accent-[#c7cb2d]"
              />
              <span>Apply 0% Small Company Exemption (Turnover ≤ ₦25M–₦50M)</span>
            </label>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleRecordComplianceSnapshot("CIT")}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[#c7cb2d]/40 text-[#c7cb2d] text-xs font-bold uppercase transition cursor-pointer"
          >
            Log FY-{currentYear} Annual CIT Provision
          </button>
        </div>
      </div>

      {/* DETAILED STAFF PAYE COMPUTATION WORKSHEET */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold">
              Detailed Staff PAYE Computation Worksheet ({selectedPeriod})
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Computed using Nigerian Personal Income Tax Act (PITA) Consolidated Relief Allowance (CRA) & Graduated Tax Bands.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
              <th className="py-2.5 pr-3">Staff</th>
              <th className="py-2.5 px-2">Grade</th>
              <th className="py-2.5 px-2">Monthly Gross</th>
              <th className="py-2.5 px-2">85% / 10% / 5% Split</th>
              <th className="py-2.5 px-2">Annual CRA Relief</th>
              <th className="py-2.5 px-2">Taxable (Yr)</th>
              <th className="py-2.5 px-2">Monthly PAYE</th>
              <th className="py-2.5 px-2">Net Pay</th>
              <th className="py-2.5 pl-2">Statutory Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono">
            {payeSchedule.map((row) => (
              <tr key={row.staff_id} className="hover:bg-[var(--bg-main)]/40">
                <td className="py-2.5 pr-3 font-sans font-bold text-[var(--text-primary)] whitespace-nowrap">
                  {row.name} <span className="text-[10px] font-mono text-[#c7cb2d]">({row.staff_id})</span>
                </td>
                <td className="py-2.5 px-2 text-[11px]">{row.level}</td>
                <td className="py-2.5 px-2 font-bold">₦{row.gross.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                  B:₦{(row.basic / 1000).toFixed(1)}k | T:₦{(row.transHousing / 1000).toFixed(1)}k | I:₦{(row.internet / 1000).toFixed(1)}k
                </td>
                <td className="py-2.5 px-2 text-[var(--text-muted)]">₦{row.annualCRA.toLocaleString()}</td>
                <td className="py-2.5 px-2">₦{row.annualTaxableIncome.toLocaleString()}</td>
                <td className="py-2.5 px-2 font-bold text-[#c7cb2d]">₦{row.monthlyPAYE.toLocaleString()}</td>
                <td className="py-2.5 px-2 font-bold text-emerald-400">₦{row.netPay.toLocaleString()}</td>
                <td className="py-2.5 pl-2 font-sans text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono ${
                      row.isExempt ? "bg-emerald-500/15 text-emerald-400" : "bg-[#c7cb2d]/15 text-[#c7cb2d]"
                    }`}
                  >
                    {row.isExempt ? "0% Exempt (Min Wage / CRA)" : `${row.effectiveRatePct}% Eff. Rate`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HISTORICAL TAX COMPLIANCE & REMITTANCE AUDIT ARCHIVE */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
        <div>
          <h3 className="font-display text-base font-bold">
            Archived Tax Filings & Remittance Compliance Log ({taxRecords.length})
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Permanent audit trail of monthly PAYE, monthly VAT, and annual CIT filings with receipt/RRR numbers.
          </p>
        </div>

        {taxRecords.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--bg-main)] text-center text-xs text-[var(--text-muted)]">
            No archived tax returns yet. Click any of the "Lock & Log" buttons above to record a compliance snapshot.
          </div>
        ) : (
          <div className="space-y-2.5">
            {taxRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#c7cb2d] text-black font-mono text-[10px] font-bold">
                      {rec.tax_period}
                    </span>
                    <span className="font-display text-sm font-bold">{rec.tax_type}</span>
                    <span className="text-[10px] font-mono text-[var(--text-dim)]">• {rec.authority}</span>
                  </div>
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Taxable Base: ₦{Number(rec.taxable_base || 0).toLocaleString()} • Relief/Credit: ₦
                    {Number(rec.relief_or_input_credit || 0).toLocaleString()} •{" "}
                    <strong className="text-[#c7cb2d]">
                      Tax Payable: ₦{Number(rec.tax_payable || 0).toLocaleString()}
                    </strong>{" "}
                    • Due: {rec.due_date}
                  </p>
                  {rec.remittance_ref && (
                    <p className="text-[11px] font-mono text-emerald-400">
                      Receipt / RRR Reference: {rec.remittance_ref}
                    </p>
                  )}
                  {rec.notes && <p className="text-[11px] text-[var(--text-dim)]">{rec.notes}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold ${
                      rec.filing_status === "remitted" || rec.filing_status === "exempt"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {rec.filing_status}
                  </span>
                  {!execViewOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setRemitModal(rec);
                        setRemitRef(rec.remittance_ref || "");
                        setRemitStatus(rec.filing_status || "remitted");
                        setRemitNotes(rec.notes || "");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[11px] font-semibold cursor-pointer"
                    >
                      Log Receipt / RRR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: LOG REMITTANCE RECEIPT / RRR REFERENCE */}
      {remitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateRemittance}
            className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4"
          >
            <h3 className="font-display text-base font-bold">
              Update Compliance Filing ({remitModal.tax_period} — {remitModal.tax_type})
            </h3>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Filing Status
              </label>
              <select
                value={remitStatus}
                onChange={(e) => setRemitStatus(e.target.value)}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              >
                <option value="computed">Computed (Pending Filing)</option>
                <option value="filed">Filed on Portal (TaxPro Max / OYSIRS)</option>
                <option value="remitted">Remitted & Paid</option>
                <option value="exempt">Statutorily Exempt (0%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Remittance Receipt / FIRS RRR / OYSIRS Ref
              </label>
              <input
                value={remitRef}
                onChange={(e) => setRemitRef(e.target.value)}
                placeholder="e.g. RRR-2904-8831-9012"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Compliance / Auditor Notes
              </label>
              <textarea
                rows={2}
                value={remitNotes}
                onChange={(e) => setRemitNotes(e.target.value)}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemitModal(null)}
                className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
              >
                Save Compliance Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
