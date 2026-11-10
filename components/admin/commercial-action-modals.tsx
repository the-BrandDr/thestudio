"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { STUDIO_SERVICE_CATEGORIES, resolveAuthenticatedStaff } from "@/utils/resolve-current-staff";
import { logStaffActivity } from "@/utils/staff-activity-logger";
import { X, Plus, Trash2, CheckCircle2, FileText, Briefcase } from "lucide-react";

interface CommercialModalsProps {
  openModal: "sale" | "invoice" | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CommercialActionModals({ openModal, onClose, onSuccess }: CommercialModalsProps) {
  const supabase = createClient();
  const [me, setMe] = React.useState<any>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  const [projectForm, setProjectForm] = React.useState({
    project_title: "",
    service_category: STUDIO_SERVICE_CATEGORIES[0] || "Stage, Lighting & LED Screen Rental",
    custom_service_category: "",
    client_name: "",
    organization: "",
    client_email: "",
    contract_value: "",
    amount_paid: "",
    status: "ongoing" as "ongoing" | "pending" | "completed",
  });

  const [invoiceForm, setInvoiceForm] = React.useState({
    client_name: "",
    organization: "",
    client_email: "",
    client_phone: "",
    project_title: "",
    service_category: STUDIO_SERVICE_CATEGORIES[0] || "Corporate Identity & Brand Design",
    custom_service_category: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    include_vat: false,
    discount: "0",
    notes: "",
  });

  const [lineItems, setLineItems] = React.useState<
    Array<{ description: string; quantity: number; unit_price: number }>
  >([{ description: "", quantity: 1, unit_price: 0 }]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        const user = authData?.user;
        const resolved = await Promise.resolve(
          (resolveAuthenticatedStaff as any)(user?.email || "", user?.user_metadata || {})
        );
        if (active && resolved) {
          setMe(resolved);
        }
      } catch (_) {}
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!openModal) return null;

