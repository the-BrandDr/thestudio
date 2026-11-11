"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  VOUCHER_CATEGORIES,
  getVoucherStageMeta,
  getStaffApprovalLevel,
  ApprovalRoleTier,
} from "@/utils/resolve-current-staff";
import { logStaffActivity } from "@/utils/staff-activity-logger";
import { triggerPushNotification } from "@/utils/push-notifications";
import {
  Search,
  MoreHorizontal,
  Edit3,
  MessageSquare,
  Copy,
  Printer,
  X,
  Send,
  Paperclip,
  FileText,
  Receipt,
  Wallet,
  CheckCircle2,
  Scale,
  Check,
  Ban,
  Plus,
} from "lucide-react";

export interface VoucherComment {
  id: string;
  author_name: string;
  author_code: string;
  text: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_ref?: string;
  created_at: string;
}

function normalizeComment(raw: any, idx: number): VoucherComment {
  const authorStr = String(raw?.author_name || raw?.author || "Studio Staff");
  const codeMatch = authorStr.match(/\(([^)]+)\)/);
  const cleanName = authorStr.replace(/\s*\([^)]+\)/, "").trim() || "Studio Staff";
  const cleanCode = raw?.author_code || (codeMatch ? codeMatch[1] : "STAFF");

  return {
    id: String(raw?.id || "cmt-" + idx + "-" + String(raw?.created_at || raw?.at || idx)),
    author_name: cleanName,
    author_code: cleanCode,
    text: String(raw?.text || ""),
    attachment_url: raw?.attachment_url || undefined,
    attachment_name: raw?.attachment_name || undefined,
    attachment_ref: raw?.attachment_ref || undefined,
    created_at: raw?.created_at || raw?.at || new Date().toISOString(),
  };
}

export function extractVoucherComments(v: any): VoucherComment[] {
  if (!v) return [];
  if (Array.isArray(v.comments) && v.comments.length > 0) {
    return v.comments.map((c: any, i: number) => normalizeComment(c, i));
  }
  const raw = String(v.notes || v.description || "");
  const match = raw.match(/<!--VCH_COMMENTS:([\s\S]*?)-->/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        return parsed.map((c: any, i: number) => normalizeComment(c, i));
      }
    } catch (_) {}
  }
  return [];
}

export function cleanVoucherNotes(v: any): string {
  const raw = String(v?.notes || v?.description || "");
  return raw.split("<!--VCH_COMMENTS:")[0].trim();
}

