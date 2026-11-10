"use client";

import * as React from "react";
import {
  VOUCHER_CATEGORIES,
  getVoucherStageMeta,
} from "@/utils/resolve-current-staff";
import { logStaffActivity } from "@/utils/staff-activity-logger";
import {
  Search,
  Calendar,
  MoreHorizontal,
  Edit3,
  MessageSquare,
  Copy,
  X,
  Send,
  FileText,
  Receipt,
  Wallet,
  CheckCircle2,
  Scale,
} from "lucide-react";

export interface VoucherComment {
  id: string;
  author_name: string;
  author_code: string;
  text: string;
  attachment_ref?: string;
  created_at: string;
}

export function extractVoucherComments(v: any): VoucherComment[] {
  if (!v) return [];
  if (Array.isArray(v.comments) && v.comments.length > 0) return v.comments;
  const raw = String(v.notes || v.description || "");
  const match = raw.match(/<!--VCH_COMMENTS:([sS]*?)-->/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }
  if (typeof window !== "undefined" && v.id) {
    try {
      const local = JSON.parse(
        window.localStorage.getItem(`lavie_vch_comments_${v.id}`) || "[]"
      );
      if (Array.isArray(local)) return local;
    } catch (_) {}
  }
  return [];
}

export function cleanVoucherNotes(v: any): string {
  const raw = String(v?.notes || v?.description || "");
  return raw.split("<!--VCH_COMMENTS:")[0].trim();
}

interface FilterState {
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  search: string;
}

