"use client";

import OfficialDocumentModal from "@/components/admin/official-document-modal";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Mail, Trash2, Edit3, X, Save, User, Flag, FileText, Plus, Printer, Activity } from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";

export default function AdminInquiriesPage() {
  const supabase = createClient();
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
    }).eq("id", quoteModal.id);

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

      {/* PRINTABLE CAC-COMPLIANT QUOTE PDF MODAL */}
      {printQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-2xl p-8 shadow-2xl space-y-6 my-8 print:shadow-none print:m-0 print:p-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 print:hidden">
              <span className="text-xs font-mono uppercase text-zinc-500 font-bold">Client Quote PDF Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Save / Print Quote PDF
                </button>
                <button onClick={() => setPrintQuote(null)} className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                  Close
                </button>
              </div>
            </div>

            <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-5">
              <div>
                <img src="/logo-dark2.svg" alt="Lavie Studios Ltd" className="h-7 object-contain mb-2" onError={(e) => { (e.target as HTMLImageElement).src = "/logo-light.svg"; }} />
                <p className="text-xs font-bold uppercase tracking-wider">Lavie Studios Ltd</p>
                <p className="text-[11px] text-zinc-600">Behind Attimaggies Hotel, Yoaco Area, Ogbomoso, Oyo State, Nigeria</p>
                <p className="text-[11px] font-mono text-zinc-600">+234 (0) 8134629836 • info@studioslavie.com</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded bg-zinc-900 text-[#c7cb2d] font-mono text-xs font-bold uppercase">
                  COMMERCIAL QUOTE
                </span>
                <p className="text-xs font-mono font-bold mt-2">{printQuote.quote_no}</p>
                <p className="text-[11px] text-zinc-500">Date: {new Date(printQuote.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-400">Prepared For</p>
                <p className="font-bold text-sm">{printQuote.client_name}</p>
                <p className="text-zinc-600">{printQuote.client_email} {printQuote.client_phone ? `• ${printQuote.client_phone}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase text-zinc-400">Subject</p>
                <p className="font-bold">{printQuote.project_title}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-300 text-[10px] font-mono uppercase text-zinc-500">
                  <th className="py-2">Deliverable</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Rate (₦)</th>
                  <th className="py-2 text-right">Total (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(printQuote.line_items || []).map((li: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{li.description}</td>
                    <td className="py-2.5 text-center font-mono">{li.qty}</td>
                    <td className="py-2.5 text-right font-mono">₦{Number(li.unitPrice).toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono font-bold">₦{(Number(li.qty) * Number(li.unitPrice)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-start pt-3 border-t border-zinc-300 text-xs">
              <div className="max-w-xs space-y-1">
                <p className="font-bold uppercase text-[10px] font-mono text-zinc-500">Terms & Bank Details</p>
                <p className="text-[11px] text-zinc-600">{printQuote.notes}</p>
                <p className="pt-1">Bank: <strong>UBA / Polaris Bank — Lavie Studios Ltd</strong></p>
              </div>
              <div className="w-56 space-y-1 font-mono text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₦{Number(printQuote.subtotal).toLocaleString()}</span>
                </div>
                {Number(printQuote.discount_amount) > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount ({printQuote.discount_percent}%):</span>
                    <span>-₦{Number(printQuote.discount_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT ({printQuote.vat_rate}%):</span>
                  <span>+₦{Number(printQuote.vat_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-zinc-900 pt-1.5">
                  <span>Total Quote:</span>
                  <span>₦{Number(printQuote.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-200 text-xs">
              <div>
                <p className="italic text-base text-zinc-800">Ifeoluwa Ayegboyin</p>
                <div className="w-44 h-px bg-zinc-400 my-1" />
                <p className="font-bold">Ifeoluwa Ayegboyin</p>
                <p className="text-[10px] font-mono uppercase text-zinc-500">Chief Strategist • Lavie Studios Ltd</p>
              </div>
              <div className="text-right">
                <p className="italic text-base text-zinc-800">{printQuote.prepared_by}</p>
                <div className="w-44 h-px bg-zinc-400 my-1 ml-auto" />
                <p className="font-bold">Prepared By</p>
                <p className="text-[10px] font-mono uppercase text-zinc-500">Lavie Studios Desk</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
