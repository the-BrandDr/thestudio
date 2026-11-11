"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, CreditCard, Lock } from "lucide-react";

export default function ClientInvoicePaystackPortal() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = String(params?.invoiceId || "");
  const encodedData = searchParams?.get("d") || "";

  const [invoice, setInvoice] = React.useState<any | null>(null);
  const [publicKey, setPublicKey] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [paymentOption, setPaymentOption] = React.useState<"deposit_70" | "full_100">("deposit_70");
  const [clientEmail, setClientEmail] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const [paymentSuccess, setPaymentSuccess] = React.useState<any | null>(null);

  const loadInvoice = React.useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError("");

    let foundInvoice: any = null;
    let resolvedKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

    // 1. Try server API route (/api/paystack/invoice) for Paystack Public Key + DB lookup
    try {
      const res = await fetch("/api/paystack/invoice?id=" + encodeURIComponent(invoiceId));
      const json = await res.json();
      if (json?.paystackPublicKey) resolvedKey = json.paystackPublicKey;
      if (res.ok && json?.data) {
        foundInvoice = json.data;
      }
    } catch (_) {}

    // 2. If server route was blocked by RLS, try browser Supabase client (uses active session if logged in)
    if (!foundInvoice) {
      try {
        const supabase = createClient();
        const { data: byId } = await supabase
          .from("client_invoices")
          .select("*")
          .eq("id", invoiceId)
          .maybeSingle();
        if (byId) {
          foundInvoice = byId;
        } else {
          const { data: byNo } = await supabase
            .from("client_invoices")
            .select("*")
            .eq("invoice_no", invoiceId)
            .maybeSingle();
          if (byNo) foundInvoice = byNo;
        }
      } catch (_) {}
    }

    // 3. Fallback to encoded `?d=` snapshot in URL so external clients never hit RLS errors
    if (!foundInvoice && encodedData) {
      try {
        const decoded = JSON.parse(
          decodeURIComponent(escape(window.atob(decodeURIComponent(encodedData))))
        );
        if (decoded && (decoded.id || decoded.invoice_no)) {
          foundInvoice = decoded;
        }
      } catch (_) {}
    }

    if (resolvedKey) setPublicKey(resolvedKey);

    if (!foundInvoice) {
      setError("Invoice not found");
    } else {
      setInvoice(foundInvoice);
      if (foundInvoice.client_email) setClientEmail(foundInvoice.client_email);
      const paidSoFar = Number(foundInvoice.amount_paid || 0);
      setPaymentOption(paidSoFar > 0 ? "full_100" : "deposit_70");
    }
    setLoading(false);
  }, [invoiceId, encodedData]);

  React.useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.getElementById("paystack-inline-js")) {
      const script = document.createElement("script");
      script.id = "paystack-inline-js";
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d0e] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#c7cb2d] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-400">Loading Official Lavie Studios Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#0c0d0e] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-3xl bg-[#141618] border border-white/10 text-center space-y-3">
          <p className="text-sm font-bold text-red-400">{error || "Invoice not found"}</p>
          <p className="text-xs text-zinc-400">
            Please open this payment link from the updated Payment Link button on the Finance or Inquiries page.
          </p>
        </div>
      </div>
    );
  }

  const totalAmount = Number(invoice.total_amount || 0);
  const subtotalAmount = Number(invoice.subtotal || totalAmount);
  const vatAmount = Number(invoice.vat_amount || 0);
  const amountPaid = Number(
    invoice.amount_paid || (invoice.status === "paid" ? totalAmount : 0)
  );
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  const seventyPercentAmount = Math.round(totalAmount * 0.7);
  const canChooseSeventyPercent = amountPaid === 0 && balanceDue > 0;

  const selectedAmountNaira =
    canChooseSeventyPercent && paymentOption === "deposit_70"
      ? seventyPercentAmount
      : balanceDue;

  const remainingAfterThisPayment = Math.max(0, balanceDue - selectedAmountNaira);

  const handlePayWithPaystack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (balanceDue <= 0) return;

    const emailToUse = (clientEmail || invoice.client_email || "finance@studioslavie.com").trim();
    if (!publicKey) {
      alert(
        "Paystack Public Key (PAYSTACK_PUBLIC_KEY or NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) is not configured in .env.local yet."
      );
      return;
    }

    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      alert("Paystack checkout library is still loading. Please try again in 2 seconds.");
      return;
    }

    setProcessing(true);
    const ref = "LV-" + (invoice.invoice_no?.replace(/[^A-Z0-9]/gi, "") || "INV") + "-" + Date.now();

    const handler = PaystackPop.setup({
      key: publicKey,
      email: emailToUse,
      amount: Math.round(selectedAmountNaira * 100),
      currency: "NGN",
      ref,
      metadata: {
        custom_fields: [
          {
            display_name: "Invoice Number",
            variable_name: "invoice_no",
            value: invoice.invoice_no,
          },
          {
            display_name: "Client",
            variable_name: "client_name",
            value: invoice.client_company || invoice.client_name,
          },
          {
            display_name: "Payment Tier",
            variable_name: "payment_option",
            value:
              canChooseSeventyPercent && paymentOption === "deposit_70"
                ? "70% Part Payment"
                : "Full Settlement",
          },
        ],
      },
      callback: function (response: any) {
        (async () => {
          try {
            const verifyRes = await fetch("/api/paystack/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId: invoice.id,
                invoiceSnapshot: invoice,
                reference: response.reference || ref,
                amountNaira: selectedAmountNaira,
                paymentOption:
                  canChooseSeventyPercent && paymentOption === "deposit_70"
                    ? "deposit_70"
                    : amountPaid > 0
                    ? "balance"
                    : "full_100",
              }),
            });
            const verifyJson = await verifyRes.json();
            const newPaidTotal = amountPaid + selectedAmountNaira;
            const newBal = Math.max(0, totalAmount - newPaidTotal);

            // Also update via browser client if user has session
            try {
              const sb = createClient();
              await sb
                .from("client_invoices")
                .update({
                  amount_paid: newPaidTotal,
                  status: newBal <= 0 ? "paid" : "partially_paid",
                })
                .eq("id", invoice.id);
            } catch (_) {}

            setInvoice({
              ...invoice,
              amount_paid: newPaidTotal,
              status: newBal <= 0 ? "paid" : "partially_paid",
            });
            setPaymentSuccess({
              reference: response.reference || ref,
              amountPaidNow: selectedAmountNaira,
              balanceRemaining: verifyJson?.balanceRemaining ?? newBal,
              receiptNo: verifyJson?.receipt?.receipt_no || ("LS/RCT/" + new Date().getFullYear()),
            });
          } finally {
            setProcessing(false);
          }
        })();
      },
      onClose: function () {
        setProcessing(false);
      },
    });

    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full rounded-3xl bg-[#141619] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-[#191c20] border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-light.svg" alt="Lavie Studios" className="h-7 w-auto" />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d]">
                Official Client Payment Portal
              </p>
              <h1 className="font-display text-base font-bold text-white">
                {invoice.client_company || invoice.client_name}
              </h1>
            </div>
          </div>
          <span
            className={
              "px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase " +
              (balanceDue <= 0
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : amountPaid > 0
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-[#c7cb2d]/20 text-[#c7cb2d] border border-[#c7cb2d]/30")
            }
          >
            {balanceDue <= 0 ? "PAID IN FULL" : amountPaid > 0 ? "PARTIALLY PAID" : "UNPAID"}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-[#0e1012] border border-white/5 space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-white/5 text-[#c7cb2d] font-mono text-[10px] font-bold">
                  {invoice.invoice_no}
                </span>
                <h2 className="text-sm font-bold text-white mt-1.5">{invoice.project_title}</h2>
                {invoice.service_category && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">{invoice.service_category}</p>
                )}
              </div>
              <div className="text-right font-mono shrink-0">
                <p className="text-[10px] uppercase text-zinc-400">Invoice Total</p>
                <p className="text-lg font-bold text-[#c7cb2d]">
                  ₦{totalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#141619]">
                <p className="text-[9px] text-zinc-400 uppercase">Subtotal</p>
                <p className="font-bold text-white mt-0.5">₦{subtotalAmount.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141619]">
                <p className="text-[9px] text-zinc-400 uppercase">VAT (7.5%)</p>
                <p className="font-bold text-white mt-0.5">₦{vatAmount.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141619]">
                <p className="text-[9px] text-zinc-400 uppercase">Amount Paid</p>
                <p className="font-bold text-emerald-400 mt-0.5">₦{amountPaid.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141619] border border-[#c7cb2d]/30">
                <p className="text-[9px] text-[#c7cb2d] uppercase">Balance Due</p>
                <p className="font-bold text-[#c7cb2d] mt-0.5">₦{balanceDue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {paymentSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Payment Confirmed & Official Receipt Generated!</span>
              </div>
              <p className="text-xs text-zinc-200 font-mono">
                Paid Now: <strong>₦{Number(paymentSuccess.amountPaidNow).toLocaleString()}</strong> • 
                Receipt: <strong>{paymentSuccess.receiptNo}</strong> • Remaining Balance: 
                <strong>₦{Number(paymentSuccess.balanceRemaining).toLocaleString()}</strong>
              </p>
            </div>
          )}

          {balanceDue > 0 ? (
            <form onSubmit={handlePayWithPaystack} className="space-y-4">
              {canChooseSeventyPercent ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Select Payment Option
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("deposit_70")}
                      className={
                        "p-3.5 rounded-2xl border text-left transition cursor-pointer " +
                        (paymentOption === "deposit_70"
                          ? "bg-[#c7cb2d]/15 border-[#c7cb2d] text-white"
                          : "bg-[#0e1012] border-white/10 text-zinc-300 hover:border-white/25")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Pay 70% Advance</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#c7cb2d] text-black font-mono text-[9px] font-bold">
                          70% Deposit
                        </span>
                      </div>
                      <p className="font-mono text-base font-bold text-[#c7cb2d] mt-1.5">
                        ₦{seventyPercentAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                        30% Balance Later: ₦{(totalAmount - seventyPercentAmount).toLocaleString()}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption("full_100")}
                      className={
                        "p-3.5 rounded-2xl border text-left transition cursor-pointer " +
                        (paymentOption === "full_100"
                          ? "bg-[#c7cb2d]/15 border-[#c7cb2d] text-white"
                          : "bg-[#0e1012] border-white/10 text-zinc-300 hover:border-white/25")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Pay in Full (100%)</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                          Full Settlement
                        </span>
                      </div>
                      <p className="font-mono text-base font-bold text-emerald-400 mt-1.5">
                        ₦{totalAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                        Balance after payment: ₦0
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#0e1012] border border-[#c7cb2d]/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Remaining Balance Settlement</p>
                    <p className="text-[11px] text-zinc-400">
                      Previous payments of ₦{amountPaid.toLocaleString()} have been credited.
                    </p>
                  </div>
                  <p className="font-mono text-lg font-bold text-[#c7cb2d]">
                    ₦{balanceDue.toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Client Email for Official Receipt *
                </label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full bg-[#0e1012] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3.5 rounded-full bg-[#c7cb2d] text-black font-bold text-xs font-mono uppercase tracking-wider hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {processing
                    ? "Connecting to Paystack..."
                    : "Pay ₦" + selectedAmountNaira.toLocaleString() + " via Paystack"}
                </span>
              </button>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#c7cb2d]" /> Secured by Paystack (Card / Transfer / USSD)
                </span>
                <span>
                  Balance After Payment: ₦{remainingAfterThisPayment.toLocaleString()}
                </span>
              </div>
            </form>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white">This Invoice is Fully Paid</p>
              <p className="text-xs text-zinc-400 font-mono">
                Total Paid: ₦{amountPaid.toLocaleString()} • Balance Due: ₦0
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}