export function filterVouchersList(vouchers: any[], filters: FilterState): any[] {
  return (vouchers || []).filter((v) => {
    if (filters.category && filters.category !== "ALL") {
      if (String(v.category || "") !== filters.category) return false;
    }
    if (filters.status && filters.status !== "ALL") {
      const meta = getVoucherStageMeta(v);
      if (filters.status === "PAID" && !meta.isDisbursedOutflow) return false;
      if (filters.status === "APPROVED" && meta.stage !== "approved_waiting") return false;
      if (filters.status === "PENDING" && meta.stage !== "pending") return false;
      if (filters.status === "REJECTED" && meta.stage !== "rejected") return false;
    }
    if (filters.startDate) {
      const vDate = new Date(v.created_at || v.date || 0).toISOString().slice(0, 10);
      if (vDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const vDate = new Date(v.created_at || v.date || 0).toISOString().slice(0, 10);
      if (vDate > filters.endDate) return false;
    }
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = `${v.title || ""} ${v.voucher_no || v.voucher_code || ""} ${v.staff_name || ""} ${v.category || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function VoucherSummaryAndFilterBar({
  vouchers,
  filters,
  setFilters,
}: {
  vouchers: any[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}) {
  const filtered = React.useMemo(
    () => filterVouchersList(vouchers, filters),
    [vouchers, filters]
  );

  const metrics = React.useMemo(() => {
    const toNum = (val: any) =>
      Number(String(val ?? 0).replace(/[^0-9.-]+/g, "")) || 0;

    const totalCount = filtered.length;
    const totalRaised = filtered.reduce((s, v) => s + toNum(v.amount), 0);
    const totalPaid = filtered
      .filter((v) => getVoucherStageMeta(v).isDisbursedOutflow)
      .reduce((s, v) => s + toNum(v.amount), 0);
    const totalBalance = totalRaised - totalPaid;

    return { totalCount, totalRaised, totalPaid, totalBalance };
  }, [filtered]);

  return (
    <div className="space-y-3.5 mb-4">
      {/* Top 5-Column Filter Bar (Matches Reference Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <select
          value={filters.category}
          onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
          className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
        >
          <option value="ALL">Filter with Category (All)</option>
          {VOUCHER_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
        >
          <option value="ALL">STATUS: ALL</option>
          <option value="PENDING">STATUS: PENDING APPROVAL</option>
          <option value="APPROVED">STATUS: AWAITING DISBURSEMENT</option>
          <option value="PAID">STATUS: PAID / DISBURSED</option>
          <option value="REJECTED">STATUS: REJECTED</option>
        </select>

        <div className="relative">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
            title="Start Date"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
            title="End Date"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
          />
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search Vouchers..."
            className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl pl-3 pr-8 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
          />
        </div>
      </div>

      {/* 4-Card Summary Strip (Total Vouchers | Total Raised Voucher | Total Payment Made | Total Balance) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center justify-center text-[var(--text-muted)] shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
              Total Vouchers
            </p>
            <p className="font-display text-base font-bold text-[var(--text-primary)]">
              {metrics.totalCount}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center justify-center text-amber-300 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
              Total Raised Voucher
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
              ₦{metrics.totalRaised.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/30 flex items-center justify-center text-[#c7cb2d] shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
              Total Payment Made
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-[#c7cb2d] truncate">
              ₦{metrics.totalPaid.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center justify-center text-sky-300 shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
              Total Balance
            </p>
            <p className="font-mono text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
              {metrics.totalBalance < 0 ? "-" : ""}₦{Math.abs(metrics.totalBalance).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoucherRowActionsMenu({
  voucher,
  onViewEdit,
  onOpenComments,
  onReuse,
}: {
  voucher: any;
  onViewEdit: (v: any) => void;
  onOpenComments: (v: any) => void;
  onReuse: (v: any) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const commentsCount = extractVoucherComments(voucher).length;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        title="Voucher Options"
        className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[var(--text-primary)] flex items-center gap-1 text-xs font-mono cursor-pointer transition"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
        {commentsCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-[#c7cb2d] text-black text-[9px] font-bold">
            {commentsCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-[#141414] border border-[var(--border-subtle)] shadow-2xl py-1.5 z-40 text-xs">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onViewEdit(voucher);
            }}
            className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/5 text-[var(--text-primary)] cursor-pointer transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#c7cb2d]" />
            <span>View/Edit Voucher</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenComments(voucher);
            }}
            className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-white/5 text-[var(--text-primary)] cursor-pointer transition"
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Comment</span>
            </span>
            {commentsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
                {commentsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReuse(voucher);
            }}
            className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/5 text-[var(--text-primary)] cursor-pointer transition"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-use</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function VoucherActionModals({
  activeVoucher,
  modalMode,
  currentUser,
  onClose,
  onVoucherUpdated,
}: {
  activeVoucher: any | null;
  modalMode: "comments" | "edit" | null;
  currentUser?: { full_name?: string; staff_id?: string; department?: string } | null;
  onClose: () => void;
  onVoucherUpdated: (updated: any) => void;
}) {
  const [commentText, setCommentText] = React.useState("");
  const [attachmentNote, setAttachmentNote] = React.useState("");
  const [showAttachInput, setShowAttachInput] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [localComments, setLocalComments] = React.useState<VoucherComment[]>([]);

  const [editForm, setEditForm] = React.useState({
    title: "",
    category: VOUCHER_CATEGORIES[0] || "Marketing & Advertising",
    amount: "",
    payment_method: "Bank Transfer",
    notes: "",
  });

  React.useEffect(() => {
    if (activeVoucher) {
      setLocalComments(extractVoucherComments(activeVoucher));
      setEditForm({
        title: activeVoucher.title || "",
        category: activeVoucher.category || VOUCHER_CATEGORIES[0],
        amount: String(activeVoucher.amount || ""),
        payment_method: activeVoucher.payment_method || "Bank Transfer",
        notes: cleanVoucherNotes(activeVoucher),
      });
    }
  }, [activeVoucher]);

  if (!activeVoucher || !modalMode) return null;

  const isLocked = getVoucherStageMeta(activeVoucher).isDisbursedOutflow;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);

    const newComment: VoucherComment = {
      id: `cmt-${Date.now()}`,
      author_name: currentUser?.full_name || "Studio Staff",
      author_code: currentUser?.staff_id || "LS-01",
      text: commentText.trim(),
      attachment_ref: attachmentNote.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    const nextComments = [...localComments, newComment];
    setLocalComments(nextComments);
    setCommentText("");
    setAttachmentNote("");
    setShowAttachInput(false);

    if (typeof window !== "undefined" && activeVoucher.id) {
      try {
        window.localStorage.setItem(
          `lavie_vch_comments_${activeVoucher.id}`,
          JSON.stringify(nextComments)
        );
      } catch (_) {}
    }

    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeVoucher.id,
          action: "add_comment",
          comment: newComment,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.data) {
        onVoucherUpdated({ ...json.data, comments: nextComments });
      } else {
        onVoucherUpdated({ ...activeVoucher, comments: nextComments });
      }

      await logStaffActivity({
        staff_name: currentUser?.full_name || "Studio Staff",
        staff_code: currentUser?.staff_id || "LS-01",
        department: currentUser?.department || "Finance & Operations",
        action_type: "COMMENTED_VOUCHER",
        module: "Expenses & Vouchers",
        description: `Commented on voucher "${activeVoucher.title}": "${newComment.text.slice(0, 60)}"`,
        reference_code: activeVoucher.voucher_no || activeVoucher.voucher_code || "",
      });
    } catch (_) {
      onVoucherUpdated({ ...activeVoucher, comments: nextComments });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    setSubmitting(true);

    try {
      const cleanAmt = Number(String(editForm.amount || 0).replace(/[^0-9.-]+/g, ""));
      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeVoucher.id,
          title: editForm.title.trim(),
          category: editForm.category,
          amount: cleanAmt,
          payment_method: editForm.payment_method,
          notes: editForm.notes.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json?.data) {
        onVoucherUpdated(json.data);
      } else {
        onVoucherUpdated({
          ...activeVoucher,
          title: editForm.title.trim(),
          category: editForm.category,
          amount: cleanAmt,
          payment_method: editForm.payment_method,
          notes: editForm.notes.trim(),
        });
      }

      await logStaffActivity({
        staff_name: currentUser?.full_name || "Studio Staff",
        staff_code: currentUser?.staff_id || "LS-01",
        department: currentUser?.department || "Finance & Operations",
        action_type: "UPDATED_VOUCHER",
        module: "Expenses & Vouchers",
        description: `Updated voucher "${editForm.title.trim()}" (₦${cleanAmt.toLocaleString()})`,
        reference_code: activeVoucher.voucher_no || activeVoucher.voucher_code || "",
      });

      onClose();
    } catch (_) {
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {modalMode === "comments" ? (
        /* VOUCHER COMMENTS MODAL (Inspired by Reference Screenshot 34) */
        <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5">
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)]/60 pb-4">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
                Voucher Comments
              </h3>
              <p className="text-xs font-mono uppercase text-[#c7cb2d]">
                {activeVoucher.title} (₦{Number(activeVoucher.amount || 0).toLocaleString()}.00)
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comments List or Empty State */}
          <div className="min-h-[190px] max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {localComments.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--text-muted)] space-y-2">
                <MessageSquare className="w-9 h-9 stroke-[1.5] opacity-40" />
                <p className="text-sm font-medium">No Comment yet</p>
                <p className="text-[11px] text-[var(--text-dim)]">
                  Start an approval or clarification thread on this voucher
                </p>
              </div>
            ) : (
              localComments.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-[#c7cb2d]">
                      {c.author_name} ({c.author_code})
                    </span>
                    <span className="text-[var(--text-dim)]">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">{c.text}</p>
                  {c.attachment_ref && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[10px] font-mono text-sky-300">
                      <FileText className="w-3 h-3" />
                      <span>Ref: {c.attachment_ref}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Attachment Reference Input (Toggled by Document Icon) */}
          {showAttachInput && (
            <div>
              <input
                type="text"
                value={attachmentNote}
                onChange={(e) => setAttachmentNote(e.target.value)}
                placeholder="Paste receipt URL, invoice number, or proforma ref..."
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
              />
            </div>
          )}

          {/* Write a comment bar (Matches Reference Screenshot 34) */}
          <form
            onSubmit={handleSendComment}
            className="flex items-center gap-2 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/80 focus-within:border-[#c7cb2d] px-3.5 py-2"
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowAttachInput((p) => !p)}
              title="Attach Receipt / Document Reference"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                showAttachInput || attachmentNote
                  ? "text-[#c7cb2d] bg-[#c7cb2d]/10"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              title="Send Comment"
              className="p-1.5 rounded-lg text-[#c7cb2d] hover:bg-[#c7cb2d]/15 disabled:opacity-40 cursor-pointer transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* VIEW / EDIT VOUCHER MODAL */
        <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/60 pb-3.5">
            <div>
              <h3 className="font-display text-lg font-bold">
                {isLocked ? "Voucher Particulars (Disbursed)" : "View / Edit Voucher"}
              </h3>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                {activeVoucher.voucher_no || activeVoucher.voucher_code || "LV-VCH"} •{" "}
                {getVoucherStageMeta(activeVoucher).approvalSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                PARTICULARS / VOUCHER TITLE
              </label>
              <input
                type="text"
                required
                disabled={isLocked}
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                CATEGORY
              </label>
              <select
                disabled={isLocked}
                value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60"
              >
                {VOUCHER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  TOTAL PRICE (₦)
                </label>
                <input
                  type="number"
                  required
                  disabled={isLocked}
                  value={editForm.amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  PAYMENT METHOD
                </label>
                <select
                  disabled={isLocked}
                  value={editForm.payment_method}
                  onChange={(e) => setEditForm((p) => ({ ...p, payment_method: e.target.value }))}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Corporate Card">Corporate Card</option>
                  <option value="Petty Cash">Petty Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                NOTES / VENDOR DETAILS
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Additional breakdown, vendor bank details, or project reference..."
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60"
              />
            </div>

            {!isLocked && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
              >
                {submitting ? "Saving Changes..." : "Save Voucher Changes"}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
