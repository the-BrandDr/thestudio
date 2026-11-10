"use client";

import * as React from "react";
import {
  VOUCHER_CATEGORIES,
  getVoucherStageMeta,
  getStaffApprovalLevel,
  ApprovalRoleTier,
} from "@/utils/resolve-current-staff";
import { logStaffActivity } from "@/utils/staff-activity-logger";
import {
  Search,
  MoreHorizontal,
  Edit3,
  MessageSquare,
  Copy,
  Printer,
  X,
  Send,
  FileText,
  Receipt,
  Wallet,
  CheckCircle2,
  Scale,
  Check,
  Ban,
  BellRing,
  Lock,
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
  const match = raw.match(/<!--VCH_COMMENTS:([\s\S]*?)-->/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) return parsed;
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
  const code =
    v.voucher_no ||
    v.voucher_code ||
    `LV-VCH-${String(v.id || "").slice(0, 6).toUpperCase()}`;
  const amountNum = Number(String(v.amount || 0).replace(/[^0-9.-]+/g, ""));
  const createdDate = v.created_at
    ? new Date(v.created_at).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-NG");

  const lvl1 = String(
    v.strategist_status || (meta.isDirectExpense ? "approved" : "pending")
  ).toUpperCase();
  const lvl2 = String(
    v.ops_status || (meta.isDirectExpense ? "approved" : "pending")
  ).toUpperCase();
  const lvl3 = String(
    v.finance_status || (meta.isDirectExpense ? "approved" : "pending")
  ).toUpperCase();
  const disbursed = meta.isDisbursedOutflow ? "DISBURSED / PAID" : "UNPAID";

  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Voucher - ${code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111;
      background: #fff;
      padding: 40px;
      line-height: 1.5;
    }
    .sheet {
      max-width: 780px;
      margin: 0 auto;
      border: 2px solid #111;
      border-radius: 16px;
      padding: 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand h1 {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
    .brand p {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }
    .doc-badge { text-align: right; }
    .doc-badge .tag {
      display: inline-block;
      background: #111;
      color: #c7cb2d;
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .doc-badge .code {
      font-family: monospace;
      font-size: 16px;
      font-weight: 800;
      margin-top: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      background: #f7f7f5;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-item label {
      display: block;
      font-size: 10px;
      font-family: monospace;
      text-transform: uppercase;
      color: #666;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 700;
      color: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #111;
      color: #fff;
      text-align: left;
      font-size: 11px;
      font-family: monospace;
      text-transform: uppercase;
      padding: 10px 14px;
    }
    td {
      border-bottom: 1px solid #ddd;
      padding: 14px;
      font-size: 13px;
    }
    .amount-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111;
      color: #fff;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .amount-box .lbl {
      font-family: monospace;
      font-size: 12px;
      text-transform: uppercase;
      color: #ccc;
    }
    .amount-box .val {
      font-family: monospace;
      font-size: 22px;
      font-weight: 900;
      color: #c7cb2d;
    }
    .approvals {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .sig-card {
      border: 1px solid #ccc;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .sig-card .tier {
      font-size: 10px;
      font-family: monospace;
      text-transform: uppercase;
      color: #666;
    }
    .sig-card .role {
      font-size: 12px;
      font-weight: 800;
      margin: 4px 0 8px;
    }
    .sig-card .stamp {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 10px;
      font-weight: 800;
      border: 1px solid #111;
    }
    .stamp.approved { background: #e6f4ea; color: #137333; border-color: #137333; }
    .stamp.rejected { background: #fce8e6; color: #c5221f; border-color: #c5221f; }
    .stamp.pending { background: #fef7e0; color: #b06000; border-color: #b06000; }
    .notes {
      border: 1px dashed #bbb;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-family: monospace;
      color: #777;
    }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>Lavie Studios Ltd</h1>
        <p>Corporate Identity • Event Scenography • Craft Fabrication • Advertising</p>
      </div>
      <div class="doc-badge">
        <div class="tag">Official Payment Voucher</div>
        <div class="code">${code}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <label>Raised By / Payee</label>
        <span>${String(v.staff_name || "Studio Staff").replace(/^\[DIRECT\]\s*/, "")} (${v.staff_code || "LS-STAFF"})</span>
      </div>
      <div class="meta-item">
        <label>Date Raised</label>
        <span>${createdDate}</span>
      </div>
      <div class="meta-item">
        <label>Payment Channel</label>
        <span>${v.payment_method || "Bank Transfer"}</span>
      </div>
      <div class="meta-item">
        <label>Expense Category</label>
        <span>${v.category || "Operations"}</span>
      </div>
      <div class="meta-item">
        <label>Department</label>
        <span>${v.department || "Studio Operations"}</span>
      </div>
      <div class="meta-item">
        <label>Current Status</label>
        <span>${meta.label}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Particulars / Description</th>
          <th>Category</th>
          <th style="text-align:right;">Amount (₦)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${v.title || "Expense Voucher"}</strong></td>
          <td>${v.category || "General"}</td>
          <td style="text-align:right; font-family:monospace; font-weight:700;">₦${amountNum.toLocaleString()}.00</td>
        </tr>
      </tbody>
    </table>

    ${cleanNotes ? `<div class="notes"><strong>Notes / Breakdown:</strong><br/>${cleanNotes}</div>` : ""}

    <div class="amount-box">
      <span class="lbl">Total Authorized Voucher Sum</span>
      <span class="val">₦${amountNum.toLocaleString()}.00</span>
    </div>

    <div class="approvals">
      <div class="sig-card">
        <div class="tier">Level 1 Approval</div>
        <div class="role">CEO / Executive</div>
        <span class="stamp ${lvl1.toLowerCase()}">${lvl1}</span>
      </div>
      <div class="sig-card">
        <div class="tier">Level 2 Approval</div>
        <div class="role">Head of Operations</div>
        <span class="stamp ${lvl2.toLowerCase()}">${lvl2}</span>
      </div>
      <div class="sig-card">
        <div class="tier">Level 3 Approval</div>
        <div class="role">Head of Finance</div>
        <span class="stamp ${lvl3.toLowerCase()}">${lvl3}</span>
      </div>
      <div class="sig-card">
        <div class="tier">Treasury Settlement</div>
        <div class="role">Disbursement</div>
        <span class="stamp ${meta.isDisbursedOutflow ? "approved" : "pending"}">${disbursed}</span>
      </div>
    </div>

    ${
      comments.length > 0
        ? `<div class="notes"><strong>Approval & Audit Comments (${comments.length}):</strong><br/>` +
          comments
            .map(
              (c) =>
                `<div style="margin-top:4px;">• <strong>${c.author_name} (${c.author_code}):</strong> ${c.text}</div>`
            )
            .join("") +
          `</div>`
        : ""
    }

    <div class="footer">
      <span>Generated via Lavie Studios Enterprise Workspace</span>
      <span>Printed: ${new Date().toLocaleString("en-NG")}</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

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
  const curLevel = (meta as any).currentLevel;
  if (userTier === "level1_ceo" && curLevel === 1) return true;
  if (userTier === "level2_ops" && curLevel === 2) return true;
  if (
    userTier === "level3_finance" &&
    (curLevel === 3 || meta.stage === "approved_waiting")
  ) {
    return true;
  }
  return false;
}

export function filterVouchersList(
  vouchers: any[],
  filters: FilterState,
  currentUser?: any
): any[] {
  const userTier =
    typeof getStaffApprovalLevel === "function"
      ? getStaffApprovalLevel(currentUser)
      : "staff";

  return (vouchers || []).filter((v) => {
    if (filters?.onlyNeedsMyAttention) {
      if (!doesVoucherNeedUserAttention(v, userTier)) return false;
    }
    if (filters?.category && filters.category !== "ALL") {
      if (String(v.category || "") !== filters.category) return false;
    }
    if (filters?.status && filters.status !== "ALL") {
      const meta = getVoucherStageMeta(v);
      if (filters.status === "NEEDS_ATTENTION" && !doesVoucherNeedUserAttention(v, userTier))
        return false;
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
  currentUser,
}: {
  vouchers: any[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  currentUser?: any;
}) {
  const userTier: ApprovalRoleTier =
    typeof getStaffApprovalLevel === "function"
      ? getStaffApprovalLevel(currentUser)
      : "staff";

  const tierLabel =
    userTier === "level1_ceo"
      ? "Level 1: CEO Approval Queue"
      : userTier === "level2_ops"
      ? "Level 2: Head of Ops Queue"
      : userTier === "level3_finance"
      ? "Level 3: Finance Approval & Disbursement Queue"
      : null;

  const attentionCount = React.useMemo(
    () => (vouchers || []).filter((v) => doesVoucherNeedUserAttention(v, userTier)).length,
    [vouchers, userTier]
  );

  const filtered = React.useMemo(
    () => filterVouchersList(vouchers, filters, currentUser),
    [vouchers, filters, currentUser]
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
      {tierLabel && (
        <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] border border-[#c7cb2d]/30 font-mono text-[10px] font-bold uppercase">
              {tierLabel}
            </span>
            <span className="text-[var(--text-muted)] text-[11px]">
              {attentionCount > 0
                ? `${attentionCount} voucher(s) currently require your sign-off`
                : "All vouchers at your approval level are cleared"}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setFilters((p) => ({
                ...p,
                onlyNeedsMyAttention: !p.onlyNeedsMyAttention,
              }))
            }
            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 transition cursor-pointer ${
              filters.onlyNeedsMyAttention
                ? "bg-[#c7cb2d] text-black"
                : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#c7cb2d]"
            }`}
          >
            <BellRing className="w-3 h-3" />
            <span>
              {filters.onlyNeedsMyAttention
                ? `Showing: Requires My Attention (${attentionCount})`
                : `Filter: Requires My Attention (${attentionCount})`}
            </span>
          </button>
        </div>
      )}

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
          {userTier !== "staff" && (
            <option value="NEEDS_ATTENTION">
              STATUS: REQUIRES MY ATTENTION ({attentionCount})
            </option>
          )}
          <option value="PENDING">STATUS: PENDING APPROVAL</option>
          <option value="APPROVED">STATUS: AWAITING DISBURSEMENT</option>
          <option value="PAID">STATUS: PAID / DISBURSED</option>
          <option value="REJECTED">STATUS: REJECTED</option>
        </select>

        <div>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
            title="Start Date"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#c7cb2d]"
          />
        </div>

        <div>
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

  if (meta.isDirectExpense || meta.stage === "disbursed" || meta.stage === "rejected") {
    return null;
  }

  let userTier: ApprovalRoleTier =
    typeof getStaffApprovalLevel === "function"
      ? getStaffApprovalLevel(currentUser)
      : "staff";

  if (userTier === "staff") {
    if (pageContext === "finance_desk") userTier = "level3_finance";
    else if (pageContext === "ops_hr") userTier = "level2_ops";
    else if (pageContext === "ceo_overview") userTier = "level1_ceo";
  }

  const handleDecision = async (decision: "accept" | "reject" | "disburse") => {
    if (busy) return;
    let rejectionReason = "";
    if (decision === "reject") {
      const input = window.prompt(
        "Enter reason for rejecting this voucher (will be added to Voucher Comments):",
        "Insufficient supporting documentation / budget review required"
      );
      if (input === null) return;
      rejectionReason = input.trim() || "Rejected during approval review";
    }

    setBusy(true);
    try {
      let updates: Record<string, any> = {};

      if (decision === "disburse") {
        if (!meta.canDisburse) {
          setBusy(false);
          return;
        }
        updates = { status: "disbursed" };
      } else if (userTier === "level1_ceo" && curLevel === 1) {
        updates = {
          strategist_status: decision === "accept" ? "approved" : "rejected",
          status: decision === "reject" ? "rejected" : "pending",
        };
      } else if (userTier === "level2_ops" && curLevel === 2) {
        updates = {
          ops_status: decision === "accept" ? "approved" : "rejected",
          status: decision === "reject" ? "rejected" : "pending",
        };
      } else if (userTier === "level3_finance" && curLevel === 3) {
        updates = {
          finance_status: decision === "accept" ? "approved" : "rejected",
          status: decision === "accept" ? "approved" : "rejected",
        };
      } else {
        setBusy(false);
        return;
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
          id: `cmt-${Date.now()}`,
          author_name: currentUser?.full_name || "Approving Officer",
          author_code: currentUser?.staff_id || "LS-EXEC",
          text: `[REJECTED]: ${rejectionReason}`,
          created_at: new Date().toISOString(),
        };
        await fetch("/api/admin/vouchers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: voucher.id,
            action: "add_comment",
            comment: rejectComment,
          }),
        }).catch(() => {});
      }

      await logStaffActivity({
        staff_name: currentUser?.full_name || "Approving Officer",
        staff_code: currentUser?.staff_id || "LS-EXEC",
        department: currentUser?.department || "Executive & Finance",
        action_type:
          decision === "disburse"
            ? "DISBURSED_VOUCHER"
            : decision === "accept"
            ? "APPROVED_VOUCHER_LEVEL"
            : "REJECTED_VOUCHER",
        module: "Expenses & Vouchers",
        description:
          decision === "disburse"
            ? `Disbursed approved voucher "${voucher.title}" (₦${Number(voucher.amount || 0).toLocaleString()})`
            : `${decision === "accept" ? "Accepted" : "Rejected"} voucher "${voucher.title}" at ${userTier.replace("_", " ").toUpperCase()}`,
        reference_code: voucher.voucher_no || voucher.voucher_code || "",
      });

      onVoucherUpdated(updatedRow);
    } catch (_) {
    } finally {
      setBusy(false);
    }
  };

  if (meta.stage === "approved_waiting" && meta.canDisburse) {
    if (userTier === "level3_finance" || pageContext === "finance_desk") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("disburse")}
          className="px-3 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-[10px] font-mono uppercase font-bold hover:brightness-110 transition cursor-pointer disabled:opacity-50"
        >
          {busy ? "Updating..." : "Mark Disbursed"}
        </button>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
        Awaiting Finance Disbursement
      </span>
    );
  }

  const isMyTurn =
    (userTier === "level1_ceo" && curLevel === 1) ||
    (userTier === "level2_ops" && curLevel === 2) ||
    (userTier === "level3_finance" && curLevel === 3);

  if (isMyTurn) {
    const levelTag =
      curLevel === 1 ? "L1 CEO" : curLevel === 2 ? "L2 Ops" : "L3 Finance";

    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("accept")}
          title={`Accept at ${levelTag}`}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
        >
          <Check className="w-3 h-3" />
          <span>Accept</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("reject")}
          title={`Reject at ${levelTag}`}
          className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500 hover:text-white text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
        >
          <Ban className="w-3 h-3" />
          <span>Reject</span>
        </button>
      </div>
    );
  }

  const waitingForText =
    curLevel === 1
      ? "Waiting: Level 1 (CEO)"
      : curLevel === 2
      ? "Waiting: Level 2 (Head of Ops)"
      : "Waiting: Level 3 (Finance)";

  return (
    <span
      title="Sequential approval: each level unlocks after the prior level accepts"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[var(--text-dim)] text-[10px] font-mono select-none"
    >
      <Lock className="w-2.5 h-2.5" />
      <span>{waitingForText}</span>
    </span>
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
        <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-[#141414] border border-[var(--border-subtle)] shadow-2xl py-1.5 z-40 text-xs">
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

          <div className="my-1 border-t border-[var(--border-subtle)]/40" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              printVoucherOfficialPDF(voucher);
            }}
            className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/5 text-[#c7cb2d] font-medium cursor-pointer transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#c7cb2d]" />
            <span>Print / Export Voucher PDF</span>
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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => printVoucherOfficialPDF(activeVoucher)}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[#c7cb2d] text-[#c7cb2d] text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>Print PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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

export function RaisedVouchersWorkspacePanel({
  vouchers,
  currentUser,
  onUpdateVoucher,
  onReuseVoucher,
}: {
  vouchers: any[];
  currentUser?: any;
  onUpdateVoucher: (updated: any) => void;
  onReuseVoucher: (v: any) => void;
}) {
  const [filters, setFilters] = React.useState<FilterState>({
    category: "ALL",
    status: "ALL",
    startDate: "",
    endDate: "",
    search: "",
    onlyNeedsMyAttention: false,
  });
  const [page, setPage] = React.useState(1);
  const [activeVoucher, setActiveVoucher] = React.useState<any | null>(null);
  const [modalMode, setModalMode] = React.useState<"comments" | "edit" | null>(null);

  const pageSize = 6;
  const filtered = React.useMemo(
    () => filterVouchersList(vouchers || [], filters, currentUser),
    [vouchers, filters, currentUser]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <VoucherSummaryAndFilterBar
        vouchers={vouchers || []}
        filters={filters}
        setFilters={(val) => {
          setFilters(val);
          setPage(1);
        }}
        currentUser={currentUser}
      />

      {paginated.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-center space-y-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            No vouchers match your current filter
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Try clearing the search query or switching Status to ALL.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((v: any) => {
            const meta = getVoucherStageMeta(v);
            const commentsCount = extractVoucherComments(v).length;
            return (
              <div
                key={v.id}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 hover:border-[#c7cb2d]/40 transition space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#c7cb2d]">
                      <span>
                        {v.voucher_no ||
                          v.voucher_code ||
                          `LV-VCH-${String(v.id || "").slice(0, 5).toUpperCase()}`}
                      </span>
                      <span>•</span>
                      <span>{v.category || "Operations"}</span>
                      {v.staff_name && (
                        <>
                          <span>•</span>
                          <span className="text-[var(--text-muted)]">
                            {String(v.staff_name).replace(/^\[DIRECT\]\s*/, "")} (
                            {v.staff_code || "LS-STAFF"})
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="font-display text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      {v.title}
                    </h4>
                    <p className="text-[11px] font-mono text-[var(--text-dim)]">
                      {v.created_at
                        ? new Date(v.created_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "Recent"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm sm:text-base font-bold text-[#c7cb2d]">
                        ₦{Number(v.amount || 0).toLocaleString()}
                      </span>
                      <VoucherRowActionsMenu
                        voucher={v}
                        onViewEdit={(item) => {
                          setActiveVoucher(item);
                          setModalMode("edit");
                        }}
                        onOpenComments={(item) => {
                          setActiveVoucher(item);
                          setModalMode("comments");
                        }}
                        onReuse={(item) => onReuseVoucher(item)}
                      />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* Sequential 3-Level Approval Pipeline + Role-Scoped Accept/Reject Buttons */}
                <div className="pt-2.5 border-t border-[var(--border-subtle)]/40 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        v.strategist_status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : v.strategist_status === "rejected"
                          ? "bg-red-500/15 text-red-400 border border-red-500/30"
                          : "bg-[var(--bg-main)] text-[var(--text-dim)] border border-[var(--border-subtle)]/50"
                      }`}
                    >
                      L1 CEO: {(v.strategist_status || "pending").toUpperCase()}
                    </span>
                    <span className="text-[var(--text-dim)]">→</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        v.ops_status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : v.ops_status === "rejected"
                          ? "bg-red-500/15 text-red-400 border border-red-500/30"
                          : "bg-[var(--bg-main)] text-[var(--text-dim)] border border-[var(--border-subtle)]/50"
                      }`}
                    >
                      L2 Head of Ops: {(v.ops_status || "pending").toUpperCase()}
                    </span>
                    <span className="text-[var(--text-dim)]">→</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        v.finance_status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : v.finance_status === "rejected"
                          ? "bg-red-500/15 text-red-400 border border-red-500/30"
                          : "bg-[var(--bg-main)] text-[var(--text-dim)] border border-[var(--border-subtle)]/50"
                      }`}
                    >
                      L3 Finance: {(v.finance_status || "pending").toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVoucher(v);
                        setModalMode("comments");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-subtle)]/70 hover:border-[#c7cb2d] text-[10px] font-mono text-[var(--text-muted)] hover:text-white flex items-center gap-1 cursor-pointer transition"
                    >
                      <MessageSquare className="w-3 h-3 text-sky-400" />
                      <span>Comments ({commentsCount})</span>
                    </button>

                    <VoucherLevelActionButtons
                      voucher={v}
                      currentUser={currentUser}
                      onVoucherUpdated={onUpdateVoucher}
                    />
                  </div>
                </div>

                {(v.proof_url || v.receipt_url) && (
                  <div className="pt-1">
                    <a
                      href={v.proof_url || v.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-[#c7cb2d] underline hover:opacity-80"
                    >
                      View Attached Proof ({v.proof_name || "Receipt Image"})
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {filtered.length > 0 && (
        <div className="pt-2 flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} vouchers
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer"
            >
              ‹ Prev
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold">
              {currentPage}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer"
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      <VoucherActionModals
        activeVoucher={activeVoucher}
        modalMode={modalMode}
        currentUser={currentUser}
        onClose={() => {
          setActiveVoucher(null);
          setModalMode(null);
        }}
        onVoucherUpdated={onUpdateVoucher}
      />
    </div>
  );
}