  const insertWithColumnFallback = async (tableName: string, initialPayload: Record<string, any>) => {
    let payload = { ...initialPayload };
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data, error } = await supabase.from(tableName).insert(payload).select("*").single();
      if (!error && data) return { data, error: null };
      const msg = String(error?.message || "");
      const colMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
      if (colMatch && colMatch[1] && colMatch[1] in payload) {
        delete payload[colMatch[1]];
        continue;
      }
      return { data: null, error };
    }
    return { data: null, error: new Error("Insert retries exceeded") };
  };

  const handleRecordProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.project_title.trim()) return;
    setSubmitting(true);
    setNotice("");

    try {
      const finalCategory =
        projectForm.service_category === "Other (Specify Custom Service)"
          ? projectForm.custom_service_category.trim() || "Custom Studio Service"
          : projectForm.service_category;

      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const projectCode = `LS/PRJ/${randomDigits}`;
      const contractVal = Number(String(projectForm.contract_value || 0).replace(/[^0-9.-]+/g, ""));
      const paidVal = Number(String(projectForm.amount_paid || 0).replace(/[^0-9.-]+/g, ""));

      const payload: Record<string, any> = {
        project_code: projectCode,
        project_title: projectForm.project_title.trim(),
        title: projectForm.project_title.trim(),
        service_category: finalCategory,
        category: finalCategory,
        client_name: projectForm.client_name.trim(),
        organization: projectForm.organization.trim() || projectForm.client_name.trim(),
        client_email: projectForm.client_email.trim(),
        contract_value: contractVal,
        project_value: contractVal,
        amount_paid: paidVal,
        status: projectForm.status,
        project_status: projectForm.status,
        recorded_by_name: me?.full_name || "Support Staff",
        recorded_by_code: me?.staff_id || "LS-STAFF",
      };

      const candidateTables = ["projects_sales", "finance_projects", "projects", "sales_records"];
      let savedRecord: any = null;
      for (const tbl of candidateTables) {
        const { data } = await insertWithColumnFallback(tbl, payload);
        if (data && !savedRecord) savedRecord = data;
      }

      if (paidVal > 0) {
        const rctCode = `LS/RCT/${Math.floor(1000 + Math.random() * 9000)}`;
        const rctPayload = {
          receipt_no: rctCode,
          receipt_code: rctCode,
          organization: projectForm.organization.trim() || projectForm.client_name.trim(),
          client_name: projectForm.client_name.trim(),
          project_description: projectForm.project_title.trim(),
          service_category: finalCategory,
          contract_total: contractVal,
          amount_received: paidVal,
          balance_due: Math.max(0, contractVal - paidVal),
          issued_by: me?.full_name || "Support Staff",
        };
        for (const rTbl of ["receipts", "client_receipts", "finance_receipts"]) {
          await insertWithColumnFallback(rTbl, rctPayload);
        }
      }

      await logStaffActivity({
        staff_name: me?.full_name || "Support Staff",
        staff_code: me?.staff_id || "LS-STAFF",
        department: me?.department || "Client Relations & Support",
        action_type: "RECORDED_SALE",
        module: "Projects & Sales",
        description: `Recorded project "${projectForm.project_title.trim()}" (${projectCode}) for ${projectForm.client_name.trim() || projectForm.organization.trim()} — Value: ₦${contractVal.toLocaleString()}`,
        reference_code: projectCode,
      });

      setNotice(`Project ${projectCode} recorded and synced to Finance Desk!`);
      setTimeout(() => {
        setSubmitting(false);
        setNotice("");
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err: any) {
      setNotice(err?.message || "Failed to record project.");
      setSubmitting(false);
    }
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );
  const discountVal = Number(String(invoiceForm.discount || 0).replace(/[^0-9.-]+/g, ""));
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const vatAmount = invoiceForm.include_vat ? Math.round(taxableAmount * 0.075) : 0;
  const grandTotal = taxableAmount + vatAmount;

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.client_name.trim() && !invoiceForm.organization.trim()) return;
    setSubmitting(true);
    setNotice("");

    try {
      const finalCategory =
        invoiceForm.service_category === "Other (Specify Custom Service)"
          ? invoiceForm.custom_service_category.trim() || "Custom Studio Service"
          : invoiceForm.service_category;

      const now = new Date();
      const mmYY = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;
      const seq = String(Math.floor(10 + Math.random() * 89));
      const invoiceNo = `LS/INV/${mmYY}/${seq}`;

      const payload: Record<string, any> = {
        invoice_no: invoiceNo,
        invoice_code: invoiceNo,
        client_name: invoiceForm.client_name.trim() || invoiceForm.organization.trim(),
        organization: invoiceForm.organization.trim() || invoiceForm.client_name.trim(),
        client_email: invoiceForm.client_email.trim(),
        client_phone: invoiceForm.client_phone.trim(),
        project_title: invoiceForm.project_title.trim() || lineItems[0]?.description || "Studio Service",
        service_category: finalCategory,
        category: finalCategory,
        items: lineItems,
        line_items: lineItems,
        subtotal,
        discount: discountVal,
        vat_amount: vatAmount,
        include_vat: invoiceForm.include_vat,
        total_amount: grandTotal,
        amount: grandTotal,
        amount_paid: 0,
        status: "unpaid",
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes.trim(),
        issued_by_name: me?.full_name || "Support Staff",
        issued_by_code: me?.staff_id || "LS-STAFF",
      };

      for (const tbl of ["invoices", "client_invoices", "finance_invoices"]) {
        await insertWithColumnFallback(tbl, payload);
      }

      await logStaffActivity({
        staff_name: me?.full_name || "Support Staff",
        staff_code: me?.staff_id || "LS-STAFF",
        department: me?.department || "Client Relations & Support",
        action_type: "GENERATED_INVOICE",
        module: "Billing & Invoices",
        description: `Generated official invoice ${invoiceNo} for ${payload.organization} — Total: ₦${grandTotal.toLocaleString()}`,
        reference_code: invoiceNo,
      });

      setNotice(`Official Invoice ${invoiceNo} generated and synced to Finance Desk!`);
      setTimeout(() => {
        setSubmitting(false);
        setNotice("");
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err: any) {
      setNotice(err?.message || "Failed to generate invoice.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-6 sm:p-7 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/30 flex items-center justify-center text-[#c7cb2d]">
              {openModal === "sale" ? <Briefcase className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">
                {openModal === "sale" ? "Record Project" : "Generate Official Invoice"}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Synced directly with Studio Finance & Executive Ledger
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {openModal === "sale" ? (
          <form onSubmit={handleRecordProjectSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                PROJECT TITLE
              </label>
              <input
                type="text"
                required
                value={projectForm.project_title}
                onChange={(e) => setProjectForm((p) => ({ ...p, project_title: e.target.value }))}
                placeholder="e.g. Birthday Photo Backdrop / Exhibition Desk Fabrication"
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                SERVICE CATEGORY
              </label>
              <select
                value={projectForm.service_category}
                onChange={(e) => setProjectForm((p) => ({ ...p, service_category: e.target.value }))}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
              >
                {STUDIO_SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#111] text-white">
                    {cat}
                  </option>
                ))}
                <option value="Other (Specify Custom Service)" className="bg-[#111] text-[#c7cb2d]">
                  + Other (Specify Custom Service)
                </option>
              </select>
              {projectForm.service_category === "Other (Specify Custom Service)" && (
                <input
                  type="text"
                  required
                  value={projectForm.custom_service_category}
                  onChange={(e) =>
                    setProjectForm((p) => ({ ...p, custom_service_category: e.target.value }))
                  }
                  placeholder="Enter custom studio service category..."
                  className="mt-2 w-full bg-[var(--bg-main)] border border-[#c7cb2d]/60 rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  CLIENT NAME
                </label>
                <input
                  type="text"
                  required
                  value={projectForm.client_name}
                  onChange={(e) => setProjectForm((p) => ({ ...p, client_name: e.target.value }))}
                  placeholder="e.g. Dr Adepoju"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  ORGANIZATION
                </label>
                <input
                  type="text"
                  value={projectForm.organization}
                  onChange={(e) => setProjectForm((p) => ({ ...p, organization: e.target.value }))}
                  placeholder="e.g. Blockchain LAUTECH"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                CLIENT EMAIL
              </label>
              <input
                type="email"
                value={projectForm.client_email}
                onChange={(e) => setProjectForm((p) => ({ ...p, client_email: e.target.value }))}
                placeholder="client@organization.com"
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  PROJECT VALUE (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={projectForm.contract_value}
                  onChange={(e) => setProjectForm((p) => ({ ...p, contract_value: e.target.value }))}
                  placeholder="95000"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  AMOUNT PAID (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={projectForm.amount_paid}
                  onChange={(e) => setProjectForm((p) => ({ ...p, amount_paid: e.target.value }))}
                  placeholder="95000"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                PROJECT STATUS
              </label>
              <select
                value={projectForm.status}
                onChange={(e) =>
                  setProjectForm((p) => ({
                    ...p,
                    status: e.target.value as "ongoing" | "pending" | "completed",
                  }))
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase font-bold text-[#c7cb2d] focus:outline-none focus:border-[#c7cb2d]"
              >
                <option value="ongoing" className="bg-[#111] text-white">
                  ONGOING
                </option>
                <option value="pending" className="bg-[#111] text-white">
                  PENDING
                </option>
                <option value="completed" className="bg-[#111] text-white">
                  COMPLETED
                </option>
              </select>
            </div>

            {notice && (
              <div className="p-3 rounded-xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 flex items-center gap-2 text-xs font-mono text-[#c7cb2d]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-white text-black hover:bg-[#c7cb2d] font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Saving Project..." : "Save Project"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  CLIENT NAME
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.client_name}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, client_name: e.target.value }))}
                  placeholder="Contact Person"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  ORGANIZATION / COMPANY
                </label>
                <input
                  type="text"
                  value={invoiceForm.organization}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, organization: e.target.value }))}
                  placeholder="Organization Name"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  PROJECT / CAMPAIGN TITLE
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.project_title}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, project_title: e.target.value }))}
                  placeholder="e.g. Event Branding & Media Production"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  SERVICE CATEGORY
                </label>
                <select
                  value={invoiceForm.service_category}
                  onChange={(e) =>
                    setInvoiceForm((p) => ({ ...p, service_category: e.target.value }))
                  }
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                >
                  {STUDIO_SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#111] text-white">
                      {cat}
                    </option>
                  ))}
                  <option value="Other (Specify Custom Service)" className="bg-[#111] text-[#c7cb2d]">
                    + Other (Specify Custom Service)
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  CLIENT EMAIL
                </label>
                <input
                  type="email"
                  value={invoiceForm.client_email}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, client_email: e.target.value }))}
                  placeholder="billing@client.com"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  DUE DATE
                </label>
                <input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                  INVOICE LINE ITEMS
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setLineItems((prev) => [
                      ...prev,
                      { description: "", quantity: 1, unit_price: 0 },
                    ])
                  }
                  className="text-[10px] font-mono uppercase font-bold text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, description: e.target.value } : x
                          )
                        )
                      }
                      placeholder="Deliverable description..."
                      className="col-span-6 bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, quantity: Number(e.target.value || 1) } : x
                          )
                        )
                      }
                      placeholder="Qty"
                      className="col-span-2 bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-2.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.unit_price || ""}
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, unit_price: Number(e.target.value || 0) } : x
                          )
                        )
                      }
                      placeholder="Unit Price (₦)"
                      className="col-span-3 bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-2.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={lineItems.length <= 1}
                      onClick={() =>
                        setLineItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 flex items-center justify-center text-[var(--text-dim)] hover:text-red-400 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceForm.include_vat}
                  onChange={(e) =>
                    setInvoiceForm((p) => ({ ...p, include_vat: e.target.checked }))
                  }
                  className="accent-[#c7cb2d]"
                />
                <span>Include 7.5% VAT</span>
              </label>
              <div className="text-right font-mono text-xs">
                <span className="text-[var(--text-muted)] mr-2">Invoice Total:</span>
                <span className="text-sm font-bold text-[#c7cb2d]">
                  ₦{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {notice && (
              <div className="p-3 rounded-xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 flex items-center gap-2 text-xs font-mono text-[#c7cb2d]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-[#c7cb2d] text-black hover:brightness-110 font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Generating Invoice..." : "Generate Official Invoice"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
