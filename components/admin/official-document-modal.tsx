"use client";

import * as React from "react";
import { Printer, ArrowLeft, X } from "lucide-react";

interface OfficialDocProps {
  type: "invoice" | "receipt" | "payslip" | "quote";
  data: any;
  onClose: () => void;
}

// Strip internal Staff IDs like "(LS-01)" so external clients never see staff codes
function stripStaffId(raw?: string | null): string {
  if (!raw) return "Authorized Signatory";
  return raw.replace(/\s*\(\s*LS-[^)]+\)/gi, "").replace(/\bLS-\d+\b/gi, "").trim() || "Authorized Signatory";
}

export default function OfficialDocumentModal({ type, data, onClose }: OfficialDocProps) {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!data) return null;

  const formatDate = (d?: string) => {
    const dt = d ? new Date(d) : new Date();
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const docNo =
    type === "invoice"
      ? data.invoice_no || "LS/INV/2026/01"
      : type === "receipt"
      ? data.receipt_no || "LS/RCT/2026/01"
      : type === "quote"
      ? data.quote_no || "LS/QT/2026/01"
      : `PAY/${data.pay_period || "2026"}/${data.staff_code || "01"}`;

  const docDate = formatDate(data.issue_date || data.created_at);

  const combinedText = `${data.project_title || ""} ${data.service_category || ""} ${
    Array.isArray(data.line_items) ? data.line_items.map((i: any) => `${i.service || ""} ${i.description || ""}`).join(" ") : ""
  }`.toLowerCase();

  const isEventProject =
    combinedText.includes("event") ||
    combinedText.includes("stage") ||
    combinedText.includes("scenography") ||
    combinedText.includes("walkway") ||
    combinedText.includes("rigging") ||
    combinedText.includes("hall") ||
    combinedText.includes("summit") ||
    combinedText.includes("gala") ||
    combinedText.includes("conference");

  const totalAmount = Number(data.total_amount || 0);
  const subtotalAmount = Number(data.subtotal || totalAmount);
  const discountAmount = Number(data.discount_amount || 0);
  const vatAmount = Number(data.vat_amount || 0);
  const paidOnInvoice = Number(data.amount_paid || 0);
  const balanceOnInvoice = Math.max(0, totalAmount - paidOnInvoice);

  const upfront70 = Math.round(totalAmount * 0.7);
  const balance30 = Math.max(0, totalAmount - upfront70);

  const docBadgeTitle =
    type === "invoice"
      ? "COMMERCIAL INVOICE"
      : type === "receipt"
      ? "OFFICIAL PAYMENT RECEIPT"
      : type === "quote"
      ? "PROJECT QUOTATION"
      : "REMUNERATION PAYSLIP";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #lavie-a4-sheet, #lavie-a4-sheet * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #lavie-a4-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
        }
      `}} />

      {/* Top Action Bar */}
      <div className="w-full bg-zinc-950 border-b border-zinc-800 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#c7cb2d]" /> Back / Close Document
        </button>

        <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-widest text-zinc-400">
          {docBadgeTitle} • {docNo}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable A4 Sheet Container */}
      <div
        onClick={onClose}
        className="flex-1 overflow-y-auto py-6 px-3 sm:px-6 flex justify-center items-start print:p-0 print:overflow-visible"
      >
        <div
          id="lavie-a4-sheet"
          onClick={(e) => e.stopPropagation()}
          className="bg-white text-[#18181b] shadow-2xl w-full max-w-[794px] min-h-[1122px] flex flex-col justify-between box-border overflow-hidden font-sans"
        >
          <div>
            {/* STRICTLY BOUND BLACK HEADER BANNER (Zero Overlap via <tspan>) */}
            <div className="w-full bg-black">
              <svg
                viewBox="0 0 595.28 138.31"
                className="w-full h-auto block"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="595.28" height="138.31" fill="#000000" />
                <text
                  x="56"
                  y="66"
                  fill="#ffffff"
                  fontFamily="Inter, Arial, Helvetica, sans-serif"
                >
                  <tspan fontSize="17.5" fontWeight="800" letterSpacing="0.2">
                    LAVIE STUDIOS LTD
                  </tspan>
                  <tspan dx="8" fontSize="10.5" fontWeight="400" letterSpacing="0.8" fill="#e4e4e7">
                    (RC - 9210438)
                  </tspan>
                </text>
                <text
                  x="56"
                  y="84"
                  fill="#e4e4e7"
                  fontFamily="Inter, Arial, Helvetica, sans-serif"
                  fontSize="9"
                  fontWeight="400"
                  letterSpacing="0.15"
                >
                  Along Old Ogbomoso-Ilorin Road, Yoaco Area,
                </text>
                <text
                  x="56"
                  y="96"
                  fill="#e4e4e7"
                  fontFamily="Inter, Arial, Helvetica, sans-serif"
                  fontSize="9"
                  fontWeight="400"
                  letterSpacing="0.15"
                >
                  Ogbomoso, Oyo State, Nigeria
                </text>
                <text
                  x="56"
                  y="114"
                  fill="#ffffff"
                  fontFamily="Inter, Arial, Helvetica, sans-serif"
                  fontSize="8.8"
                >
                  <tspan fontWeight="700" letterSpacing="0.4">DIRECTORS:</tspan>
                  <tspan dx="6" fontWeight="400" letterSpacing="0.35" fill="#e4e4e7">
                    S. I. AYEGBOYIN, O. T. ADEGBOYE, B. O. ADEGBOYEGA
                  </tspan>
                </text>

                {/* Exact 4-Polygon Geometric Emblem */}
                <g transform="translate(450, 46)">
                  <polygon
                    points="49.73,34.65 43.84,42.12 41.32,45.32 33.19,55.64 30.67,58.84 25.34,65.60 24.38,65.60 19.06,58.84 16.54,55.64 8.41,45.32 5.89,42.12 0.00,34.65"
                    fill="#c7cc2e"
                  />
                  <polygon
                    points="80.90,30.67 32.93,30.67 38.26,23.91 40.78,20.70 48.91,10.39 51.43,7.18 56.92,0.22 62.40,7.18 64.93,10.39 73.05,20.70 75.58,23.91"
                    fill="#deb58c"
                  />
                  <polygon
                    points="24.15,30.67 0.00,30.67 0.00,0.00 5.66,7.18 8.18,10.39 16.31,20.70 18.83,23.91"
                    fill="#f5a10a"
                  />
                  <polygon
                    points="54.52,34.64 80.90,34.64 80.90,42.12 63.20,42.12 63.20,45.32 80.90,45.32 80.90,55.64 63.20,55.64 63.20,58.84 80.90,58.84 80.90,65.60 30.46,65.60 35.78,58.84 38.31,55.64 46.44,45.32 48.96,42.12"
                    fill="#e65230"
                  />
                </g>
              </svg>
            </div>

            {/* PREMIUM ARCHITECTURAL DOCUMENT BODY */}
            <div className="px-11 pt-8 pb-6 space-y-6">
              {/* Top Bar: Document Type Tag + Reference Metadata */}
              <div className="flex items-start justify-between border-b border-zinc-200 pb-5">
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-1 bg-zinc-900 text-[#c7cc2e] text-[10px] font-bold tracking-[0.2em] uppercase">
                    {docBadgeTitle}
                  </span>
                  {type !== "payslip" ? (
                    <div className="pt-1">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        Client / Organization
                      </p>
                      <h2 className="text-[16px] font-extrabold text-zinc-900 uppercase tracking-tight">
                        {data.client_company || data.client_name}
                      </h2>
                      <p className="text-[12px] font-medium text-zinc-600">
                        Attention: <strong className="text-zinc-900">{data.through_person || data.client_name}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        Personnel Record
                      </p>
                      <h2 className="text-[16px] font-extrabold text-zinc-900 uppercase tracking-tight">
                        {data.staff_name}
                      </h2>
                      <p className="text-[12px] font-medium text-zinc-600">
                        {data.department || "Studio Operations"} • Grade {data.hierarchy_level || "Staff"} ({data.staff_code})
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Reference Numbers & Highlighted Amount Box */}
                <div className="text-right space-y-2">
                  <div className="inline-grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[11.5px] text-left bg-zinc-50 border border-zinc-200 px-3.5 py-2">
                    <span className="text-zinc-500 font-medium">
                      {type === "invoice" ? "Invoice No:" : type === "receipt" ? "Receipt No:" : type === "quote" ? "Quote No:" : "Payslip Ref:"}
                    </span>
                    <span className="font-bold text-zinc-900 font-mono">{docNo}</span>
                    <span className="text-zinc-500 font-medium">
                      {type === "payslip" ? "Pay Period:" : "Issue Date:"}
                    </span>
                    <span className="font-semibold text-zinc-800 font-mono">
                      {type === "payslip" ? data.pay_period : docDate}
                    </span>
                  </div>

                  <div>
                    <div className="inline-block bg-[#b8c810] text-black px-4 py-2 font-extrabold text-[12.5px] tracking-wider uppercase">
                      {(type === "invoice" || type === "quote") && `TOTAL DUE: ₦${totalAmount.toLocaleString()}`}
                      {type === "receipt" && `RECEIVED: ₦${Number(data.amount_received || 0).toLocaleString()}`}
                      {type === "payslip" && `NET PAY: ₦${Number(data.net_pay || 0).toLocaleString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Subject Strip (For Invoice, Quote, Receipt) */}
              {type !== "payslip" && (
                <div className="bg-zinc-900 text-white px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#c7cc2e] block">
                      Project / Commission Title
                    </span>
                    <p className="text-[13px] font-bold uppercase tracking-wide">
                      {data.project_title}
                    </p>
                  </div>
                  {data.reference_code && (
                    <span className="text-[11px] font-mono text-zinc-300">
                      Ref: {data.reference_code}
                    </span>
                  )}
                </div>
              )}

              {/* 1. INVOICE & QUOTE TABLE */}
              {(type === "invoice" || type === "quote") && (
                <div className="space-y-5">
                  <table className="w-full border-collapse text-[11.5px]">
                    <thead>
                      <tr className="border-y-[1.5px] border-[#b8c810] bg-zinc-50 text-zinc-800 font-bold uppercase tracking-wider text-[10.5px]">
                        <th className="py-2.5 px-3 text-left w-[20%]">Service</th>
                        <th className="py-2.5 px-3 text-left w-[40%]">Deliverable & Scope</th>
                        <th className="py-2.5 px-2 text-right w-[15%]">Unit Cost</th>
                        <th className="py-2.5 px-2 text-center w-[10%]">Qty</th>
                        <th className="py-2.5 px-3 text-right w-[15%]">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 border-b-[1.5px] border-[#b8c810]">
                      {(data.line_items || []).map((item: any, idx: number) => {
                        const rowTotal = Number(item.qty || 1) * Number(item.unitPrice || 0);
                        return (
                          <tr key={idx}>
                            <td className="py-4 px-3 font-extrabold text-[#84871d] uppercase align-top border-r border-zinc-200">
                              {item.service || data.project_title?.split(" ")[0] || "SERVICE"}
                            </td>
                            <td className="py-4 px-3 text-zinc-700 align-top border-r border-zinc-200 leading-relaxed">
                              {item.description}
                            </td>
                            <td className="py-4 px-2 text-right font-mono text-zinc-700 align-top border-r border-zinc-200">
                              ₦{Number(item.unitPrice || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-2 text-center font-mono text-zinc-700 align-top border-r border-zinc-200">
                              x{item.qty}
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-bold text-zinc-900 align-top">
                              ₦{rowTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Financial Summary & Payment Schedule */}
                  <div className="grid grid-cols-12 gap-6 items-start pt-1">
                    <div className="col-span-7 bg-zinc-50 border border-zinc-200 p-4 space-y-1.5 text-[11px]">
                      <p className="font-bold uppercase tracking-wider text-[10px] text-zinc-900">
                        Payment Milestone Breakdown
                      </p>
                      <div className="flex justify-between text-zinc-700">
                        <span>70% Upfront Mobilization Deposit:</span>
                        <strong className="font-mono text-zinc-900">₦{upfront70.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-700">
                        <span>30% Completion Settlement:</span>
                        <strong className="font-mono text-zinc-900">₦{balance30.toLocaleString()}</strong>
                      </div>
                      {paidOnInvoice > 0 && (
                        <div className="flex justify-between text-zinc-900 pt-1 border-t border-zinc-200 font-semibold">
                          <span>Paid to Date: ₦{paidOnInvoice.toLocaleString()}</span>
                          <span>Balance Due: ₦{balanceOnInvoice.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="col-span-5 space-y-1.5 text-[11.5px]">
                      <div className="flex justify-between px-2 text-zinc-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">₦{subtotalAmount.toLocaleString()}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between px-2 text-zinc-600">
                          <span>Discount ({data.discount_percent}%):</span>
                          <span className="font-mono">-₦{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {vatAmount > 0 && (
                        <div className="flex justify-between px-2 text-zinc-600">
                          <span>VAT ({data.vat_rate}%):</span>
                          <span className="font-mono">+₦{vatAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-zinc-900 text-white px-3 py-2 font-bold text-[13.5px]">
                        <span>TOTAL DUE:</span>
                        <span className="font-mono text-[#c7cc2e]">₦{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Two Signature Lime-Bordered Boxes */}
                  <div className="grid grid-cols-2 gap-5 pt-2">
                    <div className="border-[1.5px] border-[#b8c810] p-4 text-[11px] text-zinc-700 space-y-1 leading-relaxed">
                      <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-900 mb-1">
                        Corporate Remittance Account
                      </p>
                      <p><strong>Payment Method:</strong> Bank Transfer</p>
                      <p><strong>Account Name:</strong> Lavie Studios</p>
                      <p><strong>Account Number:</strong> 1028396685</p>
                      <p><strong>Bank:</strong> United Bank for Africa (UBA)</p>
                    </div>

                    <div className="border-[1.5px] border-[#b8c810] p-4 text-[11px] text-zinc-700 flex flex-col justify-between leading-relaxed">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-900 mb-1">
                           Engagement & Payment Terms
                        </p>
                        {isEventProject ? (
                          <p>
                            A <strong>70% upfront payment</strong> is required before commencement of the project, and the <strong>30% balance</strong> is due upon approval of concepts before event day execution.
                          </p>
                        ) : (
                          <p>
                            A <strong>70% upfront payment</strong> is required before commencement of the project, and the <strong>30% balance</strong> is due upon final completion before assets handoff.
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-200 mt-2">
                        Issued By: <strong className="text-zinc-800">{stripStaffId(data.created_by || data.prepared_by || "Lavie Studios Billing Desk")}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. OFFICIAL PAYMENT RECEIPT BODY */}
              {type === "receipt" && (
                <div className="space-y-5">
                  <table className="w-full border-collapse text-[11.5px]">
                    <thead>
                      <tr className="border-y-[1.5px] border-[#b8c810] bg-zinc-50 text-zinc-800 font-bold uppercase tracking-wider text-[10.5px]">
                        <th className="py-2.5 px-3 text-left w-[20%]">Reference</th>
                        <th className="py-2.5 px-3 text-left w-[35%]">Payment Particulars</th>
                        <th className="py-2.5 px-2 text-right w-[15%]">Contract Sum</th>
                        <th className="py-2.5 px-2 text-right w-[15%]">Paid Now</th>
                        <th className="py-2.5 px-3 text-right w-[15%]">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="border-b-[1.5px] border-[#b8c810]">
                      <tr>
                        <td className="py-5 px-3 font-extrabold text-[#84871d] uppercase align-top border-r border-zinc-200 font-mono">
                          {data.reference_code || data.receipt_no}
                        </td>
                        <td className="py-5 px-3 text-zinc-700 align-top border-r border-zinc-200 leading-relaxed">
                          Payment received in respect of <strong>{data.project_title}</strong> via{" "}
                          <strong>{data.payment_method || "Bank Transfer"}</strong>.
                          {Number(data.previous_paid) > 0 && (
                            <span className="block text-[10.5px] text-zinc-500 mt-1">
                              Previously Acknowledged: ₦{Number(data.previous_paid).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-2 text-right font-mono text-zinc-700 align-top border-r border-zinc-200">
                          ₦{Number(data.total_contract_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-5 px-2 text-right font-mono font-bold text-zinc-900 align-top border-r border-zinc-200">
                          ₦{Number(data.amount_received || 0).toLocaleString()}
                        </td>
                        <td className="py-5 px-3 text-right font-mono font-bold text-zinc-900 align-top">
                          ₦{Number(data.balance_remaining || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div className="w-72 space-y-1.5 text-[11.5px]">
                      <div className="flex justify-between px-2 text-zinc-600">
                        <span>Total Contract Value:</span>
                        <span className="font-mono">₦{Number(data.total_contract_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900 text-white px-3 py-2 font-bold text-[13px]">
                        <span>AMOUNT RECEIVED:</span>
                        <span className="font-mono text-[#c7cc2e]">₦{Number(data.amount_received || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-2 font-bold text-zinc-900 pt-0.5">
                        <span>REMAINING BALANCE:</span>
                        <span className="font-mono">₦{Number(data.balance_remaining || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 pt-2">
                    <div className="border-[1.5px] border-[#b8c810] p-4 text-[11px] text-zinc-700 space-y-1 leading-relaxed">
                      <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-900 mb-1">
                        Receipt Verification
                      </p>
                      <p><strong>Payment Channel:</strong> {data.payment_method || "Bank Transfer"}</p>
                      <p>
                        <strong>Settlement Status:</strong>{" "}
                        {Number(data.balance_remaining || 0) <= 0 ? "Paid in Full (100%)" : "Part-Payment Acknowledged"}
                      </p>
                      <p><strong>Acknowledged By:</strong> {stripStaffId(data.issued_by || "Lavie Studios Finance")}</p>
                    </div>

                    <div className="border-[1.5px] border-[#b8c810] p-4 text-[11px] text-zinc-700 flex items-center leading-relaxed">
                      {Number(data.balance_remaining || 0) > 0 ? (
                        <p>
                          <strong>Outstanding Balance Terms:</strong> The remaining balance of{" "}
                          <strong>₦{Number(data.balance_remaining).toLocaleString()}</strong> is payable{" "}
                          {isEventProject
                            ? "upon approval of concepts before event day execution."
                            : "upon final completion before assets handoff."}
                        </p>
                      ) : (
                        <p>
                          <strong>Full Settlement Confirmation:</strong> Thank you. All financial obligations for this commission have been fully settled.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. STAFF PAYSLIP BODY */}
              {type === "payslip" && (
                <div className="space-y-5">
                  <table className="w-full border-collapse text-[11.5px]">
                    <thead>
                      <tr className="border-y-[1.5px] border-[#b8c810] bg-zinc-50 text-zinc-800 font-bold uppercase tracking-wider text-[10.5px]">
                        <th className="py-2.5 px-3 text-left w-[25%]">Component</th>
                        <th className="py-2.5 px-3 text-left w-[41%]">Particulars</th>
                        <th className="py-2.5 px-3 text-right w-[17%]">Earnings</th>
                        <th className="py-2.5 px-3 text-right w-[17%]">Deductions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 border-b-[1.5px] border-[#b8c810]">
                      <tr>
                        <td className="py-4 px-3 font-extrabold text-[#84871d] uppercase border-r border-zinc-200">
                          Basic Salary
                        </td>
                        <td className="py-4 px-3 text-zinc-700 border-r border-zinc-200">
                          Monthly Base Compensation ({data.pay_period})
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-bold text-zinc-900 border-r border-zinc-200">
                          ₦{Number(data.basic_salary || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-3 text-right text-zinc-400">—</td>
                      </tr>
                      {Number(data.bonuses) > 0 && (
                        <tr>
                          <td className="py-4 px-3 font-extrabold text-[#84871d] uppercase border-r border-zinc-200">
                            Performance Bonus
                          </td>
                          <td className="py-4 px-3 text-zinc-700 border-r border-zinc-200">
                            Project & Operational Allowance
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-zinc-900 border-r border-zinc-200">
                            ₦{Number(data.bonuses).toLocaleString()}
                          </td>
                          <td className="py-4 px-3 text-right text-zinc-400">—</td>
                        </tr>
                      )}
                      {Number(data.tax_relief_applied) > 0 && (
                        <tr>
                          <td className="py-4 px-3 font-extrabold text-[#84871d] uppercase border-r border-zinc-200">
                            Tax Relief
                          </td>
                          <td className="py-4 px-3 text-zinc-700 border-r border-zinc-200">
                            Approved Monthly Statutory Tax Relief Allowance
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-zinc-700 border-r border-zinc-200">
                            ₦{Number(data.tax_relief_applied).toLocaleString()}
                          </td>
                          <td className="py-4 px-3 text-right text-zinc-400">—</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-4 px-3 font-extrabold text-[#84871d] uppercase border-r border-zinc-200">
                          PAYE Tax
                        </td>
                        <td className="py-4 px-3 text-zinc-700 border-r border-zinc-200">
                          Statutory PAYE Income Tax
                        </td>
                        <td className="py-4 px-3 text-right text-zinc-400 border-r border-zinc-200">—</td>
                        <td className="py-4 px-3 text-right font-mono font-bold text-zinc-900">
                          -₦{Number(data.paye_tax || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div className="w-72">
                      <div className="flex justify-between items-center bg-zinc-900 text-white px-4 py-2.5 font-bold text-[14px]">
                        <span>NET TAKE-HOME PAY:</span>
                        <span className="font-mono text-[#c7cc2e]">₦{Number(data.net_pay || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 pt-2">
                    <div className="border-[1.5px] border-[#b8c810] p-4 text-[11px] text-zinc-700 space-y-1 leading-relaxed">
                      <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-900 mb-1">
                        Employee Beneficiary Account
                      </p>
                      <p><strong>Account Name:</strong> {data.bank_account_name || data.staff_name}</p>
                      <p><strong>Account Number:</strong> {data.bank_account_no || "On File"}</p>
                      <p><strong>Bank Name:</strong> {data.bank_name || "On File"}</p>
                    </div>

                    <div className="border-[1.5px] border-[#b8c810] p-4 text-[11px] text-zinc-700 space-y-1 leading-relaxed flex flex-col justify-center">
                      <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-900 mb-1">
                        Authorization Status
                      </p>
                      <p><strong>Status:</strong> Approved</p>
                      <p><strong>Pay Period:</strong> {data.pay_period}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STRICTLY BOUND VECTOR FOOTER (Exact PDF Coordinates) */}
          <div className="w-full shrink-0 pt-2">
            <svg
              viewBox="0 0 595.28 94.63"
              className="w-full h-auto block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="36" y="0" width="523.28" height="58.63" fill="#000000" />
              <text
                x="98.16"
                y="35.07"
                fill="#ffffff"
                fontFamily="Inter, Arial, Helvetica, sans-serif"
                fontSize="18"
                fontWeight="700"
              >
                +234 (0) 707 3725 374
              </text>
              <text
                x="328.96"
                y="30.68"
                fill="#ffffff"
                fontFamily="Inter, Arial, Helvetica, sans-serif"
                fontSize="18"
                fontWeight="700"
                letterSpacing="-0.5"
              >
                studioslavie.com
              </text>
              <text
                x="328.96"
                y="43.08"
                fill="#ffffff"
                fontFamily="Inter, Arial, Helvetica, sans-serif"
                fontSize="12"
                fontWeight="400"
              >
                info@studioslavie.com
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
