"use client";

import OfficialDocumentModal from "@/components/admin/official-document-modal";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Mail, Trash2, Edit3, X, Save, User, Flag, FileText, Plus, Printer, Activity } from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";

export default function AdminInquiriesPage() {
  const supabase = createClient();
  const [subscribers, setSubscribers] = React.useState<any[]>([]);
  const [canManageNewsletter, setCanManageNewsletter] = React.useState(true);

  React.useEffect(() => {
    async function loadNewsletterAndAccess() {
      const { data: subData } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (subData) setSubscribers(subData);

      const { data: authData } = await supabase.auth.getUser();
      const email = authData?.user?.email?.toLowerCase();
      if (email && email !== "hipheholluhayegboyin@gmail.com") {
        const { data: prof } = await supabase.from("staff_profiles").select("*").eq("email", email).maybeSingle();
        if (prof) {
          const perms: string[] = prof.permissions || [prof.role];
          const allowed =
            prof.staff_id === "LS-01" ||
            prof.role === "super_admin" ||
            perms.includes("super_admin") ||
            perms.includes("chief_strategist") ||
            perms.includes("newsletter") ||
            perms.includes("inquiries");
          setCanManageNewsletter(allowed);
        }
      }
    }
    loadNewsletterAndAccess();
  }, [supabase]);

  const exportSubscribersCSV = () => {
    if (!canManageNewsletter) {
      alert("View-Only Executive Access: Exporting or modifying subscriber lists requires 'Newsletter & PR' or 'Inquiries' clearance.");
      return;
    }
    const rows = [
      ["Email", "Subscribed At", "Status"],
      ...subscribers.map((s) => [
        s.email || "",
        s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "",
        s.status || "active",
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `lavie-studios-newsletter-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [activeView, setActiveView] = React.useState<"inquiries" | "quotes" | "activity">("inquiries");
  const [inquiries, setInquiries] = React.useState<any[]>([]);
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  // Inquiry Management Drawer
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({
    status: "new",
    assigned_to: "",
    internal_notes: "",
  });
  const [saving, setSaving] = React.useState(false);

  // Quote Generator Modal (From Inquiry)
  const [quoteModal, setQuoteModal] = React.useState<any | null>(null);
  const [quoteItems, setQuoteItems] = React.useState<Array<{ description: string; qty: number; unitPrice: number }>>([
    { description: "", qty: 1, unitPrice: 0 },
  ]);
  const [quoteDiscountPct, setQuoteDiscountPct] = React.useState(0);
  const [quoteVatRate, setQuoteVatRate] = React.useState(7.5);
  const [quoteNotes, setQuoteNotes] = React.useState("");

  // Printable Quote Preview
  const [printQuote, setPrintQuote] = React.useState<any | null>(null);

  const loadData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [
      { data: inqData },
      { data: staffData },
      { data: qtData },
      { data: logData }
    ] = await Promise.all([
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_profiles").select("id, first_name, last_name, staff_id, status"),
      supabase.from("client_quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_activity_logs").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    if (inqData) setInquiries(inqData);
    if (staffData) {
      setStaffList(staffData.filter((s) => s.status === "active"));
      const me = staffData.find((s) => s.id === user?.id) || staffData[0];
      setCurrentUser(me);
    }
    if (qtData) setQuotes(qtData);
    if (logData) setActivityLogs(logData);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const recordStaffAction = async (action: string, targetRef: string) => {
    if (!currentUser) return;
    await supabase.from("staff_activity_logs").insert({
      staff_code: currentUser.staff_id || "LS-01",
      staff_name: `${currentUser.first_name} ${currentUser.last_name}`,
      module: "Inquiries & Quotes",
      action,
      target_ref: targetRef,
    });
  };

  const updateStatusQuick = async (msg: any, status: string) => {
    const actor = currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Studio Desk";
    await supabase.from("contact_messages").update({
      status,
      responded_by: actor,
      responded_at: new Date().toISOString(),
    }).eq("id", msg.id);
    await recordStaffAction(`Marked inquiry as ${status}`, msg.name);
    loadData();
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const actor = currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Studio Desk";
    await supabase.from("contact_messages").update({
      status: editForm.status,
      assigned_to: editForm.assigned_to || null,
      internal_notes: editForm.internal_notes || null,
      responded_by: actor,
      responded_at: new Date().toISOString(),
    }).eq("id", editingId);
    await recordStaffAction("Updated inquiry management notes", editingId.slice(0, 8));
    setSaving(false);
    setEditingId(null);
    loadData();
  };

  const openQuoteGenerator = (msg: any) => {
    setQuoteModal(msg);
    setQuoteItems([{ description: msg.subject || "Event Branding & Production", qty: 1, unitPrice: 0 }]);
    setQuoteDiscountPct(0);
    setQuoteVatRate(7.5);
    setQuoteNotes("Valid for 14 days. 70% mobilization deposit required to commence production.");
  };

  const qSubtotal = quoteItems.reduce((a, r) => a + Number(r.qty || 0) * Number(r.unitPrice || 0), 0);
  const qDiscountAmt = Math.round((qSubtotal * Number(quoteDiscountPct || 0)) / 100);
  const qNet = Math.max(0, qSubtotal - qDiscountAmt);
  const qVat = Math.round((qNet * Number(quoteVatRate || 0)) / 100);
  const qTotal = qNet + qVat;

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModal || qSubtotal <= 0) return;
    setSaving(true);
    const qNo = "QT-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const actor = currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Studio Desk";

    const { data: created } = await supabase.from("client_quotes").insert({
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
    }).select().single();

    await supabase.from("contact_messages").update({
      status: "quoted",
      responded_by: actor,
      responded_at: new Date().toISOString(),
    }).select().maybeSingle();
    await supabase.from("contact_inquiries").update({ status: "quoted" }).eq("id", quoteModal.id);

    await recordStaffAction("Generated Client Quote", `${qNo} for ${quoteModal.name}`);
    setSaving(false);
    setQuoteModal(null);
    await loadData();
    if (created) setPrintQuote(created);
  };

  const filtered = inquiries.filter((i) => filter === "all" || (i.status || "new") === filter);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-card)] px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 border border-[var(--border-subtle)]/60 print:hidden">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveView("inquiries")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeView === "inquiries" ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "text-[var(--text-muted)]"
            }`}
          >
            Inquiries ({inquiries.length})
          </button>
          <button
            onClick={() => setActiveView("quotes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeView === "quotes" ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "text-[var(--text-muted)]"
            }`}
          >
            Quotes ({quotes.length})
          </button>
          <button
            onClick={() => setActiveView("activity")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 ${
              activeView === "activity" ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "text-[var(--text-muted)]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Staff Activity ({activityLogs.length})
          </button>
        </div>

        {activeView === "inquiries" && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {["all", "new", "in_review", "quoted", "archived"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase cursor-pointer ${
                  filter === st ? "bg-[#c7cb2d] text-black font-bold" : "text-[var(--text-muted)]"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: INQUIRIES */}
      {activeView === "inquiries" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print:hidden">
          <div className={`space-y-3 ${editingId ? "lg:col-span-7" : "lg:col-span-12"}`}>
            {filtered.map((msg) => (
              <div key={msg.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      {msg.name}
                      <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-dim)]">
                        {msg.email} {msg.phone ? `• ${msg.phone}` : ""}
                      </span>
                    </h3>
                    {msg.subject && <p className="text-xs font-semibold text-[#c7cb2d] mt-0.5">{msg.subject}</p>}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-dim)]">
                    <FormattedDate dateString={msg.created_at} />
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--bg-main)] text-xs whitespace-pre-wrap">{msg.message}</div>

                {(msg.responded_by || msg.assigned_to || msg.internal_notes) && (
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[var(--text-muted)] px-1">
                    {msg.responded_by && (
                      <span className="text-[#c7cb2d]">Handled by: {msg.responded_by}</span>
                    )}
                    {msg.assigned_to && (
                      <span>Assigned: <strong>{msg.assigned_to}</strong></span>
                    )}
                    {msg.internal_notes && (
                      <span className="text-[var(--text-muted)]">Note: {msg.internal_notes}</span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                  <div className="flex items-center gap-1">
                    {["new", "in_review", "quoted", "archived"].map((st) => (
                      <button
                        key={st}
                        onClick={() => updateStatusQuick(msg, st)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase cursor-pointer ${
                          (msg.status || "new") === st ? "bg-[#c7cb2d] text-black font-bold" : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                        }`}
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
                      <FileText className="w-3 h-3" /> Generate Quote PDF
                    </button>
                    <a
                      href={`mailto:${msg.email}?subject=Re: ${msg.subject || "Lavie Studios Proposal"}`}
                      onClick={() => updateStatusQuick(msg, "in_review")}
                      className="px-3 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono uppercase flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" /> Reply
                    </a>
                    <button
                      onClick={() => {
                        setEditingId(msg.id);
                        setEditForm({ status: msg.status || "new", assigned_to: msg.assigned_to || "", internal_notes: msg.internal_notes || "" });
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
                  <button onClick={() => setEditingId(null)}><X className="w-4 h-4" /></button>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Assign Staff</label>
                  <select
                    value={editForm.assigned_to}
                    onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={`${s.first_name} ${s.last_name} (${s.staff_id})`}>
                        {s.first_name} {s.last_name} ({s.staff_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Internal Notes</label>
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
      )}

      {/* VIEW 2: GENERATED QUOTES */}
      {activeView === "quotes" && (
        <div className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-3 print:hidden">
          {quotes.map((qt) => (
            <div key={qt.id} className="p-4 rounded-2xl bg-[var(--bg-main)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                    {qt.quote_no}
                  </span>
                  <span className="text-xs font-bold">{qt.client_name}</span>
                  <span className="text-[10px] font-mono text-[var(--text-dim)]">By: {qt.prepared_by}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{qt.project_title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-[#c7cb2d]">₦{Number(qt.total_amount).toLocaleString()}</span>
                <button
                  onClick={() => setPrintQuote(qt)}
                  className="px-3 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Download Quote PDF
                </button>
              </div>
            </div>
          ))}
          {quotes.length === 0 && <p className="text-xs text-[var(--text-muted)] py-8 text-center">No quotes generated yet.</p>}
        </div>
      )}

      {/* VIEW 3: STAFF ACTIVITY LOGS */}
      {activeView === "activity" && (
        <div className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-2 print:hidden">
          {activityLogs.map((log) => (
            <div key={log.id} className="p-3 rounded-xl bg-[var(--bg-main)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-mono text-[10px] font-bold">
                  {log.staff_code}
                </span>
                <span className="font-bold">{log.staff_name}</span>
                <span className="text-[var(--text-muted)]">{log.action}</span>
                {log.target_ref && <span className="font-mono text-[10px] text-[#c7cb2d]">({log.target_ref})</span>}
              </div>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">
                <FormattedDate dateString={log.created_at} />
              </span>
            </div>
          ))}
          {activityLogs.length === 0 && <p className="text-xs text-[var(--text-muted)] py-8 text-center">No staff actions recorded yet.</p>}
        </div>
      )}

      {/* MODAL: GENERATE QUOTE FROM INQUIRY */}
      {quoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <form onSubmit={handleCreateQuote} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">Quote Builder</span>
                <h3 className="font-display text-base font-bold">Prepare Quote for {quoteModal.name}</h3>
              </div>
              <button type="button" onClick={() => setQuoteModal(null)}><X className="w-4 h-4" /></button>
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
                onClick={() => setQuoteItems([...quoteItems, { description: "", qty: 1, unitPrice: 0 }])}
                className="text-[10px] font-mono text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Line Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Discount (%)</label>
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
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">VAT (%)</label>
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
              <button type="button" onClick={() => setQuoteModal(null)} className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer">
                Generate & Preview PDF
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OFFICIAL BRANDED QUOTE PDF MODAL (Matches Invoice, Receipt & Payslip Header/Footer) */}
      {printQuote && (
        <OfficialDocumentModal
          type="quote"
          data={printQuote}
          onClose={() => setPrintQuote(null)}
        />
      )}

      {/* NEWSLETTER SUBSCRIBERS PANEL */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
              Audience & Dispatch
            </span>
            <h3 className="font-display text-lg font-bold">
              Newsletter Subscribers ({subscribers.length})
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Accessible to Executives (Oversight), Chief Strategist, and staff with Newsletter & PR or Inquiries clearance.
            </p>
          </div>
          <button
            type="button"
            onClick={exportSubscribersCSV}
            className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
          >
            Export CSV ({subscribers.length})
          </button>
        </div>

        {subscribers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--bg-main)] text-center text-xs text-[var(--text-muted)]">
            No newsletter subscribers recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {subscribers.map((sub, idx) => (
              <div
                key={sub.id || idx}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/40 flex items-center justify-between gap-2"
              >
                <span className="text-xs font-mono truncate">{sub.email}</span>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#c7cb2d]/15 text-[#c7cb2d] shrink-0">
                  {sub.status || "Subscribed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
