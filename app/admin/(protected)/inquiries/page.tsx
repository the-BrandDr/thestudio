"use client";

import { CommercialActionModals } from "@/components/admin/commercial-action-modals";
import { AdminPagination } from "@/components/admin/admin-pagination";
import OfficialDocumentModal from "@/components/admin/official-document-modal";
import { getStaffApprovalLevel } from "@/utils/resolve-current-staff";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import FeedbacksModule from "../feedbacks/page";
import NewsletterModule from "../newsletter/page";
import {
  Mail,
  Trash2,
  X,
  FileText,
  Plus,
  Printer,
  Link2,
  CheckCircle2,
  Share2,
  ArrowRight,
} from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";

export default function AdminInquiriesPage() {
  const [inqPageMap, setInqPageMap] = React.useState<Record<string, number>>({
    inquiries: 1,
    quotes: 1,
    invoices: 1,
    receipts: 1,
    feedbacks: 1,
    newsletter: 1,
  });
  const setSectionPage = (key: string, page: number) =>
    setInqPageMap((prev) => ({ ...prev, [key]: page }));

  const supabase = createClient();
  const [commercialModal, setCommercialModal] = React.useState<"sale" | "invoice" | null>(null);
  const [toastMsg, setToastMsg] = React.useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const [activeView, setActiveView] = React.useState<
    "inquiries" | "quotes" | "invoices" | "receipts" | "feedbacks" | "newsletter"
  >("inquiries");

  const [inquiries, setInquiries] = React.useState<any[]>([]);
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [receipts, setReceipts] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({
    status: "new",
    assigned_to: "",
    internal_notes: "",
  });
  const [saving, setSaving] = React.useState(false);

  const [quoteModal, setQuoteModal] = React.useState<any | null>(null);
  const [quoteItems, setQuoteItems] = React.useState<
    Array<{ description: string; qty: number; unitPrice: number }>
  >([{ description: "", qty: 1, unitPrice: 0 }]);
  const [quoteDiscountPct, setQuoteDiscountPct] = React.useState(0);
  const [quoteVatRate, setQuoteVatRate] = React.useState(7.5);
  const [quoteNotes, setQuoteNotes] = React.useState("");

  const [paystackModal, setPaystackModal] = React.useState<{
    invoice: any;
    reference: string;
    amountNaira: number;
    tier: "deposit_70" | "full_100";
  } | null>(null);

  const [receiptModal, setReceiptModal] = React.useState<{
    invoice?: any | null;
    client_name: string;
    client_company: string;
    client_email: string;
    project_title: string;
    total_contract_amount: number;
    previous_paid: number;
    amount_received: number;
    payment_method: string;
  } | null>(null);

  const [printDoc, setPrintDoc] = React.useState<{
    type: "quote" | "invoice" | "receipt";
    data: any;
  } | null>(null);

  const loadData = React.useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [
      { data: inqData },
      { data: staffData },
      { data: qtData },
      { data: invData },
      { data: rctData },
    ] = await Promise.all([
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase
        .from("staff_profiles")
        .select("id, first_name, last_name, staff_id, status, email, role, department, job_title, permissions"),
      supabase.from("client_quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("client_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_receipts").select("*").order("created_at", { ascending: false }),
    ]);

    if (inqData) setInquiries(inqData);
    if (staffData) {
      setStaffList(staffData.filter((s) => s.status === "active"));
      const email = user?.email?.toLowerCase();
      const me =
        staffData.find(
          (s) => s.id === user?.id || (email && s.email?.toLowerCase() === email)
        ) || null;
      setCurrentUser(me);
    }
    if (qtData) setQuotes(qtData);
    if (invData) setInvoices(invData);
    if (rctData) setReceipts(rctData);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Role & staff ownership filtering: Finance has access to all; other staff see only what they created
  const isFinanceUser = React.useMemo(() => {
    if (!currentUser) return false;
    const tier = getStaffApprovalLevel(currentUser);
    if (tier === "level3_finance") return true;
    const dept = String(currentUser.department || "").toLowerCase();
    const role = String(currentUser.role || currentUser.job_title || "").toLowerCase();
    const perms = Array.isArray(currentUser.permissions)
      ? currentUser.permissions.map((p: any) => String(p).toLowerCase())
      : [];
    return (
      dept.includes("finance") ||
      role.includes("finance") ||
      perms.includes("finance") ||
      perms.includes("head_of_finance")
    );
  }, [currentUser]);

  const isCreatedByMe = React.useCallback(
    (record: any) => {
      if (!record) return false;
      if (isFinanceUser) return true;
      if (!currentUser) return false;

      const myCode = String(currentUser.staff_id || "").toLowerCase().trim();
      const myFirst = String(currentUser.first_name || "").toLowerCase().trim();
      const myLast = String(currentUser.last_name || "").toLowerCase().trim();
      const myFull = (myFirst + " " + myLast).trim();

      const haystack = [
        record.prepared_by,
        record.issued_by,
        record.created_by,
        record.staff_code,
        record.staff_name,
        record.through_person,
        record.notes,
        record.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (myCode && haystack.includes(myCode)) return true;
      if (myFull && myFull.length > 2 && haystack.includes(myFull)) return true;
      if (myFirst && myFirst.length > 2 && haystack.includes(myFirst)) return true;
      return false;
    },
    [currentUser, isFinanceUser]
  );

  const visibleQuotes = React.useMemo(
    () => (isFinanceUser ? quotes : quotes.filter((q) => isCreatedByMe(q))),
    [quotes, isFinanceUser, isCreatedByMe]
  );

  const visibleInvoices = React.useMemo(
    () => (isFinanceUser ? invoices : invoices.filter((inv) => isCreatedByMe(inv))),
    [invoices, isFinanceUser, isCreatedByMe]
  );

  const visibleInvoiceIds = React.useMemo(
    () => new Set(visibleInvoices.map((i) => i.id)),
    [visibleInvoices]
  );

  const visibleReceipts = React.useMemo(
    () =>
      isFinanceUser
        ? receipts
        : receipts.filter(
            (r) => isCreatedByMe(r) || (r.invoice_id && visibleInvoiceIds.has(r.invoice_id))
          ),
    [receipts, isFinanceUser, isCreatedByMe, visibleInvoiceIds]
  );

  const cleanCreatorTag = (text?: string) =>
    String(text || "").replace(/<!--CREATOR:[\s\S]*?-->/g, "").trim();

  const recordStaffAction = async (action: string, targetRef: string) => {
    if (!currentUser) return;
    await supabase.from("staff_activity_logs").insert({
      staff_code: currentUser.staff_id || "LS-STAFF",
      staff_name: currentUser.first_name + " " + currentUser.last_name,
      module: "Inquiries, Quotes & Billing",
      action,
      target_ref: targetRef,
    });
  };

  const updateStatusQuick = async (msg: any, status: string) => {
    const actor = currentUser
      ? (currentUser.first_name + " " + currentUser.last_name + " (" + currentUser.staff_id + ")").trim()
      : "Studio Desk";
    await supabase
      .from("contact_messages")
      .update({
        status,
        responded_by: actor,
        responded_at: new Date().toISOString(),
      })
      .eq("id", msg.id);
    await recordStaffAction("Marked inquiry as " + status, msg.name);
    loadData();
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const actor = currentUser
      ? (currentUser.first_name + " " + currentUser.last_name + " (" + currentUser.staff_id + ")").trim()
      : "Studio Desk";
    await supabase
      .from("contact_messages")
      .update({
        status: editForm.status,
        assigned_to: editForm.assigned_to || null,
        internal_notes: editForm.internal_notes || null,
        responded_by: actor,
        responded_at: new Date().toISOString(),
      })
      .eq("id", editingId);
    await recordStaffAction("Updated inquiry management notes", editingId.slice(0, 8));
    setSaving(false);
    setEditingId(null);
    loadData();
  };

  const openStandaloneQuoteBuilder = () => {
    setQuoteModal({
      id: null,
      isStandalone: true,
      name: "",
      company: "",
      email: "",
      phone: "",
      subject: "",
    });
    setQuoteItems([{ description: "Corporate Branding & Production", qty: 1, unitPrice: 0 }]);
    setQuoteDiscountPct(0);
    setQuoteVatRate(7.5);
    setQuoteNotes("Valid for 14 days. 70% mobilization deposit required to commence production.");
  };

  const openQuoteGenerator = (msg: any) => {
    setQuoteModal(msg);
    setQuoteItems([
      { description: msg.subject || "Event Branding & Production", qty: 1, unitPrice: 0 },
    ]);
    setQuoteDiscountPct(0);
    setQuoteVatRate(7.5);
    setQuoteNotes("Valid for 14 days. 70% mobilization deposit required to commence production.");
  };

  const qSubtotal = quoteItems.reduce(
    (a, r) => a + Number(r.qty || 0) * Number(r.unitPrice || 0),
    0
  );
  const qDiscountAmt = Math.round((qSubtotal * Number(quoteDiscountPct || 0)) / 100);
  const qNet = Math.max(0, qSubtotal - qDiscountAmt);
  const qVat = Math.round((qNet * Number(quoteVatRate || 0)) / 100);
  const qTotal = qNet + qVat;

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModal || qSubtotal <= 0) return;
    setSaving(true);
    const qNo = "QT-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const actor = currentUser
      ? (currentUser.first_name + " " + currentUser.last_name + " (" + currentUser.staff_id + ")").trim()
      : "Studio Desk";

    const { data: created } = await supabase
      .from("client_quotes")
      .insert({
        quote_no: qNo,
        inquiry_id: quoteModal.id,
        client_name: quoteModal.name,
        client_company: quoteModal.name,
        client_email: quoteModal.email,
        client_phone: quoteModal.phone,
        project_title: quoteModal.subject || "Project Proposal & Quote",
        line_items: quoteItems,
        subtotal: qSubtotal,
        discount_percent: quoteDiscountPct,
        discount_amount: qDiscountAmt,
        vat_rate: quoteVatRate,
        vat_amount: qVat,
        total_amount: qTotal,
        notes: quoteNotes,
        prepared_by: actor,
      })
      .select()
      .single();

    if (quoteModal?.id) {
      await supabase
        .from("contact_messages")
        .update({
          status: "quoted",
          responded_by: actor,
          responded_at: new Date().toISOString(),
        })
        .eq("id", quoteModal.id);
    }

    await recordStaffAction("Generated Client Quote", qNo + " for " + quoteModal.name);
    setSaving(false);
    setQuoteModal(null);
    await loadData();
    if (created) setPrintDoc({ type: "quote", data: created });
  };

  const handleConvertQuoteToInvoice = async (qt: any) => {
    setSaving(true);
    try {
      const now = new Date();
      const mmYY =
        String(now.getMonth() + 1).padStart(2, "0") + String(now.getFullYear()).slice(-2);
      const seq = String(invoices.length + 1).padStart(2, "0");
      const invNo = "LS/BRANDS/" + mmYY + "/" + seq;
      const actor = currentUser
        ? (currentUser.first_name + " " + currentUser.last_name + " (" + currentUser.staff_id + ")").trim()
        : qt.prepared_by || "Studio Desk";

      const creatorTag = "<!--CREATOR:" + (currentUser?.staff_id || "") + "|" + actor + "-->";

      const { data: createdInv, error } = await supabase
        .from("client_invoices")
        .insert({
          invoice_no: invNo,
          client_name: qt.client_name,
          client_company: qt.client_company || qt.client_name,
          client_email: qt.client_email || "",
          through_person: actor,
          project_title: qt.project_title,
          line_items: qt.line_items || [],
          subtotal: Number(qt.subtotal || qt.total_amount || 0),
          discount_percent: Number(qt.discount_percent || 0),
          discount_amount: Number(qt.discount_amount || 0),
          vat_rate: Number(qt.vat_rate || 0),
          vat_amount: Number(qt.vat_amount || 0),
          total_amount: Number(qt.total_amount || 0),
          amount_paid: 0,
          status: "unpaid",
          notes: cleanCreatorTag(qt.notes || "70% advance deposit or 100% full settlement.") + "\n" + creatorTag,
        })
        .select()
        .single();

      if (error) {
        showToast(error.message || "Could not create invoice from quote.");
      } else if (createdInv) {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "https://studioslavie.com";
        const payLink = origin + "/pay/" + createdInv.id;
        await supabase
          .from("client_invoices")
          .update({ payment_link: payLink })
          .eq("id", createdInv.id);
        await recordStaffAction("Converted Quote to Invoice", qt.quote_no + " -> " + invNo);
        await loadData();
        setActiveView("invoices");
        showToast("Created Invoice " + invNo + " with Paystack link!");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIssueReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModal || Number(receiptModal.amount_received) <= 0) return;
    setSaving(true);
    try {
      const rctNo = "LS/RCT/" + new Date().getFullYear() + "/" + Math.floor(1000 + Math.random() * 9000);
      const actor = currentUser
        ? (currentUser.first_name + " " + currentUser.last_name + " (" + currentUser.staff_id + ")").trim()
        : "Studio Desk";

      const totalContract = Number(receiptModal.total_contract_amount || 0);
      const prevPaid = Number(receiptModal.previous_paid || 0);
      const receivedNow = Number(receiptModal.amount_received || 0);
      const newTotalPaid = prevPaid + receivedNow;
      const balanceRemaining = Math.max(0, totalContract - newTotalPaid);

      if (receiptModal.invoice?.id) {
        await supabase
          .from("client_invoices")
          .update({
            amount_paid: newTotalPaid,
            status: balanceRemaining <= 0 ? "paid" : "partially_paid",
          })
          .eq("id", receiptModal.invoice.id);

        if (receiptModal.invoice.project_id) {
          await supabase
            .from("studio_projects")
            .update({
              amount_paid: newTotalPaid,
              status: balanceRemaining <= 0 ? "completed" : "in_progress",
            })
            .eq("id", receiptModal.invoice.project_id);
        }
      }

      const { data: newReceipt } = await supabase
        .from("payment_receipts")
        .insert({
          receipt_no: rctNo,
          invoice_id: receiptModal.invoice?.id || null,
          project_id: receiptModal.invoice?.project_id || null,
          reference_code: receiptModal.invoice?.invoice_no || rctNo,
          client_name: receiptModal.client_name,
          client_company: receiptModal.client_company || receiptModal.client_name,
          client_email: receiptModal.client_email || "",
          through_person: receiptModal.client_name,
          project_title: receiptModal.project_title,
          total_contract_amount: totalContract,
          previous_paid: prevPaid,
          amount_received: receivedNow,
          balance_remaining: balanceRemaining,
          payment_method: receiptModal.payment_method,
          issued_by: actor,
        })
        .select()
        .single();

      await recordStaffAction("Issued Official Receipt", rctNo + " for " + receiptModal.client_name);
      setReceiptModal(null);
      await loadData();
      showToast("Receipt " + rctNo + " generated!");
      if (newReceipt) setPrintDoc({ type: "receipt", data: newReceipt });
    } finally {
      setSaving(false);
    }
  };

  const openConfirmPaystackModal = (inv: any) => {
    const totalAmt = Number(inv.total_amount || 0);
    const paidSoFar = Number(inv.amount_paid || 0);
    const bal = Math.max(0, totalAmt - paidSoFar);
    const seventyAmt = Math.round(totalAmt * 0.7);
    const defaultTier = paidSoFar === 0 ? "deposit_70" : "full_100";

    setPaystackModal({
      invoice: inv,
      reference: "PS-" + (inv.invoice_no?.replace(/[^A-Z0-9]/gi, "") || "INV") + "-" + Date.now().toString().slice(-5),
      amountNaira: defaultTier === "deposit_70" ? seventyAmt : bal,
      tier: defaultTier,
    });
  };

  const handleConfirmPaystackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paystackModal || !paystackModal.invoice) return;
    const { invoice: inv, reference, amountNaira, tier } = paystackModal;
    if (!reference.trim() || Number(amountNaira) <= 0) return;

    setSaving(true);
    try {
      const actor = currentUser
        ? (currentUser.first_name + " " + currentUser.last_name + " (" + currentUser.staff_id + ")").trim()
        : "Studio Desk";

      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: inv.id,
          reference: reference.trim(),
          amountNaira: Number(amountNaira),
          paymentOption: tier,
          actorName: actor,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        showToast(json?.error || "Could not verify payment.");
      } else {
        setPaystackModal(null);
        await loadData();
        showToast(
          "Confirmed ₦" + Number(amountNaira).toLocaleString() + "! Balance Due: ₦" + Number(json.balanceRemaining || 0).toLocaleString()
        );
        if (json.receipt) setPrintDoc({ type: "receipt", data: json.receipt });
      }
    } finally {
      setSaving(false);
    }
  };

  const copyPaystackLink = (inv: any) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://studioslavie.com";
    const payUrl = origin + "/pay/" + inv.id;
    navigator.clipboard.writeText(payUrl);
    showToast("Paystack Payment Link (70% / 100%) copied to clipboard!");
  };

  const sharePaystackLinkWhatsApp = (inv: any) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://studioslavie.com";
    const payUrl = origin + "/pay/" + inv.id;
    const total = Number(inv.total_amount || 0);
    const paid = Number(inv.amount_paid || 0);
    const bal = Math.max(0, total - paid);
    const seventy = Math.round(total * 0.7);
    const text =
      "Hello " + (inv.client_company || inv.client_name) +
      ", here is your official Lavie Studios invoice (" + inv.invoice_no + ") for \"" + inv.project_title + "\".\n\n" +
      "• Invoice Total: ₦" + total.toLocaleString() + "\n" +
      "• 70% Advance Option: ₦" + seventy.toLocaleString() + "\n" +
      "• Balance Due: ₦" + bal.toLocaleString() + "\n\n" +
      "Pay securely via Paystack (70% deposit or 100% full payment): " + payUrl;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };

  const filtered = inquiries.filter((i) => filter === "all" || (i.status || "new") === filter);

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-[#c7cb2d] text-black font-mono text-xs font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <div className="bg-[var(--bg-card)] px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 border border-[var(--border-subtle)]/60 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "inquiries", label: "Inquiries (" + inquiries.length + ")" },
            { id: "quotes", label: "Quotes (" + visibleQuotes.length + ")" },
            { id: "invoices", label: "Invoices (" + visibleInvoices.length + ")" },
            { id: "receipts", label: "Receipts (" + visibleReceipts.length + ")" },
            { id: "feedbacks", label: "Feedbacks" },
            { id: "newsletter", label: "Newsletter" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id as any)}
              className={
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer " +
                (activeView === tab.id
                  ? "bg-[#c7cb2d] text-black"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)]">
            {isFinanceUser ? "Finance View: All Studio Records" : "My Records (" + (currentUser?.first_name || "Staff") + ")"}
          </span>
          <button
            type="button"
            onClick={openStandaloneQuoteBuilder}
            className="px-3 py-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[11px] font-mono font-bold cursor-pointer"
          >
            + Quote
          </button>
          <button
            type="button"
            onClick={() => setCommercialModal("invoice")}
            className="px-3 py-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[11px] font-mono font-bold cursor-pointer"
          >
            + Invoice
          </button>
          <button
            type="button"
            onClick={() =>
              setReceiptModal({
                invoice: null,
                client_name: "",
                client_company: "",
                client_email: "",
                project_title: "",
                total_contract_amount: 0,
                previous_paid: 0,
                amount_received: 0,
                payment_method: "Bank Transfer",
              })
            }
            className="px-3 py-1.5 rounded-full bg-[#c7cb2d] text-black text-[11px] font-mono font-bold cursor-pointer"
          >
            + Issue Receipt
          </button>
        </div>
      </div>

      {/* VIEW 1: INQUIRIES */}
      {activeView === "inquiries" && (
        <div className="space-y-3 print:hidden">
          <div className="flex items-center gap-1 overflow-x-auto">
            {["all", "new", "in_review", "quoted", "archived"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase cursor-pointer " +
                  (filter === st ? "bg-[#c7cb2d] text-black font-bold" : "text-[var(--text-muted)]")
                }
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className={"space-y-3 " + (editingId ? "lg:col-span-7" : "lg:col-span-12")}>
              {filtered.map((msg) => (
                <div
                  key={msg.id}
                  className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        {msg.name}
                        <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-dim)]">
                          {msg.email} {msg.phone ? "• " + msg.phone : ""}
                        </span>
                      </h3>
                      {msg.subject && (
                        <p className="text-xs font-semibold text-[#c7cb2d] mt-0.5">{msg.subject}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-dim)]">
                      <FormattedDate dateString={msg.created_at} />
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--bg-main)] text-xs whitespace-pre-wrap">
                    {msg.message}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                    <div className="flex items-center gap-1">
                      {["new", "in_review", "quoted", "archived"].map((st) => (
                        <button
                          key={st}
                          onClick={() => updateStatusQuick(msg, st)}
                          className={
                            "px-2 py-0.5 rounded text-[9px] font-mono uppercase cursor-pointer " +
                            ((msg.status || "new") === st
                              ? "bg-[#c7cb2d] text-black font-bold"
                              : "bg-[var(--bg-main)] text-[var(--text-muted)]")
                          }
                        >
                          {st.replace("_", " ")}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => openQuoteGenerator(msg)}
                        className="px-3 py-1 rounded-lg bg-[#c7cb2d] text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" /> Generate Quote
                      </button>
                      <a
                        href={"mailto:" + msg.email + "?subject=Re: " + (msg.subject || "Lavie Studios Proposal")}
                        onClick={() => updateStatusQuick(msg, "in_review")}
                        className="px-3 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono uppercase flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Reply
                      </a>
                      <button
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditForm({
                            status: msg.status || "new",
                            assigned_to: msg.assigned_to || "",
                            internal_notes: msg.internal_notes || "",
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono uppercase cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingId && (
              <div className="lg:col-span-5">
                <div className="sticky top-24 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                    <h3 className="font-display text-sm font-bold">Manage Inquiry</h3>
                    <button onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      Assign Staff
                    </label>
                    <select
                      value={editForm.assigned_to}
                      onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map((s) => (
                        <option
                          key={s.id}
                          value={s.first_name + " " + s.last_name + " (" + s.staff_id + ")"}
                        >
                          {s.first_name} {s.last_name} ({s.staff_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      rows={3}
                      value={editForm.internal_notes}
                      onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="w-full py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: GENERATED QUOTES */}
      {activeView === "quotes" && (
        <div className="space-y-4 print:hidden">
          <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">
                {isFinanceUser ? "All Client Commercial Quotes" : "My Generated Quotes"} ({visibleQuotes.length})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isFinanceUser
                  ? "Finance View: Showing all quotes across the studio."
                  : "Showing quotes prepared by you. Convert any approved quote into an invoice in 1 click."}
              </p>
            </div>
            <button
              type="button"
              onClick={openStandaloneQuoteBuilder}
              className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              + Generate Client Quote
            </button>
          </div>

          <div className="space-y-3">
            {visibleQuotes
              .slice(((inqPageMap["quotes"] || 1) - 1) * 8, (inqPageMap["quotes"] || 1) * 8)
              .map((qt) => (
                <div
                  key={qt.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-7 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-main)] text-[#c7cb2d] font-bold">
                        {qt.quote_no}
                      </span>
                      <span className="text-xs sm:text-sm font-bold">{qt.client_name}</span>
                      <span className="text-[10px] font-mono text-[var(--text-dim)]">
                        By: {qt.prepared_by}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] break-words">
                      {qt.project_title}
                    </p>
                  </div>

                  <div className="sm:col-span-5 flex flex-wrap sm:justify-end items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[#c7cb2d] mr-2">
                      ₦{Number(qt.total_amount || 0).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleConvertQuoteToInvoice(qt)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[#c7cb2d]/50 text-[#c7cb2d] hover:bg-[#c7cb2d] hover:text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <ArrowRight className="w-3 h-3" /> Convert to Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintDoc({ type: "quote", data: qt })}
                      className="px-3 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Quote PDF
                    </button>
                  </div>
                </div>
              ))}
            {visibleQuotes.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                No quotes created by you yet. Click "+ Generate Client Quote" above to create one.
              </p>
            )}
          </div>
          <AdminPagination
            currentPage={inqPageMap["quotes"] || 1}
            totalItems={visibleQuotes.length}
            pageSize={8}
            onPageChange={(p) => setSectionPage("quotes", p)}
            itemLabel="quotes"
          />
        </div>
      )}

      {/* VIEW 3: CLIENT INVOICES & SHAREABLE PAYSTACK LINKS */}
      {activeView === "invoices" && (
        <div className="space-y-4 print:hidden">
          <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">
                {isFinanceUser ? "All Studio Invoices" : "My Created Invoices"} ({visibleInvoices.length})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isFinanceUser
                  ? "Finance View: Full access to all studio invoices, Paystack links, and receipts."
                  : "Showing invoices generated by you. Copy or share Paystack payment links (70% deposit or 100% full) and issue receipts."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCommercialModal("invoice")}
              className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              + Create New Invoice
            </button>
          </div>

          <div className="space-y-3">
            {visibleInvoices
              .slice(((inqPageMap["invoices"] || 1) - 1) * 8, (inqPageMap["invoices"] || 1) * 8)
              .map((inv) => {
                const paid = Number(
                  inv.amount_paid || (inv.status === "paid" ? inv.total_amount : 0)
                );
                const bal = Math.max(0, Number(inv.total_amount || 0) - paid);

                return (
                  <div
                    key={inv.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-start">
                      <div className="sm:col-span-7 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-main)] text-[#c7cb2d] font-bold shrink-0">
                            {inv.invoice_no}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] break-words">
                            {inv.client_company || inv.client_name}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed break-words">
                          {inv.project_title}
                        </p>
                      </div>

                      <div className="sm:col-span-5 sm:text-right font-mono shrink-0 space-y-0.5 bg-[var(--bg-main)]/60 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                        <p className="text-sm font-bold text-[#c7cb2d]">
                          Total: ₦{Number(inv.total_amount || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[var(--text-dim)]">
                          Subtotal: ₦{Number(inv.subtotal || 0).toLocaleString()} • VAT: ₦
                          {Number(inv.vat_amount || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[#c7cb2d] font-semibold">
                          Amount Paid: ₦{paid.toLocaleString()} • Balance Due: ₦
                          {bal.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)]/50">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={
                            "px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold " +
                            (bal <= 0
                              ? "bg-emerald-500/20 text-emerald-300"
                              : paid > 0
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-[var(--bg-main)] text-[#c7cb2d]")
                          }
                        >
                          {bal <= 0 ? "PAID" : paid > 0 ? "PARTIALLY PAID" : inv.status || "UNPAID"}
                        </span>

                        <button
                          type="button"
                          onClick={() => copyPaystackLink(inv)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] hover:border-[#c7cb2d] border border-transparent text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <Link2 className="w-3 h-3 text-[#c7cb2d]" /> Copy Payment Link
                        </button>

                        <button
                          type="button"
                          onClick={() => sharePaystackLinkWhatsApp(inv)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] hover:border-[#c7cb2d] border border-transparent text-[10px] font-mono flex items-center gap-1 cursor-pointer text-emerald-400"
                        >
                          <Share2 className="w-3 h-3" /> Share WhatsApp
                        </button>

                        <a
                          href={"/pay/" + inv.id}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[#c7cb2d]"
                        >
                          Open Portal ↗
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {bal > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => openConfirmPaystackModal(inv)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] font-mono uppercase cursor-pointer hover:bg-emerald-500 hover:text-black transition"
                            >
                              Confirm Paystack
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setReceiptModal({
                                  invoice: inv,
                                  client_name: inv.client_name,
                                  client_company: inv.client_company || inv.client_name,
                                  client_email: inv.client_email || "",
                                  project_title: inv.project_title,
                                  total_contract_amount: Number(inv.total_amount || 0),
                                  previous_paid: paid,
                                  amount_received: bal,
                                  payment_method: "Bank Transfer",
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold text-[10px] font-mono uppercase cursor-pointer"
                            >
                              Generate Receipt
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setPrintDoc({
                              type: "invoice",
                              data: { ...inv, notes: cleanCreatorTag(inv.notes) },
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Official PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            {visibleInvoices.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                No invoices created by you yet. Click "+ Create New Invoice" or convert a Quote to an Invoice.
              </p>
            )}
          </div>
          <AdminPagination
            currentPage={inqPageMap["invoices"] || 1}
            totalItems={visibleInvoices.length}
            pageSize={8}
            onPageChange={(p) => setSectionPage("invoices", p)}
            itemLabel="invoices"
          />
        </div>
      )}

      {/* VIEW 4: CLIENT PAYMENT RECEIPTS */}
      {activeView === "receipts" && (
        <div className="space-y-4 print:hidden">
          <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">
                {isFinanceUser ? "All Official Payment Receipts" : "My Client Payment Receipts"} ({visibleReceipts.length})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isFinanceUser
                  ? "Finance View: Showing all payment receipts across the studio."
                  : "Showing payment receipts issued by you or for your invoices."}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setReceiptModal({
                  invoice: null,
                  client_name: "",
                  client_company: "",
                  client_email: "",
                  project_title: "",
                  total_contract_amount: 0,
                  previous_paid: 0,
                  amount_received: 0,
                  payment_method: "Bank Transfer",
                })
              }
              className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              + Issue Client Receipt
            </button>
          </div>

          <div className="space-y-3">
            {visibleReceipts
              .slice(((inqPageMap["receipts"] || 1) - 1) * 8, (inqPageMap["receipts"] || 1) * 8)
              .map((rct) => (
                <div
                  key={rct.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-7 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-main)] text-[#c7cb2d] font-bold">
                        {rct.receipt_no}
                      </span>
                      <span className="text-xs sm:text-sm font-bold">
                        {rct.client_company || rct.client_name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-dim)]">
                        {rct.payment_method}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] break-words">
                      {rct.project_title}
                    </p>
                  </div>

                  <div className="sm:col-span-5 flex flex-wrap sm:justify-end items-center gap-3">
                    <div className="sm:text-right font-mono">
                      <p className="text-sm font-bold text-[#c7cb2d]">
                        Received: ₦{Number(rct.amount_received || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--text-dim)]">
                        Contract: ₦{Number(rct.total_contract_amount || 0).toLocaleString()} •
                        Balance: ₦{Number(rct.balance_remaining || 0).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintDoc({ type: "receipt", data: rct })}
                      className="px-3 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Official PDF
                    </button>
                  </div>
                </div>
              ))}
            {visibleReceipts.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                No payment receipts issued by you yet.
              </p>
            )}
          </div>
          <AdminPagination
            currentPage={inqPageMap["receipts"] || 1}
            totalItems={visibleReceipts.length}
            pageSize={8}
            onPageChange={(p) => setSectionPage("receipts", p)}
            itemLabel="receipts"
          />
        </div>
      )}

      {/* VIEW 5: FEEDBACKS */}
      {activeView === "feedbacks" && (
        <div className="pt-2">
          <FeedbacksModule />
        </div>
      )}

      {/* VIEW 6: NEWSLETTER */}
      {activeView === "newsletter" && (
        <div className="pt-2">
          <NewsletterModule />
        </div>
      )}

      {/* MODAL: CUSTOM STUDIO PAYSTACK CONFIRMATION */}
      {paystackModal && (() => {
        const inv = paystackModal.invoice;
        const totalAmt = Number(inv.total_amount || 0);
        const paidSoFar = Number(inv.amount_paid || 0);
        const bal = Math.max(0, totalAmt - paidSoFar);
        const seventyAmt = Math.round(totalAmt * 0.7);
        const canPickSeventy = paidSoFar === 0 && bal > 0;
        const projectedBalance = Math.max(0, bal - Number(paystackModal.amountNaira || 0));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
            <form
              onSubmit={handleConfirmPaystackSubmit}
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                    Paystack Payment Confirmation
                  </span>
                  <h3 className="font-display text-base font-bold mt-0.5">
                    {inv.invoice_no} — {inv.client_company || inv.client_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPaystackModal(null)}
                  className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div>
                  <p className="text-[9px] uppercase text-[var(--text-dim)]">Invoice Total</p>
                  <p className="font-bold text-white mt-0.5">₦{totalAmt.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-[var(--text-dim)]">Already Paid</p>
                  <p className="font-bold text-emerald-400 mt-0.5">₦{paidSoFar.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-[#c7cb2d]">Balance Due</p>
                  <p className="font-bold text-[#c7cb2d] mt-0.5">₦{bal.toLocaleString()}</p>
                </div>
              </div>

              {canPickSeventy && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)]">
                    Select Payment Tier
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPaystackModal({
                          ...paystackModal,
                          tier: "deposit_70",
                          amountNaira: seventyAmt,
                        })
                      }
                      className={
                        "p-3 rounded-2xl border text-left transition cursor-pointer " +
                        (paystackModal.tier === "deposit_70"
                          ? "bg-[#c7cb2d]/15 border-[#c7cb2d] text-white"
                          : "bg-[var(--bg-main)] border-[var(--border-subtle)]/60 text-[var(--text-muted)]")
                      }
                    >
                      <p className="text-[10px] font-mono uppercase font-bold text-[#c7cb2d]">
                        70% Advance
                      </p>
                      <p className="font-mono text-sm font-bold mt-1">
                        ₦{seventyAmt.toLocaleString()}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPaystackModal({
                          ...paystackModal,
                          tier: "full_100",
                          amountNaira: bal,
                        })
                      }
                      className={
                        "p-3 rounded-2xl border text-left transition cursor-pointer " +
                        (paystackModal.tier === "full_100"
                          ? "bg-emerald-500/15 border-emerald-500 text-white"
                          : "bg-[var(--bg-main)] border-[var(--border-subtle)]/60 text-[var(--text-muted)]")
                      }
                    >
                      <p className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                        100% Full Payment
                      </p>
                      <p className="font-mono text-sm font-bold mt-1">
                        ₦{bal.toLocaleString()}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Paystack Transaction Reference *
                </label>
                <input
                  required
                  value={paystackModal.reference}
                  onChange={(e) =>
                    setPaystackModal({ ...paystackModal, reference: e.target.value })
                  }
                  placeholder="e.g. LV-LSBRANDS112602-..."
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] mb-1">
                  Confirmed Amount Paid (₦) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paystackModal.amountNaira || ""}
                  onChange={(e) =>
                    setPaystackModal({
                      ...paystackModal,
                      amountNaira: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[var(--bg-main)] border border-[#c7cb2d]/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-[#c7cb2d] focus:outline-none"
                />
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                  Remaining Balance After Confirmation:{" "}
                  <strong className="text-white">₦{projectedBalance.toLocaleString()}</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaystackModal(null)}
                  className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer hover:brightness-110 transition"
                >
                  {saving ? "Confirming..." : "Confirm & Issue Receipt"}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* MODAL: GENERATE QUOTE */}
      {quoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <form
            onSubmit={handleCreateQuote}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                  Quote Builder
                </span>
                <h3 className="font-display text-base font-bold">
                  {quoteModal.name
                    ? "Prepare Quote for " + quoteModal.name
                    : "Generate New Client Quote"}
                </h3>
              </div>
              <button type="button" onClick={() => setQuoteModal(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <input
                required
                value={quoteModal.name || ""}
                onChange={(e) => setQuoteModal({ ...quoteModal, name: e.target.value })}
                placeholder="Client / Company Name *"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <input
                required
                value={quoteModal.subject || ""}
                onChange={(e) => setQuoteModal({ ...quoteModal, subject: e.target.value })}
                placeholder="Project Title *"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="email"
                value={quoteModal.email || ""}
                onChange={(e) => setQuoteModal({ ...quoteModal, email: e.target.value })}
                placeholder="Client Email (Optional)"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <input
                value={quoteModal.phone || ""}
                onChange={(e) => setQuoteModal({ ...quoteModal, phone: e.target.value })}
                placeholder="Client Phone (Optional)"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {quoteItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Deliverable"
                    value={row.description}
                    onChange={(e) => {
                      const copy = [...quoteItems];
                      copy[idx].description = e.target.value;
                      setQuoteItems(copy);
                    }}
                    className="col-span-6 bg-[var(--bg-main)] rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={(e) => {
                      const copy = [...quoteItems];
                      copy[idx].qty = Number(e.target.value);
                      setQuoteItems(copy);
                    }}
                    className="col-span-2 bg-[var(--bg-main)] rounded-lg px-2 py-1.5 text-xs text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Price ₦"
                    value={row.unitPrice || ""}
                    onChange={(e) => {
                      const copy = [...quoteItems];
                      copy[idx].unitPrice = Number(e.target.value);
                      setQuoteItems(copy);
                    }}
                    className="col-span-3 bg-[var(--bg-main)] rounded-lg px-2 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                    disabled={quoteItems.length === 1}
                    className="col-span-1 text-[var(--text-dim)] hover:text-red-400 flex justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setQuoteItems([...quoteItems, { description: "", qty: 1, unitPrice: 0 }])
                }
                className="text-[10px] font-mono text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Line Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quoteDiscountPct || ""}
                  onChange={(e) => setQuoteDiscountPct(Number(e.target.value))}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  VAT (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={quoteVatRate}
                  onChange={(e) => setQuoteVatRate(Number(e.target.value))}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--bg-main)] text-xs font-mono flex justify-between items-center">
              <span>Total Quote Value (incl. VAT):</span>
              <span className="text-sm font-bold text-[#c7cb2d]">₦{qTotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuoteModal(null)}
                className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
              >
                Generate & Preview PDF
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ISSUE PAYMENT RECEIPT FOR CLIENT */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <form
            onSubmit={handleIssueReceipt}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-lg space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                  Official Client Receipt
                </span>
                <h3 className="font-display text-base font-bold">
                  {receiptModal.invoice
                    ? "Receive Payment — " + receiptModal.invoice.invoice_no
                    : "Issue Client Payment Receipt"}
                </h3>
              </div>
              <button type="button" onClick={() => setReceiptModal(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!receiptModal.invoice && visibleInvoices.length > 0 && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Link to Invoice (Optional)
                </label>
                <select
                  onChange={(e) => {
                    const inv = visibleInvoices.find((i) => i.id === e.target.value);
                    if (inv) {
                      const paid = Number(inv.amount_paid || 0);
                      const bal = Math.max(0, Number(inv.total_amount || 0) - paid);
                      setReceiptModal({
                        invoice: inv,
                        client_name: inv.client_name,
                        client_company: inv.client_company || inv.client_name,
                        client_email: inv.client_email || "",
                        project_title: inv.project_title,
                        total_contract_amount: Number(inv.total_amount || 0),
                        previous_paid: paid,
                        amount_received: bal,
                        payment_method: "Bank Transfer",
                      });
                    }
                  }}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">-- Standalone Receipt (Or Select Invoice) --</option>
                  {visibleInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_no} — {inv.client_company || inv.client_name} (₦
                      {Number(inv.total_amount || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                required
                value={receiptModal.client_name}
                onChange={(e) =>
                  setReceiptModal({
                    ...receiptModal,
                    client_name: e.target.value,
                    client_company: e.target.value,
                  })
                }
                placeholder="Client / Company Name *"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <input
                required
                value={receiptModal.project_title}
                onChange={(e) =>
                  setReceiptModal({ ...receiptModal, project_title: e.target.value })
                }
                placeholder="Project / Service Title *"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Total Contract Value (₦)
                </label>
                <input
                  type="number"
                  required
                  value={receiptModal.total_contract_amount || ""}
                  onChange={(e) =>
                    setReceiptModal({
                      ...receiptModal,
                      total_contract_amount: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] mb-1">
                  Amount Received Now (₦) *
                </label>
                <input
                  type="number"
                  required
                  value={receiptModal.amount_received || ""}
                  onChange={(e) =>
                    setReceiptModal({
                      ...receiptModal,
                      amount_received: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[var(--bg-main)] border border-[#c7cb2d]/50 rounded-xl px-3 py-2 text-xs font-mono text-[#c7cb2d] font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setReceiptModal({
                    ...receiptModal,
                    amount_received: Math.round(
                      Number(receiptModal.total_contract_amount || 0) * 0.7
                    ),
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono text-[#c7cb2d] cursor-pointer"
              >
                Set to 70% Deposit (₦
                {Math.round(Number(receiptModal.total_contract_amount || 0) * 0.7).toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() =>
                  setReceiptModal({
                    ...receiptModal,
                    amount_received: Math.max(
                      0,
                      Number(receiptModal.total_contract_amount || 0) -
                        Number(receiptModal.previous_paid || 0)
                    ),
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono text-emerald-400 cursor-pointer"
              >
                Set to Full Balance (100%)
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Payment Method
              </label>
              <select
                value={receiptModal.payment_method}
                onChange={(e) =>
                  setReceiptModal({ ...receiptModal, payment_method: e.target.value })
                }
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Paystack Checkout">Paystack Checkout</option>
                <option value="POS / Card">POS / Card</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
              >
                Generate & Print Receipt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OFFICIAL DOCUMENT MODAL */}
      {printDoc && (
        <OfficialDocumentModal
          type={printDoc.type}
          data={printDoc.data}
          onClose={() => setPrintDoc(null)}
        />
      )}

      <CommercialActionModals
        openModal={commercialModal}
        onClose={() => setCommercialModal(null)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}