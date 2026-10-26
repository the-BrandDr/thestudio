"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Receipt, Printer, Mail, Eye, X, CheckCircle2 } from "lucide-react";

function computeMonthlyPaye(gross: number) {
  if (gross <= 0) return { paye: 0, net: 0 };
  let rem = gross * 12;
  let annualTax = 0;
  const b1 = Math.min(rem, 800000); rem -= b1;
  if (rem > 0) { const b2 = Math.min(rem, 2200000); annualTax += b2 * 0.15; rem -= b2; }
  if (rem > 0) { const b3 = Math.min(rem, 9000000); annualTax += b3 * 0.18; rem -= b3; }
  if (rem > 0) { const b4 = Math.min(rem, 13000000); annualTax += b4 * 0.21; rem -= b4; }
  if (rem > 0) { const b5 = Math.min(rem, 25000000); annualTax += b5 * 0.23; rem -= b5; }
  if (rem > 0) { annualTax += rem * 0.25; }
  const paye = Math.round(annualTax / 12);
  return { paye, net: Math.max(0, gross - paye) };
}

export default function StaffPayslipsPanel({ profile }: { profile: any }) {
  const supabase = createClient();
  const [payslips, setPayslips] = React.useState<any[]>([]);
  const [selectedSlip, setSelectedSlip] = React.useState<any | null>(null);

  React.useEffect(() => {
    async function fetchSlips() {
      if (!profile) return;
      const { data } = await supabase
        .from("payroll_runs")
        .select("*")
        .or(`staff_id.eq.${profile.id},staff_code.eq.${profile.staff_id}`)
        .order("pay_period", { ascending: false });
      if (data) setPayslips(data);
    }
    fetchSlips();
  }, [profile, supabase]);

  const baseGross = Number(profile?.salary_amount || 0);
  const { paye: estPaye, net: estNet } = computeMonthlyPaye(baseGross);

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Personal Gross / Tax / Net Remuneration Summary */}
      <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-subtle)]/60 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-[#c7cb2d]" /> Remuneration & Salary Breakdown
          </h2>
          <span className="text-[10px] font-mono text-[var(--text-dim)]">Monthly Structure</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[var(--bg-main)]">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Gross Monthly Salary</span>
            <p className="text-lg font-display font-bold text-[var(--text-primary)] mt-0.5">
              ₦{baseGross.toLocaleString()}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-main)]">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Monthly PAYE Tax</span>
            <p className="text-lg font-display font-bold text-amber-400 mt-0.5">
              {estPaye === 0 ? "₦0 (Tax-Exempt)" : `-₦${estPaye.toLocaleString()}`}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-main)]">
            <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">Net Take-Home Pay</span>
            <p className="text-lg font-display font-bold text-[#c7cb2d] mt-0.5">
              ₦{estNet.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Payslips Archive */}
      <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-subtle)]/60 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            My Monthly Payslips ({payslips.length})
          </h2>
          <span className="text-[10px] font-mono text-[var(--text-dim)]">Click any month to view & print</span>
        </div>

        {payslips.length > 0 ? (
          <div className="space-y-2">
            {payslips.map((slip) => {
              const gross = Number(slip.basic_salary || 0) + Number(slip.bonuses || 0);
              return (
                <div
                  key={slip.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-main)] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#c7cb2d]/15 text-[#c7cb2d] text-xs font-mono font-bold">
                      {slip.pay_period}
                    </span>
                    <div>
                      <p className="text-xs font-bold">
                        Net Pay: <span className="text-[#c7cb2d] font-mono">₦{Number(slip.net_pay).toLocaleString()}</span>
                      </p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">
                        Gross: ₦{gross.toLocaleString()} • PAYE Tax: -₦{Number(slip.paye_tax || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                        slip.status === "disbursed"
                          ? "bg-[#c7cb2d]/15 text-[#c7cb2d]"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {slip.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSlip(slip)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-main)] text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Payslip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] py-6 text-center">
            No processed payslips available for your account yet.
          </p>
        )}
      </div>

      {/* Official Printable Payslip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                  Lavie Studios Ltd • Official Remuneration Advice
                </span>
                <h3 className="font-display text-lg font-bold">Payslip — {selectedSlip.pay_period}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[var(--bg-main)] text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">Employee</span>
                <strong className="text-[var(--text-primary)]">{selectedSlip.staff_name}</strong>
                <span className="text-[10px] font-mono text-[#c7cb2d] block">{selectedSlip.staff_code} • {selectedSlip.hierarchy_level}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">Disbursement Bank</span>
                <strong className="text-[var(--text-primary)]">{selectedSlip.bank_account_name}</strong>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">{selectedSlip.bank_name} • {selectedSlip.bank_account_no}</span>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-main)] text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Basic Monthly Salary:</span>
                <span>₦{Number(selectedSlip.basic_salary || 0).toLocaleString()}</span>
              </div>
              {Number(selectedSlip.bonuses) > 0 && (
                <div className="flex justify-between text-[#c7cb2d]">
                  <span>Allowances / Bonuses:</span>
                  <span>+₦{Number(selectedSlip.bonuses).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-[var(--border-subtle)]/50">
                <span>Gross Earnings:</span>
                <span>₦{(Number(selectedSlip.basic_salary || 0) + Number(selectedSlip.bonuses || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Less PAYE Income Tax:</span>
                <span>-₦{Number(selectedSlip.paye_tax || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#c7cb2d] pt-2 border-t border-[var(--border-subtle)]">
                <span>Net Take-Home Pay:</span>
                <span>₦{Number(selectedSlip.net_pay || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono uppercase text-[#c7cb2d] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Status: {selectedSlip.status}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