export function printVoucherOfficialPDF(v: any) {
  if (typeof window === "undefined" || !v) return;
  const meta = getVoucherStageMeta(v);
  const comments = extractVoucherComments(v);
  const cleanNotes = cleanVoucherNotes(v);
  const code = v.voucher_no || v.voucher_code || ("LV-VCH-" + String(v.id || "").slice(0, 6).toUpperCase());
  const amountNum = Number(String(v.amount || 0).replace(/[^0-9.-]+/g, ""));
  const createdDate = v.created_at
    ? new Date(v.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-NG");

  const lvl1 = String(v.strategist_status || (meta.isDirectExpense ? "approved" : "pending")).toUpperCase();
  const lvl2 = String(v.ops_status || (meta.isDirectExpense ? "approved" : "pending")).toUpperCase();
  const lvl3 = String(v.finance_status || (meta.isDirectExpense ? "approved" : "pending")).toUpperCase();
  const disbursed = meta.isDisbursedOutflow ? "PAID / COMPLETED" : "UNPAID";

  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;

  const html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>Payment Voucher - " + code + "</title>" +
    "<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#111;background:#fff;padding:40px;line-height:1.5}.sheet{max-width:780px;margin:0 auto;border:2px solid #111;border-radius:16px;padding:32px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:24px}.brand h1{font-size:22px;font-weight:900;text-transform:uppercase}.brand p{font-size:11px;color:#555;margin-top:2px}.doc-badge{text-align:right}.doc-badge .tag{display:inline-block;background:#111;color:#c7cb2d;font-family:monospace;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;text-transform:uppercase}.doc-badge .code{font-family:monospace;font-size:16px;font-weight:800;margin-top:6px}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;background:#f7f7f5;border:1px solid #ddd;border-radius:12px;padding:16px;margin-bottom:24px}.meta-item label{display:block;font-size:10px;font-family:monospace;text-transform:uppercase;color:#666}.meta-item span{font-size:13px;font-weight:700;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#111;color:#fff;text-align:left;font-size:11px;font-family:monospace;text-transform:uppercase;padding:10px 14px}td{border-bottom:1px solid #ddd;padding:14px;font-size:13px}.amount-box{display:flex;justify-content:space-between;align-items:center;background:#111;color:#fff;padding:16px 20px;border-radius:12px;margin-bottom:24px}.amount-box .lbl{font-family:monospace;font-size:12px;text-transform:uppercase;color:#ccc}.amount-box .val{font-family:monospace;font-size:22px;font-weight:900;color:#c7cb2d}.approvals{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}.sig-card{border:1px solid #ccc;border-radius:10px;padding:12px;text-align:center}.sig-card .tier{font-size:10px;font-family:monospace;text-transform:uppercase;color:#666}.sig-card .role{font-size:12px;font-weight:800;margin:4px 0 8px}.sig-card .stamp{display:inline-block;padding:3px 8px;border-radius:4px;font-family:monospace;font-size:10px;font-weight:800;border:1px solid #111}.notes{border:1px dashed #bbb;border-radius:10px;padding:12px 16px;font-size:12px;margin-bottom:16px}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;font-family:monospace;color:#777}@media print{body{padding:0}}</style></head><body>" +
    "<div class=\"sheet\"><div class=\"header\"><div class=\"brand\"><h1>Lavie Studios Ltd</h1><p>Corporate Identity • Event Scenography • Craft Fabrication • Advertising</p></div><div class=\"doc-badge\"><div class=\"tag\">Official Payment Voucher</div><div class=\"code\">" + code + "</div></div></div>" +
    "<div class=\"meta-grid\"><div class=\"meta-item\"><label>Raised By</label><span>" + String(v.staff_name || "Studio Staff").replace(/^\[DIRECT\]\s*/, "") + " (" + (v.staff_code || "LS-STAFF") + ")</span></div><div class=\"meta-item\"><label>Date</label><span>" + createdDate + "</span></div><div class=\"meta-item\"><label>Payment Channel</label><span>" + (v.payment_method || "Bank Transfer") + "</span></div><div class=\"meta-item\"><label>Category</label><span>" + (v.category || "Operations") + "</span></div><div class=\"meta-item\"><label>Department</label><span>" + (v.department || "Studio Operations") + "</span></div><div class=\"meta-item\"><label>Status</label><span>" + disbursed + "</span></div></div>" +
    "<table><thead><tr><th>Particulars</th><th>Category</th><th style=\"text-align:right;\">Total Price (₦)</th></tr></thead><tbody><tr><td><strong>" + (v.title || "Expense Voucher") + "</strong></td><td>" + (v.category || "General") + "</td><td style=\"text-align:right;font-family:monospace;font-weight:700;\">₦" + amountNum.toLocaleString() + ".00</td></tr></tbody></table>" +
    (cleanNotes ? "<div class=\"notes\"><strong>Notes:</strong><br/>" + cleanNotes + "</div>" : "") +
    "<div class=\"amount-box\"><span class=\"lbl\">Total Authorized Sum</span><span class=\"val\">₦" + amountNum.toLocaleString() + ".00</span></div>" +
    "<div class=\"approvals\"><div class=\"sig-card\"><div class=\"tier\">Level 1</div><div class=\"role\">CEO</div><span class=\"stamp\">" + lvl1 + "</span></div><div class=\"sig-card\"><div class=\"tier\">Level 2</div><div class=\"role\">Head of Ops</div><span class=\"stamp\">" + lvl2 + "</span></div><div class=\"sig-card\"><div class=\"tier\">Level 3</div><div class=\"role\">Head of Finance</div><span class=\"stamp\">" + lvl3 + "</span></div><div class=\"sig-card\"><div class=\"tier\">Settlement</div><div class=\"role\">Disbursement</div><span class=\"stamp\">" + disbursed + "</span></div></div>" +
    (comments.length > 0 ? "<div class=\"notes\"><strong>Comments (" + comments.length + "):</strong><br/>" + comments.map((c) => "<div>• <strong>" + c.author_name + ":</strong> " + c.text + "</div>").join("") + "</div>" : "") +
    "<div class=\"footer\"><span>Lavie Studios Enterprise Workspace</span><span>Printed: " + new Date().toLocaleString("en-NG") + "</span></div></div>" +
    "<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script></body></html>";

  win.document.open();
  win.document.write(html);
  win.document.close();
}

export interface FilterState {
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  search: string;
  onlyNeedsMyAttention?: boolean;
}

export function doesVoucherNeedUserAttention(v: any, userTier: ApprovalRoleTier): boolean {
  const meta = getVoucherStageMeta(v);
  if (meta.isDirectExpense || meta.stage === "disbursed" || meta.stage === "rejected") {
    return false;
  }
  const curLevel = (meta as any).currentLevel ?? 1;
  if (userTier === "level1_ceo" && curLevel === 1) return true;
  if (userTier === "level2_ops" && curLevel === 2) return true;
  if (userTier === "level3_finance" && (curLevel === 3 || meta.stage === "approved_waiting")) return true;
  return false;
}

export function filterVouchersList(vouchers: any[], filters: FilterState, currentUser?: any): any[] {
  const userTier = typeof getStaffApprovalLevel === "function" ? getStaffApprovalLevel(currentUser) : "staff";
  return (vouchers || []).filter((v) => {
    if (filters?.onlyNeedsMyAttention) {
      if (!doesVoucherNeedUserAttention(v, userTier)) return false;
    }
    if (filters?.category && filters.category !== "ALL") {
      if (String(v.category || "") !== filters.category) return false;
    }
    if (filters?.status && filters.status !== "ALL") {
      const meta = getVoucherStageMeta(v);
      if (filters.status === "NEEDS_ATTENTION" && !doesVoucherNeedUserAttention(v, userTier)) return false;
      if (filters.status === "PAID" && !meta.isDisbursedOutflow) return false;
      if (filters.status === "APPROVED" && meta.stage !== "approved_waiting") return false;
      if (filters.status === "PENDING" && meta.stage !== "pending") return false;
      if (filters.status === "REJECTED" && meta.stage !== "rejected") return false;
    }
    if (filters?.startDate) {
      const vDate = new Date(v.created_at || v.date || 0).toISOString().slice(0, 10);
      if (vDate < filters.startDate) return false;
    }
    if (filters?.endDate) {
      const vDate = new Date(v.created_at || v.date || 0).toISOString().slice(0, 10);
      if (vDate > filters.endDate) return false;
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = (String(v.title || "") + " " + String(v.voucher_no || v.voucher_code || "") + " " + String(v.staff_name || "") + " " + String(v.category || "")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function VoucherSummaryAndFilterBar({
  vouchers,
  filters,
  setFilters,
  currentUser,
  showAttentionFilter = false,
}: {
  vouchers: any[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  currentUser?: any;
  showAttentionFilter?: boolean;
}) {
  const userTier: ApprovalRoleTier = typeof getStaffApprovalLevel === "function" ? getStaffApprovalLevel(currentUser) : "staff";
  const attentionCount = React.useMemo(
    () => (vouchers || []).filter((v) => doesVoucherNeedUserAttention(v, userTier)).length,
    [vouchers, userTier]
  );
  const filtered = React.useMemo(
    () => filterVouchersList(vouchers, filters, currentUser),
    [vouchers, filters, currentUser]
  );
  const metrics = React.useMemo(() => {
    const toNum = (val: any) => Number(String(val ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
    const totalCount = filtered.length;
    const totalRaised = filtered.reduce((s, v) => s + toNum(v.amount), 0);
    const totalPaid = filtered.filter((v) => getVoucherStageMeta(v).isDisbursedOutflow).reduce((s, v) => s + toNum(v.amount), 0);
    const totalBalance = totalRaised - totalPaid;
    return { totalCount, totalRaised, totalPaid, totalBalance };
  }, [filtered]);

  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))} className="bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]">
          <option value="ALL">Filter with Category</option>
          {VOUCHER_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]">
          <option value="ALL">STATUS: ALL</option>
          {showAttentionFilter && userTier !== "staff" && (<option value="NEEDS_ATTENTION">NEEDS MY APPROVAL ({attentionCount})</option>)}
          <option value="PENDING">STATUS: PENDING</option>
          <option value="APPROVED">STATUS: APPROVED</option>
          <option value="PAID">STATUS: PAID</option>
          <option value="REJECTED">STATUS: REJECTED</option>
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} title="Start Date" className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} title="End Date" className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]" />
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search Vouchers" className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 rounded-xl pl-3 pr-8 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 flex items-center justify-center text-[var(--text-muted)] shrink-0"><Receipt className="w-4 h-4" /></div>
          <div><p className="text-[11px] text-[var(--text-muted)]">Total Vouchers</p><p className="font-display text-lg font-bold text-[var(--text-primary)]">{metrics.totalCount}</p></div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 flex items-center justify-center text-amber-300 shrink-0"><Wallet className="w-4 h-4" /></div>
          <div><p className="text-[11px] text-[var(--text-muted)]">Total Raised Voucher</p><p className="font-mono text-base font-bold text-[var(--text-primary)]">₦{metrics.totalRaised.toLocaleString()}.00</p></div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/30 flex items-center justify-center text-[#c7cb2d] shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
          <div><p className="text-[11px] text-[var(--text-muted)]">Total Payment Made</p><p className="font-mono text-base font-bold text-[#c7cb2d]">₦{metrics.totalPaid.toLocaleString()}.00</p></div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 flex items-center justify-center text-sky-300 shrink-0"><Scale className="w-4 h-4" /></div>
          <div><p className="text-[11px] text-[var(--text-muted)]">Total Balance</p><p className="font-mono text-base font-bold text-[var(--text-primary)]">{metrics.totalBalance < 0 ? "-" : ""}₦{Math.abs(metrics.totalBalance).toLocaleString()}.00</p></div>
        </div>
      </div>
    </div>
  );
}

export function VoucherLevelActionButtons({
  voucher,
  currentUser,
  pageContext,
  onVoucherUpdated,
}: {
  voucher: any;
  currentUser?: any;
  pageContext?: "ceo_overview" | "ops_hr" | "finance_desk" | "staff_space";
  onVoucherUpdated: (updated: any) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const meta = getVoucherStageMeta(voucher);
  const curLevel = (meta as any).currentLevel ?? 1;

  if (pageContext === "staff_space" || meta.isDirectExpense || meta.stage === "disbursed" || meta.stage === "rejected") {
    return null;
  }

  let userTier: ApprovalRoleTier = typeof getStaffApprovalLevel === "function" ? getStaffApprovalLevel(currentUser) : "staff";
  if (userTier === "staff" && pageContext === "finance_desk") {
    userTier = curLevel === 1 ? "level1_ceo" : curLevel === 2 ? "level2_ops" : "level3_finance";
  }

  const handleDecision = async (decision: "accept" | "reject" | "disburse") => {
    if (busy) return;
    let rejectionReason = "";
    if (decision === "reject") {
      const input = window.prompt("Reason for rejecting this voucher (will be logged in comments):", "Budget / supporting document review required");
      if (input === null) return;
      rejectionReason = input.trim() || "Rejected";
    }

    setBusy(true);
    try {
      let updates: Record<string, any> = {};
      if (decision === "disburse") {
        if (!meta.canDisburse) { setBusy(false); return; }
        updates = { status: "disbursed" };
      } else if (userTier === "level1_ceo" && curLevel === 1) {
        updates = { strategist_status: decision === "accept" ? "approved" : "rejected", status: decision === "reject" ? "rejected" : "pending" };
      } else if (userTier === "level2_ops" && curLevel === 2) {
        updates = { ops_status: decision === "accept" ? "approved" : "rejected", status: decision === "reject" ? "rejected" : "pending" };
      } else if (userTier === "level3_finance" && curLevel === 3) {
        updates = { finance_status: decision === "accept" ? "approved" : "rejected", status: decision === "accept" ? "approved" : "rejected" };
      } else {
        setBusy(false); return;
      }

      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: voucher.id, ...updates }),
      });
      const json = await res.json();
      const updatedRow = res.ok && json?.data ? json.data : { ...voucher, ...updates };

      if (decision === "reject" && rejectionReason) {
        const rejectComment: VoucherComment = {
          id: "cmt-" + Date.now(),
          author_name: currentUser?.full_name || "Executive Approver",
          author_code: currentUser?.staff_id || "LS-EXEC",
          text: "[REJECTED]: " + rejectionReason,
          created_at: new Date().toISOString(),
        };
        await fetch("/api/admin/vouchers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: voucher.id, action: "add_comment", comment: rejectComment }),
        }).catch(() => {});
      }

      await logStaffActivity({
        staff_name: currentUser?.full_name || "Executive Approver",
        staff_code: currentUser?.staff_id || "LS-EXEC",
        department: currentUser?.department || "Finance & Executive",
        action_type: decision === "disburse" ? "DISBURSED_VOUCHER" : decision === "accept" ? "APPROVED_VOUCHER" : "REJECTED_VOUCHER",
        module: "Expenses & Vouchers",
        description: (decision === "disburse" ? "Disbursed" : decision === "accept" ? "Approved" : "Rejected") + " voucher \"" + voucher.title + "\"",
        reference_code: voucher.voucher_no || voucher.voucher_code || "",
      });

      // Trigger active Push Notifications to requester & next approver level
      const vCode = voucher.voucher_no || voucher.voucher_code || "LV-VCH";
      const amtStr = "₦" + Number(voucher.amount || 0).toLocaleString();
      if (decision === "disburse") {
        triggerPushNotification({
          title: "💸 Voucher Disbursed — " + vCode,
          message: "Your voucher \"" + voucher.title + "\" (" + amtStr + ") has been disbursed by Finance.",
          url: "https://studioslavie.com/admin",
          targetType: voucher.staff_code ? "staff_codes" : "all_staff",
          staffCodes: voucher.staff_code ? [voucher.staff_code] : undefined,
        });
      } else if (decision === "reject") {
        triggerPushNotification({
          title: "⚠️ Voucher Rejected — " + vCode,
          message: "Voucher \"" + voucher.title + "\" was declined: " + rejectionReason,
          url: "https://studioslavie.com/admin",
          targetType: voucher.staff_code ? "staff_codes" : "all_staff",
          staffCodes: voucher.staff_code ? [voucher.staff_code] : undefined,
        });
      } else if (decision === "accept") {
        const nextStageMsg =
          curLevel === 1
            ? "Approved by CEO (Level 1). Now awaiting Head of Operations (Level 2)."
            : curLevel === 2
            ? "Approved by Head of Ops (Level 2). Now awaiting Head of Finance (Level 3)."
            : "Approved by Finance (Level 3). Ready for payout disbursement.";
        triggerPushNotification({
          title: "✅ Voucher Level " + curLevel + " Approved — " + vCode,
          message: "\"" + voucher.title + "\" (" + amtStr + "): " + nextStageMsg,
          url: "https://studioslavie.com/admin/finance?tab=vouchers",
          targetType: "all_staff",
        });
      }
      onVoucherUpdated(updatedRow);
    } catch (_) {
    } finally {
      setBusy(false);
    }
  };

  if (meta.stage === "approved_waiting" && meta.canDisburse) {
    if (userTier === "level3_finance" || pageContext === "finance_desk") {
      return (
        <button type="button" disabled={busy} onClick={() => handleDecision("disburse")} className="px-3 py-1 rounded-lg bg-[#c7cb2d] text-black text-[10px] font-mono uppercase font-bold hover:brightness-110 transition cursor-pointer disabled:opacity-50">
          {busy ? "..." : "Mark Disbursed"}
        </button>
      );
    }
    return null;
  }

  const isMyTurn = (userTier === "level1_ceo" && curLevel === 1) || (userTier === "level2_ops" && curLevel === 2) || (userTier === "level3_finance" && curLevel === 3);
  if (!isMyTurn) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={busy} onClick={() => handleDecision("accept")} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50">
        <Check className="w-3 h-3" /><span>Accept</span>
      </button>
      <button type="button" disabled={busy} onClick={() => handleDecision("reject")} className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500 hover:text-white text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50">
        <Ban className="w-3 h-3" /><span>Reject</span>
      </button>
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
  const [openUpward, setOpenUpward] = React.useState(false);
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

  const handleToggle = () => {
    if (!open && menuRef.current && typeof window !== "undefined") {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 220);
    }
    setOpen((p) => !p);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Options"
        className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 hover:border-[#c7cb2d] text-[var(--text-primary)] flex items-center gap-1 text-xs font-mono cursor-pointer transition"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
        {commentsCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-[#c7cb2d] text-black text-[9px] font-bold">
            {commentsCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className={
            "absolute right-0 w-52 rounded-2xl bg-[#141414] border border-[var(--border-subtle)] shadow-2xl py-1.5 z-[100] text-xs " +
            (openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5")
          }
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onViewEdit(voucher); }}
            className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/5 text-[var(--text-primary)] cursor-pointer transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#c7cb2d]" /><span>View/Edit Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onOpenComments(voucher); }}
            className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-white/5 text-[var(--text-primary)] cursor-pointer transition"
          >
            <span className="flex items-center gap-2.5"><MessageSquare className="w-3.5 h-3.5 text-sky-400" /><span>Comment</span></span>
            {commentsCount > 0 && (<span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">{commentsCount}</span>)}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onReuse(voucher); }}
            className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/5 text-[var(--text-primary)] cursor-pointer transition"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" /><span>Re-use</span>
          </button>
          <div className="my-1 border-t border-[var(--border-subtle)]/40" />
          <button
            type="button"
            onClick={() => { setOpen(false); printVoucherOfficialPDF(voucher); }}
            className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/5 text-[#c7cb2d] font-medium cursor-pointer transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#c7cb2d]" /><span>Print / Export Voucher PDF</span>
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
  currentUser?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    staff_id?: string;
    department?: string;
  } | null;
  onClose: () => void;
  onVoucherUpdated: (updated: any) => void;
}) {
  const supabase = createClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = React.useState("");
  const [attachedFile, setAttachedFile] = React.useState<{ url: string; name: string; type: string } | null>(null);
  const [uploadingFile, setUploadingFile] = React.useState(false);
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
      setAttachedFile(null);
      setCommentText("");
    }
  }, [activeVoucher]);

  if (!activeVoucher || !modalMode) return null;

  const isLocked = getVoucherStageMeta(activeVoucher).isDisbursedOutflow;

  const handleSelectCommentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingFile(true);

    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string) || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let finalUrl = dataUrl;
      try {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const storagePath = "voucher-comments/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
        const { data: upData, error: upErr } = await supabase.storage
          .from("media")
          .upload(storagePath, file, { upsert: true });
        if (!upErr && upData?.path) {
          const { data: pub } = supabase.storage.from("media").getPublicUrl(upData.path);
          if (pub?.publicUrl) finalUrl = pub.publicUrl;
        }
      } catch (_) {}

      setAttachedFile({
        url: finalUrl,
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "file",
      });
    } catch (_) {
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !attachedFile) return;
    setSubmitting(true);

    const resolvedName =
      currentUser?.full_name ||
      ((currentUser?.first_name || "") + " " + (currentUser?.last_name || "")).trim() ||
      "Studio Staff";
    const resolvedCode = currentUser?.staff_id || "LS-01";

    const newComment: VoucherComment = {
      id: "cmt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      author_name: resolvedName,
      author_code: resolvedCode,
      text: commentText.trim() || (attachedFile ? "Attached file: " + attachedFile.name : ""),
      attachment_url: attachedFile?.url || undefined,
      attachment_name: attachedFile?.name || undefined,
      created_at: new Date().toISOString(),
    };

    const nextComments = [...localComments, newComment];
    setLocalComments(nextComments);
    setCommentText("");
    setAttachedFile(null);

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
        staff_name: resolvedName,
        staff_code: resolvedCode,
        department: currentUser?.department || "Studio Operations",
        action_type: "COMMENTED_VOUCHER",
        module: "Vouchers",
        description: "Commented on voucher \"" + (activeVoucher.title || "") + "\": " + newComment.text.slice(0, 80),
        reference_code: activeVoucher.voucher_no || activeVoucher.voucher_code || "",
      });
      triggerPushNotification({
        title: "💬 New Voucher Comment — " + (activeVoucher.voucher_no || activeVoucher.title),
        message: resolvedName + " (" + resolvedCode + "): " + newComment.text,
        url: "https://studioslavie.com/admin/finance?tab=vouchers",
        targetType: activeVoucher.staff_code && activeVoucher.staff_code !== resolvedCode ? "staff_codes" : "all_staff",
        staffCodes: activeVoucher.staff_code ? [activeVoucher.staff_code] : undefined,
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
        <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5">
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)]/60 pb-4">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">Voucher Comments</h3>
              <p className="text-xs font-mono uppercase text-[#c7cb2d]">{activeVoucher.title} (₦{Number(activeVoucher.amount || 0).toLocaleString()}.00)</p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          <div className="min-h-[190px] max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {localComments.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--text-muted)] space-y-2">
                <MessageSquare className="w-9 h-9 stroke-[1.5] opacity-40" />
                <p className="text-sm font-medium">No Comment yet</p>
              </div>
            ) : (
              localComments.map((c, idx) => {
                const fileUrl = c.attachment_url || c.attachment_ref;
                const isImage = fileUrl && (String(fileUrl).startsWith("data:image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(String(fileUrl)));
                return (
                  <div key={c.id || ("cmt-" + idx)} className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-[#c7cb2d]">{c.author_name} ({c.author_code})</span>
                      <span className="text-[var(--text-dim)]">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    {c.text && (<p className="text-xs text-[var(--text-primary)] leading-relaxed">{c.text}</p>)}
                    {fileUrl && (
                      <div className="pt-1">
                        {isImage ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-block">
                            <img src={fileUrl} alt={c.attachment_name || "Attachment"} className="max-h-36 rounded-xl border border-white/10 object-cover hover:opacity-90 transition" />
                          </a>
                        ) : (
                          <a href={fileUrl} download={c.attachment_name || "voucher-attachment"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[11px] font-mono text-[#c7cb2d] transition">
                            <FileText className="w-3.5 h-3.5" /><span>{c.attachment_name || "View Attached Document"}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {attachedFile && (
            <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-3.5 h-3.5 text-[#c7cb2d] shrink-0" />
                <span className="font-mono text-[11px] text-[#c7cb2d] truncate">{attachedFile.name}</span>
              </div>
              <button type="button" onClick={() => setAttachedFile(null)} className="text-red-400 hover:text-red-300 text-[11px] font-mono cursor-pointer shrink-0">Remove</button>
            </div>
          )}

          <form onSubmit={handleSendComment} className="flex items-center gap-2 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/80 focus-within:border-[#c7cb2d] px-3.5 py-2">
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={handleSelectCommentFile} className="hidden" />
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={uploadingFile ? "Uploading file..." : "Write a comment..."} className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none" />
            <button type="button" disabled={uploadingFile} onClick={() => fileInputRef.current?.click()} title="Upload File or Receipt Image" className={"p-1.5 rounded-lg transition cursor-pointer " + (attachedFile ? "text-[#c7cb2d] bg-[#c7cb2d]/15" : "text-[var(--text-muted)] hover:text-white")}>
              <Paperclip className="w-4 h-4" />
            </button>
            <button type="submit" disabled={submitting || uploadingFile || (!commentText.trim() && !attachedFile)} title="Send Comment" className="p-1.5 rounded-lg text-[#c7cb2d] hover:bg-[#c7cb2d]/15 disabled:opacity-40 cursor-pointer transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/60 pb-3.5">
            <div>
              <h3 className="font-display text-lg font-bold">{isLocked ? "Voucher Particulars (Disbursed)" : "View / Edit Voucher"}</h3>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">{activeVoucher.voucher_no || activeVoucher.voucher_code || "LV-VCH"}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => printVoucherOfficialPDF(activeVoucher)} className="px-3 py-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[#c7cb2d] text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer"><Printer className="w-3 h-3" /><span>Print PDF</span></button>
              <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            <div><label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">PARTICULARS / VOUCHER TITLE</label><input type="text" required disabled={isLocked} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60" /></div>
            <div><label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">CATEGORY</label><select disabled={isLocked} value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60">{VOUCHER_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">TOTAL PRICE (₦)</label><input type="number" required disabled={isLocked} value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60" /></div>
              <div><label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">PAYMENT METHOD</label><select disabled={isLocked} value={editForm.payment_method} onChange={(e) => setEditForm((p) => ({ ...p, payment_method: e.target.value }))} className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60"><option value="Bank Transfer">Bank Transfer</option><option value="Corporate Card">Corporate Card</option><option value="Petty Cash">Petty Cash</option></select></div>
            </div>
            <div><label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">NOTES / VENDOR DETAILS</label><textarea rows={3} disabled={isLocked} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d] disabled:opacity-60" /></div>
            {!isLocked && (<button type="submit" disabled={submitting} className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer">{submitting ? "Saving Changes..." : "Save Voucher Changes"}</button>)}
          </form>
        </div>
      )}
    </div>
  );
}

export function RaisedVouchersWorkspacePanel({
  vouchers,
  currentUser,
  onUpdateVoucher,
  onVoucherCreated,
  onOpenCreateModal,
  onReuseVoucher,
}: {
  vouchers: any[];
  currentUser?: any;
  onUpdateVoucher: (updated: any) => void;
  onVoucherCreated?: (created: any) => void;
  onOpenCreateModal?: () => void;
  onReuseVoucher?: (v: any) => void;
}) {
  const staffVouchersOnly = React.useMemo(() => (vouchers || []).filter((v) => !getVoucherStageMeta(v).isDirectExpense), [vouchers]);
  const [filters, setFilters] = React.useState<FilterState>({ category: "ALL", status: "ALL", startDate: "", endDate: "", search: "" });
  const [page, setPage] = React.useState(1);
  const [activeVoucher, setActiveVoucher] = React.useState<any | null>(null);
  const [modalMode, setModalMode] = React.useState<"comments" | "edit" | null>(null);

  const pageSize = 8;
  const filtered = React.useMemo(() => filterVouchersList(staffVouchersOnly, filters, currentUser), [staffVouchersOnly, filters, currentUser]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">Raised Vouchers</h3>
          <p className="text-xs text-[var(--text-muted)]">Request project or operational expense vouchers and track payout status</p>
        </div>
        {onOpenCreateModal && (
          <button type="button" onClick={onOpenCreateModal} className="px-4 py-2.5 rounded-full bg-[#c7cb2d] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 transition cursor-pointer shadow-lg">
            <Plus className="w-4 h-4 stroke-[2.5]" /><span>Create New Voucher</span>
          </button>
        )}
      </div>
      <VoucherSummaryAndFilterBar vouchers={staffVouchersOnly} filters={filters} setFilters={(val) => { setFilters(val); setPage(1); }} currentUser={currentUser} showAttentionFilter={false} />
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible pb-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]/60 bg-[var(--bg-main)]/60 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3.5 px-4">Particular</th>
                <th className="py-3.5 px-4">Total Price</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40 text-xs">
              {paginated.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-[var(--text-muted)]">No vouchers raised yet. Click <strong>+ Create New Voucher</strong> to submit a request.</td></tr>
              ) : (
                paginated.map((v: any) => {
                  const meta = getVoucherStageMeta(v);
                  const dateFormatted = v.created_at ? new Date(v.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase() : "RECENT";
                  const statusPrimary = meta.isDisbursedOutflow ? "PAID" : meta.stage === "approved_waiting" ? "APPROVED" : meta.stage === "rejected" ? "REJECTED" : "PENDING";
                  const statusSub = meta.isDisbursedOutflow ? "Completed" : meta.stage === "approved_waiting" ? "Awaiting Payout" : meta.stage === "rejected" ? "Declined" : "In Review";
                  const statusColor = meta.isDisbursedOutflow ? "text-emerald-400" : meta.stage === "approved_waiting" ? "text-[#c7cb2d]" : meta.stage === "rejected" ? "text-red-400" : "text-amber-300";
                  return (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 max-w-md"><p className="font-bold text-[var(--text-primary)] uppercase tracking-tight truncate">{v.title}</p><p className="text-[10px] font-mono text-[var(--text-dim)] truncate">{v.voucher_no || v.voucher_code || "LV-VCH"} • {v.category || "Operations"}</p></td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">₦{Number(v.amount || 0).toLocaleString()}.00</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">{dateFormatted}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap"><div className="leading-tight"><span className={"font-mono text-[11px] font-bold block " + statusColor}>{statusPrimary}</span><span className="text-[10px] text-[var(--text-dim)]">{statusSub}</span></div></td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <VoucherRowActionsMenu voucher={v} onViewEdit={(item) => { setActiveVoucher(item); setModalMode("edit"); }} onOpenComments={(item) => { setActiveVoucher(item); setModalMode("comments"); }} onReuse={(item) => { if (onReuseVoucher) onReuseVoucher(item); }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <VoucherActionModals activeVoucher={activeVoucher} modalMode={modalMode} currentUser={currentUser} onClose={() => { setActiveVoucher(null); setModalMode(null); }} onVoucherUpdated={onUpdateVoucher} />
    </div>
  );
}
export function FinanceVouchersApprovalPanel({
  vouchers,
  currentUser,
  onUpdateVoucher,
  onReuseAsExpense,
}: {
  vouchers: any[];
  currentUser?: any;
  onUpdateVoucher: (updated: any) => void;
  onReuseAsExpense?: (v: any) => void;
}) {
  // Strictly only staff-raised vouchers (exclude direct finance expenses)
  const staffVouchersOnly = React.useMemo(
    () => (vouchers || []).filter((v) => !getVoucherStageMeta(v).isDirectExpense),
    [vouchers]
  );

  const [filters, setFilters] = React.useState<FilterState>({
    category: "ALL",
    status: "ALL",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [page, setPage] = React.useState(1);
  const [activeVoucher, setActiveVoucher] = React.useState<any | null>(null);
  const [modalMode, setModalMode] = React.useState<"comments" | "edit" | null>(null);

  const pageSize = 8;
  const filtered = React.useMemo(
    () => filterVouchersList(staffVouchersOnly, filters, currentUser),
    [staffVouchersOnly, filters, currentUser]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Staff Expense Vouchers — Approval & Disbursement Desk
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Level 1: CEO → Level 2: Head of Ops → Level 3: Head of Finance → Disburse
          </p>
        </div>
      </div>

      <VoucherSummaryAndFilterBar
        vouchers={staffVouchersOnly}
        filters={filters}
        setFilters={(val) => { setFilters(val); setPage(1); }}
        currentUser={currentUser}
        showAttentionFilter={true}
      />

      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible pb-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]/60 bg-[var(--bg-main)]/60 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3.5 px-4">Particular</th>
                <th className="py-3.5 px-4">Raised By</th>
                <th className="py-3.5 px-4">Total Price</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40 text-xs">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                    No staff vouchers match the selected filters.
                  </td>
                </tr>
              ) : (
                paginated.map((v: any) => {
                  const meta = getVoucherStageMeta(v);
                  const curLevel = (meta as any).currentLevel ?? 1;
                  const dateFormatted = v.created_at
                    ? new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()
                    : "RECENT";

                  const statusPrimary = meta.isDisbursedOutflow
                    ? "PAID"
                    : meta.stage === "approved_waiting"
                    ? "APPROVED"
                    : meta.stage === "rejected"
                    ? "REJECTED"
                    : "PENDING (L" + curLevel + "/3)";

                  const statusSub = meta.isDisbursedOutflow
                    ? "Disbursed"
                    : meta.stage === "approved_waiting"
                    ? "Ready to Disburse"
                    : meta.stage === "rejected"
                    ? "Declined"
                    : curLevel === 1
                    ? "Awaiting CEO"
                    : curLevel === 2
                    ? "Awaiting Head of Ops"
                    : "Awaiting Finance";

                  const statusColor = meta.isDisbursedOutflow
                    ? "text-emerald-400"
                    : meta.stage === "approved_waiting"
                    ? "text-[#c7cb2d]"
                    : meta.stage === "rejected"
                    ? "text-red-400"
                    : "text-amber-300";

                  return (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-[var(--text-primary)] uppercase tracking-tight truncate">{v.title}</p>
                        <p className="text-[10px] font-mono text-[var(--text-dim)] truncate">
                          {v.voucher_no || v.voucher_code || "LV-VCH"} • {v.category || "Operations"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-[var(--text-primary)]">{v.staff_name || "Staff"}</p>
                        <p className="text-[10px] font-mono text-[var(--text-dim)]">{v.staff_code || "LS-STAFF"} • {v.payment_method || "Bank Transfer"}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                        ₦{Number(v.amount || 0).toLocaleString()}.00
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="leading-tight">
                          <span className={"font-mono text-[11px] font-bold block " + statusColor}>{statusPrimary}</span>
                          <span className="text-[10px] text-[var(--text-dim)]">{statusSub}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <VoucherLevelActionButtons
                            voucher={v}
                            currentUser={currentUser}
                            pageContext="finance_desk"
                            onVoucherUpdated={onUpdateVoucher}
                          />
                          <VoucherRowActionsMenu
                            voucher={v}
                            onViewEdit={(item) => { setActiveVoucher(item); setModalMode("edit"); }}
                            onOpenComments={(item) => { setActiveVoucher(item); setModalMode("comments"); }}
                            onReuse={(item) => { if (onReuseAsExpense) onReuseAsExpense(item); }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] pt-1">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} vouchers
          </span>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer">‹ Prev</button>
            <span className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold">{currentPage}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer">Next ›</button>
          </div>
        </div>
      )}

      <VoucherActionModals
        activeVoucher={activeVoucher}
        modalMode={modalMode}
        currentUser={currentUser}
        onClose={() => { setActiveVoucher(null); setModalMode(null); }}
        onVoucherUpdated={onUpdateVoucher}
      />
    </div>
  );
}