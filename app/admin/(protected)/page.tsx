"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  LayoutGrid,
  MessageSquare,
  Calendar,
  Receipt,
  Award,
  Search,
  Send,
  Paperclip,
  Smile,
  Reply,
  Plus,
  Image as ImageIcon,
  Mic,
  Square,
  AtSign,
  Volume2,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Wallet,
  FolderKanban,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  PieChart,
  ShieldCheck,
  Filter,
  Target,
  Gauge,
  RotateCcw,
} from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { resolveAuthenticatedStaff,
  isExecutiveDirector,
  VOUCHER_CATEGORIES,
  STUDIO_SERVICE_CATEGORIES,
  getVoucherStageMeta } from "@/utils/resolve-current-staff";
import { triggerPushNotification } from "@/utils/push-notifications";
import {
  VoucherSummaryAndFilterBar,
  VoucherRowActionsMenu,
  VoucherActionModals,
  filterVouchersList,
  cleanVoucherNotes,
} from "@/components/admin/voucher-suite-enhancements";

const STUDIO_DEPARTMENTS = [
  "Executive & Board Governance",
  "Brand Strategy & Positioning",
  "Brand Communications & PR",
  "Design & Creative",
  "Spatial & Event Production",
  "Out-of-Home (OOH) & Media",
  "Digital, UI/UX & Engineering",
  "Motion, Video & Photography",
  "Client Services & Growth",
  "Operations, Logistics & Procurement",
  "Human Resources & People Operations",
  "Finance, Accounting & Treasury",
  "Facility, Fleet & Support Services",
];

const HIERARCHY_LEVELS = [
  "L0 - Auxiliary & Facility Support",
  "L1 - Intern / Graduate Trainee",
  "L2 - Junior Associate",
  "L3 - Mid-Level Specialist",
  "L4 - Senior Specialist",
  "L5 - Lead / Principal",
  "L6 - Department Head",
  "L7 - Executive / Director",
];

const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contract / Retainer",
  "Auxiliary / Support",
  "Internship",
  "Freelance / Consultant",
];

const QUICK_EMOJIS = ["👍", "✅", "🔥", "👏", "🎯", "🚀", "🙌", "📌", "⚡", "💡", "🤝", "🎉", "❤️", "🙏"];

async function compressImage(file: File, maxW = 1200, quality = 0.78): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas failed"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/webp", quality);
        canvas.toBlob(
          (blob) => (blob ? resolve({ blob, dataUrl }) : reject(new Error("Blob failed"))),
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminOverviewAndOpenSpacePage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = React.useState<"overview" | "chat" | "leave" | "vouchers" | "promotion">("overview");
  const [me, setMe] = React.useState<any | null>(null);
  const [staffColleagues, setStaffColleagues] = React.useState<any[]>([]);
  const [myLeaves, setMyLeaves] = React.useState<any[]>([]);
  const [myVouchers, setMyVouchers] = React.useState<any[]>([]);
  const [myPromotions, setMyPromotions] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [caseStudies, setCaseStudies] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [voucherNotice, setVoucherNotice] = React.useState("");
  const [leavePage, setLeavePage] = React.useState(1);
  const [voucherPage, setVoucherPage] = React.useState(1);

  // ==========================================================================
  // OVERVIEW FILTER & BENCHMARK RATING STATE
  // ==========================================================================
  const [datePreset, setDatePreset] = React.useState<
    "all" | "this_month" | "last_month" | "this_quarter" | "last_6_months" | "this_year" | "last_year" | "custom"
  >("this_year");
  const [customStartDate, setCustomStartDate] = React.useState("");
  const [customEndDate, setCustomEndDate] = React.useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = React.useState("All Departments");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState("All Categories");
  const [selectedServiceFilter, setSelectedServiceFilter] = React.useState("All Services");
  const [revenueTargetBenchmark, setRevenueTargetBenchmark] = React.useState<number>(5000000);

  // Executive-only datasets
  const [execData, setExecData] = React.useState<{
    allLeaves: any[];
    allVouchers: any[];
    projects: any[];
    invoices: any[];
    receipts: any[];
    payroll: any[];
    inquiries: any[];
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = window.sessionStorage.getItem("lavie_exec_data_cache_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return {
              allLeaves: parsed.allLeaves || [],
              allVouchers: parsed.allVouchers || [],
              projects: parsed.projects || [],
              invoices: parsed.invoices || [],
              receipts: parsed.receipts || [],
              payroll: parsed.payroll || [],
              inquiries: parsed.inquiries || [],
            };
          }
        }
      } catch (_) {}
    }
    return {
      allLeaves: [],
      allVouchers: [],
      projects: [],
      invoices: [],
      receipts: [],
      payroll: [],
      inquiries: [],
    };
  });

  // Leave form
  const [leaveForm, setLeaveForm] = React.useState({
    leave_type: "Annual Leave",
    start_date: "",
    end_date: "",
    handover_staff: "",
    reason: "",
  });

  // Voucher form
  const [voucherForm, setVoucherForm] = React.useState({
    title: "",
    project_ref: "",
    category: VOUCHER_CATEGORIES[0],
    payment_method: "Bank Transfer",
    bank_name: "",
    bank_account_name: "",
    bank_account_no: "",
    description: "",
    attachment_data: "",
    attachment_name: "",
    initial_comment: "",
  });
  const [voucherItems, setVoucherItems] = React.useState<Array<{ item: string; qty: number; unitPrice: number }>>([
    { item: "", qty: 1, unitPrice: 0 },
  ]);
  const [voucherCommentInputs, setVoucherCommentInputs] = React.useState<Record<string, string>>({});
  const [previewProofUrl, setPreviewProofUrl] = React.useState<string | null>(null);

  // Promotion Self-Service Request
  const [promoReqForm, setPromoReqForm] = React.useState({
    desired_level: "L3 - Mid-Level Specialist",
    desired_step: 2,
    desired_title: "",
    desired_employment_type: "Full-Time",
    reason: "",
  });
  const [promoNotice, setPromoNotice] = React.useState("");

  // Studio Chat state
  const [chatChannelType, setChatChannelType] = React.useState<
    "group" | "direct" | "multi_user" | "multi_dept" | "mentions"
  >("group");
  const [chatTarget, setChatTarget] = React.useState("All Staff");
  const [selectedRecipients, setSelectedRecipients] = React.useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = React.useState<string[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatSearch, setChatSearch] = React.useState("");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showMentionList, setShowMentionList] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<any | null>(null);
  const [chatAttachment, setChatAttachment] = React.useState<{ url: string; name: string; type: string } | null>(null);
  const [dispatchNotice, setDispatchNotice] = React.useState("");
  const chatFileRef = React.useRef<HTMLInputElement>(null);

  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [voiceNoteDraft, setVoiceNoteDraft] = React.useState<{ url: string; blob?: Blob; duration: number } | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordTimerRef = React.useRef<any>(null);

  const loadOpenSpace = React.useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const [
      { data: staffData },
      { data: leaveData },
      { data: voucherData },
      { data: promoData },
      { data: msgData },
      { data: csData },
    ] = await Promise.all([
      supabase
        .from("staff_profiles")
        .select(
          "id, staff_id, first_name, last_name, email, role, hierarchy_level, step_level, permissions, department, job_title, employment_type, status, bank_name, bank_account_name, bank_account_no, passport_url"
        )
        .order("staff_id", { ascending: true }),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("studio_messages").select("*").order("created_at", { ascending: true }).limit(200),
      supabase
        .from("case_studies")
        .select("id, title, slug, category, client, year, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const resolved = resolveAuthenticatedStaff(authData?.user, staffData || []);
    setMe(resolved);
    setStaffColleagues(staffData || []);
    setCaseStudies(csData || []);

    if (resolved) {
      const myCode = String(resolved.staff_id || "").toUpperCase();
      const myId = resolved.id;

      setMyLeaves(
        (leaveData || []).filter(
          (l) => (myId && l.staff_id === myId) || (myCode && String(l.staff_code || "").toUpperCase() === myCode)
        )
      );
      const fullNameLower = `${resolved.first_name || ""} ${resolved.last_name || ""}`.trim().toLowerCase();
      setMyVouchers(
        (voucherData || []).filter((v) => {
          if (myId && v.staff_id === myId) return true;
          if (myCode && String(v.staff_code || "").toUpperCase() === myCode) return true;
          if (fullNameLower && String(v.staff_name || "").trim().toLowerCase() === fullNameLower) return true;
          return false;
        })
      );
      setMyPromotions(
        (promoData || []).filter(
          (p) => (myId && p.staff_id === myId) || (myCode && String(p.staff_code || "").toUpperCase() === myCode)
        )
      );

      setVoucherForm((prev) => ({
        ...prev,
        bank_name: prev.bank_name || resolved.bank_name || "",
        bank_account_name:
          prev.bank_account_name ||
          resolved.bank_account_name ||
          `${resolved.first_name || ""} ${resolved.last_name || ""}`.trim(),
        bank_account_no: prev.bank_account_no || resolved.bank_account_no || "",
      }));

      setPromoReqForm((prev) => ({
        ...prev,
        desired_level: resolved.hierarchy_level || "L3 - Mid-Level Specialist",
        desired_step: Math.min(7, Number(resolved.step_level || 1) + 1),
        desired_title: prev.desired_title || resolved.job_title || "",
        desired_employment_type: resolved.employment_type || "Full-Time",
      }));

      if (true) {
        const safeFetchTable = async (tableName: string) => {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select("*")
              .order("created_at", { ascending: false });
            if (error || !Array.isArray(data)) return [];
            return data;
          } catch (_) {
            return [];
          }
        };

        const mergeUniqueRows = (...arrays: any[][]) => {
          const seen = new Map<string, any>();
          for (const arr of arrays) {
            for (const row of arr || []) {
              if (!row) continue;
              const key = String(
                row.id ||
                  row.invoice_no ||
                  row.invoice_number ||
                  row.receipt_no ||
                  row.voucher_no ||
                  row.voucher_code ||
                  JSON.stringify(row)
              );
              if (!seen.has(key)) seen.set(key, row);
            }
          }
          return Array.from(seen.values());
        };

        const [
          tFinProjects,
          tProjects,
          tSalesRecords,
          tClientProjects,
          tFinInvoices,
          tClientInvoices,
          tInvoices,
          tFinReceipts,
          tClientReceipts,
          tReceipts,
          tVouchers,
          tStudioExpenses,
          tExpenses,
          tPayrollRecords,
          tStaffPayroll,
          tInquiries,
          tContactMessages,
          tClientQuotes,
        ] = await Promise.all([
          safeFetchTable("finance_projects"),
          safeFetchTable("projects"),
          safeFetchTable("sales_records"),
          safeFetchTable("client_projects"),
          safeFetchTable("finance_invoices"),
          safeFetchTable("client_invoices"),
          safeFetchTable("invoices"),
          safeFetchTable("finance_receipts"),
          safeFetchTable("client_receipts"),
          safeFetchTable("receipts"),
          safeFetchTable("expense_vouchers"),
          safeFetchTable("studio_expenses"),
          safeFetchTable("expenses"),
          safeFetchTable("payroll_records"),
          safeFetchTable("staff_payroll"),
          safeFetchTable("contact_inquiries"),
          safeFetchTable("contact_messages"),
          safeFetchTable("client_quotes"),
        ]);

        const allMergedProjects = mergeUniqueRows(tFinProjects, tProjects, tSalesRecords, tClientProjects);
        const allMergedInvoices = mergeUniqueRows(tFinInvoices, tClientInvoices, tInvoices);
        const allMergedReceipts = mergeUniqueRows(tFinReceipts, tClientReceipts, tReceipts);
        const allMergedVouchers = mergeUniqueRows(voucherData || [], tVouchers, tStudioExpenses, tExpenses);
        const allMergedPayroll = mergeUniqueRows(tPayrollRecords, tStaffPayroll);
        const allMergedInquiries = mergeUniqueRows(tInquiries, tContactMessages, tClientQuotes);

        // Also pull from /api/admin/overview-sync as a backup source, then merge non-destructively
        let apiBackup: any = {};
        try {
          const apiRes = await fetch("/api/admin/overview-sync", { cache: "no-store" });
          if (apiRes.ok) apiBackup = await apiRes.json();
        } catch (_) {}

        setExecData((prev) => {
          const pickBest = (...candidates: any[][]) => {
            const merged = mergeUniqueRows(...candidates);
            return merged;
          };

          const nextState = {
            allLeaves: pickBest(leaveData || [], apiBackup.allLeaves || [], prev.allLeaves || []),
            allVouchers: pickBest(allMergedVouchers, apiBackup.allVouchers || [], prev.allVouchers || []),
            projects: pickBest(allMergedProjects, apiBackup.projects || [], prev.projects || []),
            invoices: pickBest(allMergedInvoices, apiBackup.invoices || [], prev.invoices || []),
            receipts: pickBest(allMergedReceipts, apiBackup.receipts || [], prev.receipts || []),
            payroll: pickBest(allMergedPayroll, apiBackup.payroll || [], prev.payroll || []),
            inquiries: pickBest(allMergedInquiries, apiBackup.inquiries || [], prev.inquiries || []),
          };

          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem("lavie_exec_data_cache_v1", JSON.stringify(nextState));
            } catch (_) {}
          }
          return nextState;
        });
      }
    }

    if (msgData) setMessages(msgData);
  }, [supabase]);

  
  

  React.useEffect(() => {
    loadOpenSpace();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadOpenSpace();
      }
    });
    const ch = supabase
      .channel("open-space-vouchers-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_vouchers" }, () => {
        loadOpenSpace();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_projects" }, () => {
        loadOpenSpace();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_invoices" }, () => {
        loadOpenSpace();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_receipts" }, () => {
        loadOpenSpace();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      authListener?.subscription?.unsubscribe();
    };
  }, [loadOpenSpace, supabase]);

  // ==========================================================================
  // DATE & CRITERIA FILTER HELPER
  // ==========================================================================
    const matchesDateFilter = React.useCallback(
    (rawDate?: string | null) => {
      if (datePreset === "all") return true;
      if (!rawDate) return true;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return true;

      const now = new Date();
      if (datePreset === "this_month") {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (datePreset === "last_month") {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === lastM.getFullYear() && d.getMonth() === lastM.getMonth();
      }
      if (datePreset === "this_quarter") {
        const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const qStart = new Date(now.getFullYear(), qStartMonth, 1);
        return d >= qStart && d <= now;
      }
      if (datePreset === "last_6_months") {
        const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return d >= sixAgo && d <= now;
      }
      if (datePreset === "this_year") {
        return d.getFullYear() === now.getFullYear();
      }
      if (datePreset === "last_year") {
        return d.getFullYear() === now.getFullYear() - 1;
      }
      if (datePreset === "custom") {
        if (customStartDate) {
          const s = new Date(customStartDate);
          if (d < s) return false;
        }
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          if (d > e) return false;
        }
        return true;
      }
      return true;
    },
    [datePreset, customStartDate, customEndDate]
  );

  const uploadBlobToStorage = async (blob: Blob, folder: string, ext: string, fallbackDataUrl: string) => {
    try {
      const pathName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { data, error } = await supabase.storage.from("media").upload(pathName, blob, { upsert: true });
      if (!error && data?.path) {
        const { data: pub } = supabase.storage.from("media").getPublicUrl(data.path);
        if (pub?.publicUrl) return pub.publicUrl;
      }
    } catch (_) {}
    return fallbackDataUrl;
  };

  // Leave calculations
  const countWorkingDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };
  const requestedDays = countWorkingDays(leaveForm.start_date, leaveForm.end_date);
  const myUsedLeaveDays = myLeaves
    .filter((l) => l.status === "approved")
    .reduce((acc, l) => acc + (Number(l.working_days) || countWorkingDays(l.start_date, l.end_date)), 0);
  const remainingAnnualAllowance = Math.max(0, 20 - myUsedLeaveDays);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || requestedDays <= 0) return;
    setSaving(true);
    await supabase.from("leave_requests").insert({
      staff_id: me.id,
      staff_name: `${me.first_name || "Staff"} ${me.last_name || ""}`.trim(),
      staff_code: me.staff_id || "STAFF",
      leave_type: leaveForm.leave_type,
      working_days: requestedDays,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      handover_staff: leaveForm.handover_staff,
      reason: leaveForm.reason,
      status: "pending",
      hr_status: "pending",
      ops_status: "pending",
      strategist_status: "pending",
    });
    triggerPushNotification({
      title: "📅 New Staff Leave Application",
      message: `${me.first_name} (${me.staff_id}) requested ${requestedDays} working days (${leaveForm.leave_type}).`,
      url: "https://studioslavie.com/admin/hr",
      targetType: "clearance",
      clearance: "hr",
    });
    setLeaveForm({ leave_type: "Annual Leave", start_date: "", end_date: "", handover_staff: "", reason: "" });
    setSaving(false);
    loadOpenSpace();
  };

  // Voucher logic
  const computedVoucherTotal = voucherItems.reduce(
    (acc, row) => acc + Number(row.qty || 0) * Number(row.unitPrice || 0),
    0
  );

  const handleVoucherAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      try {
        const { blob, dataUrl } = await compressImage(file, 1200, 0.78);
        const finalUrl = await uploadBlobToStorage(blob, "vouchers", "webp", dataUrl);
        setVoucherForm((prev) => ({ ...prev, attachment_data: finalUrl, attachment_name: file.name }));
        return;
      } catch (_) {}
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setVoucherForm((prev) => ({
        ...prev,
        attachment_data: (ev.target?.result as string) || "",
        attachment_name: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

      const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    setVoucherNotice("");
    const vNo = `LV-VCH-${Date.now().toString().slice(-5)}`;
    const authorName = `${me.first_name || "Staff"} ${me.last_name || ""}`.trim();

    const initialComments = voucherForm.initial_comment.trim()
      ? [
          {
            author: `${authorName} (${me.staff_id || "Staff"})`,
            text: voucherForm.initial_comment.trim(),
            at: new Date().toISOString(),
          },
        ]
      : [];

    const payload = {
      voucher_no: vNo,
      staff_id: me.id || null,
      staff_name: authorName,
      staff_code: me.staff_id || "LS-01",
      department: me.department || "Operations",
      title: voucherForm.title,
      project_ref: voucherForm.project_ref || null,
      category: voucherForm.category,
      payment_method: voucherForm.payment_method,
      bank_name: voucherForm.bank_name || null,
      bank_account_name: voucherForm.bank_account_name || null,
      bank_account_no: voucherForm.bank_account_no || null,
      description: voucherForm.description || null,
      line_items: voucherItems,
      amount: computedVoucherTotal,
      attachment_url: voucherForm.attachment_data || null,
      attachment_name: voucherForm.attachment_name || null,
      comments: initialComments,
      status: "pending",
      ops_status: "pending",
      finance_status: "pending",
      strategist_status: "pending",
    };

    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setVoucherNotice(`❌ Failed to save voucher: ${json.error || "Check Supabase table permissions"}`);
        setSaving(false);
        return;
      }

      const insertedRow = json.data;
      if (insertedRow) {
        setMyVouchers((prev) => [insertedRow, ...prev]);
        setExecData((prev) => ({ ...prev, allVouchers: [insertedRow, ...prev.allVouchers] }));
      }

      setVoucherNotice(`✅ Voucher ${vNo} saved to database!`);
      setTimeout(() => setVoucherNotice(""), 5000);

      setVoucherForm((prev) => ({
        ...prev,
        title: "",
        project_ref: "",
        description: "",
        attachment_data: "",
        attachment_name: "",
        initial_comment: "",
      }));
      setVoucherItems([{ item: "", qty: 1, unitPrice: 0 }]);

      triggerPushNotification({
        title: "🧾 New Expense Voucher Submitted",
        message: `${authorName} raised "${voucherForm.title}" (₦${computedVoucherTotal.toLocaleString()}).`,
        url: "https://studioslavie.com/admin/hr",
        targetType: "clearance",
        clearance: "finance",
      });
      loadOpenSpace();
    } catch (err: any) {
      setVoucherNotice(`❌ Network error: ${err?.message || "Could not reach server"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVoucherComment = async (v: any) => {
    const text = (voucherCommentInputs[v.id] || "").trim();
    if (!text) return;
    const author = me ? `${me.first_name || "Staff"} (${me.staff_id || "STAFF"})` : "Team Member";
    const newComment = { author, text, at: new Date().toISOString() };
    const existingComments = Array.isArray(v.comments) ? v.comments : [];
    const updated = [...existingComments, newComment];

    setVoucherCommentInputs((prev) => ({ ...prev, [v.id]: "" }));
    setMyVouchers((prev) => prev.map((item) => (item.id === v.id ? { ...item, comments: updated } : item)));

    await fetch("/api/admin/vouchers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, comments: updated }),
    });

    if (v.staff_code && v.staff_code !== me?.staff_id) {
      triggerPushNotification({
        title: `💬 New Comment on Voucher ${v.voucher_no || v.title}`,
        message: `${author}: ${text}`,
        url: "https://studioslavie.com/admin",
        targetType: "staff_codes",
        staffCodes: [v.staff_code],
      });
    }
    loadOpenSpace();
  };

  // Promotion Request logic
  const handleSubmitPromoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    setPromoNotice("");

    await supabase.from("staff_promotions").insert({
      staff_id: me.id,
      staff_name: `${me.first_name || "Staff"} ${me.last_name || ""}`.trim(),
      staff_code: me.staff_id || "STAFF",
      previous_level: `${me.hierarchy_level || "L1"} (Step ${me.step_level || 1})`,
      new_level: `${promoReqForm.desired_level} (Step ${promoReqForm.desired_step})`,
      previous_title: me.job_title || "Staff",
      new_title: promoReqForm.desired_title || me.job_title,
      previous_employment_type: me.employment_type || "Full-Time",
      new_employment_type: promoReqForm.desired_employment_type,
      effective_date: new Date().toISOString().slice(0, 10),
      notes: `[STAFF PROMOTION REQUEST] ${promoReqForm.reason}`,
      promoted_by: "Pending HR Review",
      request_status: "pending",
      requested_by_staff: true,
    });

    setSaving(false);
    setPromoReqForm((prev) => ({ ...prev, reason: "" }));
    triggerPushNotification({
      title: "🏆 New Promotion Request",
      message: `${me.first_name} (${me.staff_id}) requested promotion to ${promoReqForm.desired_level} (Step ${promoReqForm.desired_step}).`,
      url: "https://studioslavie.com/admin/hr",
      targetType: "clearance",
      clearance: "hr",
    });
    setPromoNotice("✅ Promotion request submitted to HR!");
    loadOpenSpace();
  };

  // Chat logic
  const handleChatInputChange = (val: string) => {
    setChatInput(val);
    const atMatch = val.match(/@([a-zA-Z0-9_-]*)$/);
    if (atMatch) {
      setShowMentionList(true);
      setMentionQuery(atMatch[1].toLowerCase());
    } else {
      setShowMentionList(false);
    }
  };

  const handleInsertMention = (staffMember: any) => {
    const tagToken = `@${staffMember.first_name}_${staffMember.last_name}(${staffMember.staff_id}) `;
    const replaced = chatInput.replace(/@([a-zA-Z0-9_-]*)$/, tagToken);
    const nextText = replaced === chatInput ? `${chatInput} ${tagToken}`.trimStart() : replaced;
    setChatInput(nextText);
    setShowMentionList(false);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 });
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = (ev) => {
          setVoiceNoteDraft({
            url: (ev.target?.result as string) || "",
            blob,
            duration: Math.max(1, recordingSeconds),
          });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (_) {
      alert("Microphone access is required to record a voice note.");
    }
  };

  const stopVoiceRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
  };

  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.type.startsWith("image/")) {
      try {
        const { blob, dataUrl } = await compressImage(file, 1100, 0.76);
        const storedUrl = await uploadBlobToStorage(blob, "chat-images", "webp", dataUrl);
        setChatAttachment({ url: storedUrl, name: file.name, type: "image" });
        return;
      } catch (_) {}
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setChatAttachment({
        url: (ev.target?.result as string) || "",
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "file",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatAttachment && !voiceNoteDraft) return;
    const senderName = me ? `${me.first_name} ${me.last_name}` : "Staff";
    const senderCode = me?.staff_id || "STAFF";

    let finalAttachmentUrl = chatAttachment?.url || null;
    let finalAttachmentName = chatAttachment?.name || null;

    if (voiceNoteDraft) {
      if (voiceNoteDraft.blob) {
        finalAttachmentUrl = await uploadBlobToStorage(voiceNoteDraft.blob, "voice-notes", "webm", voiceNoteDraft.url);
      } else {
        finalAttachmentUrl = voiceNoteDraft.url;
      }
      finalAttachmentName = `VOICE_NOTE_${voiceNoteDraft.duration}s.webm`;
    }

    const baseMsg: Record<string, any> = {
      sender_id: me?.id || null,
      sender_name: senderName,
      sender_code: senderCode,
      sender_role: me?.job_title || "Staff",
      content: chatInput.trim() || (voiceNoteDraft ? `🎤 Voice Note (${voiceNoteDraft.duration}s)` : ""),
      reply_to_id: replyingTo?.id || null,
      reply_preview: replyingTo ? `${replyingTo.sender_name}: ${replyingTo.content?.slice(0, 50)}` : null,
      attachment_url: finalAttachmentUrl,
      attachment_name: finalAttachmentName,
    };

    if (chatChannelType === "multi_user" && selectedRecipients.length > 0) {
      const rows = selectedRecipients.map((code) => ({
        ...baseMsg,
        channel_type: "direct",
        recipient_code: code,
      }));
      await supabase.from("studio_messages").insert(rows);
      setDispatchNotice(`Sent to ${selectedRecipients.length} colleagues`);
      setTimeout(() => setDispatchNotice(""), 2500);
    } else if (chatChannelType === "multi_dept" && selectedDepartments.length > 0) {
      await supabase.from("studio_messages").insert({
        ...baseMsg,
        channel_type: "group",
        recipient_code: `DEPT: ${selectedDepartments.join(", ")}`,
      });
      setDispatchNotice(`Sent to ${selectedDepartments.length} department(s)`);
      setTimeout(() => setDispatchNotice(""), 2500);
    } else {
      await supabase.from("studio_messages").insert({
        ...baseMsg,
        channel_type: chatChannelType === "direct" ? "direct" : "group",
        recipient_code: chatChannelType === "direct" ? chatTarget : "All Staff",
      });
    }

    const mentionMatches = Array.from((chatInput || "").matchAll(/\((LS-[0-9A-Za-z]+)\)/g)).map((m) => m[1]);
    if (chatChannelType === "multi_user" && selectedRecipients.length > 0) {
      triggerPushNotification({
        title: `💬 Message from ${senderName}`,
        message: chatInput.trim() || "Sent a voice note / attachment",
        url: "https://studioslavie.com/admin",
        targetType: "staff_codes",
        staffCodes: selectedRecipients,
      });
    } else if (chatChannelType === "direct" && chatTarget) {
      triggerPushNotification({
        title: `💬 Direct Message from ${senderName}`,
        message: chatInput.trim() || "Sent a voice note / attachment",
        url: "https://studioslavie.com/admin",
        targetType: "staff_codes",
        staffCodes: [chatTarget],
      });
    } else if (mentionMatches.length > 0) {
      triggerPushNotification({
        title: `📣 ${senderName} mentioned you in Studio Chat`,
        message: chatInput.trim(),
        url: "https://studioslavie.com/admin",
        targetType: "staff_codes",
        staffCodes: mentionMatches,
      });
    } else {
      triggerPushNotification({
        title: `💬 Studio Chat — ${senderName}`,
        message: chatInput.trim() || "Sent a voice note / attachment",
        url: "https://studioslavie.com/admin",
        targetType: "all_staff",
      });
    }

    setChatInput("");
    setReplyingTo(null);
    setChatAttachment(null);
    setVoiceNoteDraft(null);
    setShowEmojiPicker(false);
    setShowMentionList(false);
    loadOpenSpace();
  };

  const renderFormattedChatText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_]+\(LS-[0-9A-Za-z]+\)|@[A-Za-z0-9_-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const isMe = me?.staff_id && part.toUpperCase().includes(me.staff_id.toUpperCase());
        return (
          <span
            key={idx}
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold mx-0.5 ${
              isMe ? "bg-[#c7cb2d] text-black" : "bg-[#c7cb2d]/20 text-[#c7cb2d]"
            }`}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const filteredMessages = messages.filter((m) => {
    if (chatSearch.trim()) {
      const q = chatSearch.toLowerCase();
      if (
        !String(m.content || "").toLowerCase().includes(q) &&
        !String(m.sender_name || "").toLowerCase().includes(q) &&
        !String(m.recipient_code || "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (chatChannelType === "mentions") {
      const myCode = String(me?.staff_id || "").toUpperCase();
      const myFirst = String(me?.first_name || "").toLowerCase();
      return (
        (myCode && String(m.content || "").toUpperCase().includes(myCode)) ||
        (myFirst && String(m.content || "").toLowerCase().includes(`@${myFirst}`))
      );
    }
    if (chatChannelType === "group") return m.channel_type === "group" && m.recipient_code === "All Staff";
    if (chatChannelType === "direct") {
      return (
        m.recipient_code === chatTarget ||
        (m.sender_code === chatTarget && m.recipient_code === me?.staff_id)
      );
    }
    if (chatChannelType === "multi_dept") {
      if (selectedDepartments.length === 0) return String(m.recipient_code || "").startsWith("DEPT:");
      return selectedDepartments.some((d) => String(m.recipient_code || "").includes(d));
    }
    return true;
  });

  // ==========================================================================
  // FILTERED METRICS FOR GENERAL STAFF & EXECUTIVE DIRECTOR SUITE
  // ==========================================================================
  const isExec = !me || isExecutiveDirector(me);

  // Filtered non-confidential Case Studies & Staff by active Date/Department criteria
  const filteredCaseStudies = React.useMemo(() => {
    return caseStudies.filter((cs) => matchesDateFilter(cs.created_at));
  }, [caseStudies, matchesDateFilter]);

  const portfolioByCategory = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCaseStudies.forEach((cs) => {
      const cat = cs.category || "Event Branding";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = Math.max(1, filteredCaseStudies.length);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredCaseStudies]);

  const deptDistribution = React.useMemo(() => {
    const rows =
      selectedDeptFilter === "All Departments"
        ? staffColleagues
        : staffColleagues.filter((s) => s.department === selectedDeptFilter);
    const counts: Record<string, number> = {};
    rows.forEach((st) => {
      const dept = st.department || "Operations";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    const total = Math.max(1, rows.length);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [staffColleagues, selectedDeptFilter]);

  // Filtered personal leaves & vouchers for All-Staff view
  const filteredMyLeaves = React.useMemo(
    () => myLeaves.filter((l) => matchesDateFilter(l.created_at || l.start_date)),
    [myLeaves, matchesDateFilter]
  );
  const filteredMyVouchers = React.useMemo(
    () =>
      myVouchers.filter(
        (v) =>
          matchesDateFilter(v.created_at) &&
          (selectedCategoryFilter === "All Categories" || v.category === selectedCategoryFilter)
      ),
    [myVouchers, matchesDateFilter, selectedCategoryFilter]
  );

      // Executive Financial, Operational & Graphical Analytics
  const execAnalytics = React.useMemo(() => {
    if (!isExec) return null;

    // Cleanly parse numbers even if stored as "150,000" or "₦150,000"
    const toNum = (val: any): number => {
      if (typeof val === "number") return isFinite(val) ? val : 0;
      if (typeof val === "string") {
        const cleaned = val.replace(/[^0-9.-]+/g, "");
        const parsed = parseFloat(cleaned);
        return isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const extractServiceTag = (row: any, fallback = "Event Branding & Scenography") => {
      const rawCandidates = [
        row?.service_category,
        row?.service,
        row?.category,
        row?.project_title,
        row?.title,
        row?.project_name,
        row?.payment_for,
        row?.description,
      ]
        .filter(Boolean)
        .join(" ");

      const bracketMatch = rawCandidates.match(/\[([^\]]+)\]/);
      if (bracketMatch && bracketMatch[1]) {
        const inner = bracketMatch[1].trim();
        for (const s of STUDIO_SERVICE_CATEGORIES) {
          if (s.toLowerCase() === inner.toLowerCase() || s.toLowerCase().includes(inner.toLowerCase())) {
            return s;
          }
        }
        return inner;
      }

      const lower = rawCandidates.toLowerCase();
      if (lower.includes("craft") || lower.includes("tent") || lower.includes("desk") || lower.includes("kiosk") || lower.includes("fabrication"))
        return "Craft Productions & Custom Fabrication";
      if (lower.includes("camera") || lower.includes("tv stand") || lower.includes("rentage") || lower.includes("gadget") || lower.includes("equipment") || lower.includes("lens"))
        return "Gadgets & Equipment Rental";
      if (lower.includes("backdrop") || lower.includes("scenography") || lower.includes("event branding") || lower.includes("venue") || lower.includes("tunnel"))
        return "Event Branding & Scenography";
      if (lower.includes("rollup") || lower.includes("roll-up") || lower.includes("banner") || lower.includes("print") || lower.includes("flyer") || lower.includes("brochure"))
        return "Design & Print Production";
      if (lower.includes("corporate") || lower.includes("identity") || lower.includes("logo") || lower.includes("guideline"))
        return "Corporate Branding & Identity";
      if (lower.includes("gadget") || lower.includes("equipment") || lower.includes("rental"))
        return "Gadgets & Equipment Rental";
      if (lower.includes("photo") || lower.includes("portrait") || lower.includes("headshot"))
        return "Photography & Visual Coverage";
      if (lower.includes("video") || lower.includes("media") || lower.includes("documentary") || lower.includes("livestream"))
        return "Event Media & Video Production";
      if (lower.includes("souvenir") || lower.includes("merch") || lower.includes("tote") || lower.includes("gift") || lower.includes("jotter"))
        return "Souvenirs & Corporate Merch";
      if (lower.includes("print") || lower.includes("design") || lower.includes("brochure") || lower.includes("flyer") || lower.includes("roll-up"))
        return "Design & Print Production";
      if (lower.includes("ooh") || lower.includes("billboard") || lower.includes("signage") || lower.includes("wayfinding"))
        return "Out-of-Home (OOH) Advertising";
      if (lower.includes("stage") || lower.includes("lighting") || lower.includes("led"))
        return "Stage, Lighting & LED Screen Rental";
      if (lower.includes("strategy") || lower.includes("consult"))
        return "Brand Strategy & Consultation";

      return fallback;
    };

    const getRowDate = (r: any) =>
      r?.issue_date ||
      r?.payment_date ||
      r?.expense_date ||
      r?.start_date ||
      r?.date ||
      r?.created_at ||
      null;

    // Total contract/invoice value of a row
    const getRowTotalValue = (r: any) => {
      const candidates = [
        r?.project_value,
        r?.total_amount,
        r?.total,
        r?.contract_value,
        r?.amount,
        r?.subtotal,
        r?.budget,
        r?.price,
      ];
      for (const c of candidates) {
        const n = toNum(c);
        if (n > 0) return n;
      }
      return 0;
    };

    // Actual cleared/paid inflow on a project or invoice row
    const getRowClearedAmount = (r: any) => {
      const explicitPaid = Math.max(
        toNum(r?.amount_paid),
        toNum(r?.paid_amount),
        toNum(r?.amount_received),
        toNum(r?.deposit_paid)
      );
      if (explicitPaid > 0) return explicitPaid;

      const statusStr = String(r?.status || r?.payment_status || "").toLowerCase();
      if (["paid", "completed", "cleared", "settled", "approved"].includes(statusStr)) {
        return getRowTotalValue(r);
      }
      return 0;
    };

    const projectsInWindow = (execData.projects || []).filter((p) => {
      if (!matchesDateFilter(getRowDate(p))) return false;
      if (selectedServiceFilter !== "All Services" && extractServiceTag(p) !== selectedServiceFilter) return false;
      return true;
    });

    const invoicesInWindow = (execData.invoices || []).filter((i) => {
      if (!matchesDateFilter(getRowDate(i))) return false;
      if (selectedServiceFilter !== "All Services" && extractServiceTag(i) !== selectedServiceFilter) return false;
      return true;
    });

    const receiptsInWindow = (execData.receipts || []).filter((r) => {
      if (!matchesDateFilter(getRowDate(r))) return false;
      if (selectedServiceFilter !== "All Services" && extractServiceTag(r) !== selectedServiceFilter) return false;
      return true;
    });

    const vouchersInWindow = (execData.allVouchers || []).filter((v) => {
      if (!matchesDateFilter(getRowDate(v))) return false;
      if (selectedDeptFilter !== "All Departments" && v.department && v.department !== selectedDeptFilter) return false;
      if (selectedCategoryFilter !== "All Categories" && v.category && v.category !== selectedCategoryFilter) return false;
      return true;
    });

    const payrollInWindow = (execData.payroll || []).filter((p) => {
      if (!matchesDateFilter(getRowDate(p))) return false;
      if (selectedDeptFilter !== "All Departments" && p.department && p.department !== selectedDeptFilter) return false;
      return true;
    });

    const leavesInWindow = (execData.allLeaves || []).filter((l) => matchesDateFilter(getRowDate(l)));
    const inquiriesInWindow = (execData.inquiries || []).filter((inq) => matchesDateFilter(getRowDate(inq)));

    // Calculate Inflow & Unpaid Pipeline across Projects, Invoices, and Receipts
    const projectClearedTotal = projectsInWindow.reduce((acc, p) => acc + getRowClearedAmount(p), 0);
    const projectUnpaidTotal = projectsInWindow.reduce(
      (acc, p) => acc + Math.max(0, getRowTotalValue(p) - getRowClearedAmount(p)),
      0
    );

    const invoiceClearedTotal = invoicesInWindow.reduce((acc, i) => acc + getRowClearedAmount(i), 0);
    const invoiceUnpaidTotal = invoicesInWindow.reduce(
      (acc, i) => acc + Math.max(0, getRowTotalValue(i) - getRowClearedAmount(i)),
      0
    );

    const receiptClearedTotal = receiptsInWindow.reduce(
      (acc, r) => acc + Math.max(toNum(r?.amount_received), toNum(r?.amount_paid), toNum(r?.amount), toNum(r?.total)),
      0
    );

    // Avoid double-counting if receipts mirror paid invoices, while capturing all distinct inflows
    const combinedProjectAndInvoiceInflow = projectClearedTotal + invoiceClearedTotal;
    const totalInflow = Math.max(combinedProjectAndInvoiceInflow, receiptClearedTotal);
    const receivablesPipeline = projectUnpaidTotal + invoiceUnpaidTotal;
    const totalBilledVolume = totalInflow + receivablesPipeline;

    // Outflow (Approved/Cleared Vouchers + Direct Expenses + Disbursed Payroll)
    const disbursedVouchersAndExpenses = vouchersInWindow.filter((v) => getVoucherStageMeta(v).isDisbursedOutflow);
    const awaitingDisbursementVouchers = vouchersInWindow.filter(
      (v) => getVoucherStageMeta(v).stage === "approved_waiting"
    );
    const pendingVouchers = vouchersInWindow.filter(
      (v) => getVoucherStageMeta(v).stage === "pending"
    );

    const directExpensesOutflow = disbursedVouchersAndExpenses
      .filter((v) => getVoucherStageMeta(v).isDirectExpense)
      .reduce((acc, v) => acc + toNum(v?.amount || v?.total_amount || v?.cost), 0);

    const disbursedVouchersOutflow = disbursedVouchersAndExpenses
      .filter((v) => getVoucherStageMeta(v).isDisbursedVoucher)
      .reduce((acc, v) => acc + toNum(v?.amount || v?.total_amount || v?.cost), 0);

    const voucherOutflow = directExpensesOutflow + disbursedVouchersOutflow;

    const disbursedPayroll = payrollInWindow.filter((p) =>
      ["disbursed", "paid", "completed", "cleared", "approved"].includes(
        String(p?.status || p?.payment_status || "").toLowerCase()
      )
    );
    const payrollOutflow = disbursedPayroll.reduce(
      (acc, p) =>
        acc +
        Math.max(
          toNum(p?.net_pay),
          toNum(p?.amount_paid),
          toNum(p?.paid_salary),
          toNum(p?.salary),
          toNum(p?.gross_pay),
          toNum(p?.amount)
        ),
      0
    );

    const totalOutflow = voucherOutflow + payrollOutflow;
    const netPosition = totalInflow - totalOutflow;

    const pendingLeaves = leavesInWindow.filter((l) => String(l?.status || "pending").toLowerCase() === "pending");

    // Performance Benchmarks
    const targetAchievementPct =
      revenueTargetBenchmark > 0 ? Math.min(999, Math.round((totalInflow / revenueTargetBenchmark) * 100)) : 0;
    const operatingMarginPct = totalInflow > 0 ? Math.round((netPosition / totalInflow) * 100) : 0;
    const collectionEfficiencyPct = totalBilledVolume > 0 ? Math.round((totalInflow / totalBilledVolume) * 100) : 100;
    const totalRequests = vouchersInWindow.length + leavesInWindow.length;
    const clearedRequests =
      vouchersInWindow.filter((v) => ["approved", "disbursed", "paid"].includes(String(v?.status || "").toLowerCase())).length +
      leavesInWindow.filter((l) => String(l?.status || "").toLowerCase() === "approved").length;
    const approvalTurnaroundPct = totalRequests > 0 ? Math.round((clearedRequests / totalRequests) * 100) : 100;

    // Dynamic Timeline Buckets
    const months: Array<{ label: string; key: string; inflow: number; outflow: number; net: number }> = [];
    const now = new Date();

    if (datePreset === "this_month" || datePreset === "last_month") {
      const targetDate =
        datePreset === "this_month" ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const mPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
      const mShort = new Date(y, m, 1).toLocaleDateString("en-US", { month: "short" });
      for (let w = 1; w <= 4; w++) {
        months.push({ label: `${mShort} W${w}`, key: `${mPrefix}-W${w}`, inflow: 0, outflow: 0, net: 0 });
      }
    } else if (datePreset === "this_quarter") {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      for (let m = qStart; m <= qStart + 2; m++) {
        const d = new Date(now.getFullYear(), m, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ label: d.toLocaleDateString("en-US", { month: "short" }), key, inflow: 0, outflow: 0, net: 0 });
      }
    } else if (datePreset === "last_6_months") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ label: d.toLocaleDateString("en-US", { month: "short" }), key, inflow: 0, outflow: 0, net: 0 });
      }
    } else if (datePreset === "this_year" || datePreset === "last_year") {
      const yr = datePreset === "this_year" ? now.getFullYear() : now.getFullYear() - 1;
      for (let m = 0; m < 12; m++) {
        const d = new Date(yr, m, 1);
        const key = `${yr}-${String(m + 1).padStart(2, "0")}`;
        months.push({ label: d.toLocaleDateString("en-US", { month: "short" }), key, inflow: 0, outflow: 0, net: 0 });
      }
    } else if (datePreset === "custom" && customStartDate && customEndDate) {
      const s = new Date(customStartDate);
      const e = new Date(customEndDate);
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      while (cur <= e && months.length < 24) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
        const label = cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        months.push({ label, key, inflow: 0, outflow: 0, net: 0 });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({
          label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          key,
          inflow: 0,
          outflow: 0,
          net: 0,
        });
      }
    }

    const resolveBucketKey = (rawDateStr?: string | null) => {
      const d = rawDateStr ? new Date(rawDateStr) : new Date();
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      const ym = `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, "0")}`;
      if (datePreset === "this_month" || datePreset === "last_month") {
        const wk = Math.min(4, Math.max(1, Math.ceil(validDate.getDate() / 7)));
        return `${ym}-W${wk}`;
      }
      return ym;
    };

    projectsInWindow.forEach((p) => {
      const val = getRowClearedAmount(p);
      if (val > 0) {
        const k = resolveBucketKey(getRowDate(p));
        const bucket = months.find((x) => x.key === k) || months[months.length - 1];
        if (bucket) bucket.inflow += val;
      }
    });

    invoicesInWindow.forEach((inv) => {
      const val = getRowClearedAmount(inv);
      if (val > 0) {
        const k = resolveBucketKey(getRowDate(inv));
        const bucket = months.find((x) => x.key === k) || months[months.length - 1];
        if (bucket) bucket.inflow += val;
      }
    });

    if (combinedProjectAndInvoiceInflow === 0 && receiptClearedTotal > 0) {
      receiptsInWindow.forEach((rec) => {
        const val = Math.max(toNum(rec?.amount_received), toNum(rec?.amount_paid), toNum(rec?.amount));
        if (val > 0) {
          const k = resolveBucketKey(getRowDate(rec));
          const bucket = months.find((x) => x.key === k) || months[months.length - 1];
          if (bucket) bucket.inflow += val;
        }
      });
    }

    disbursedVouchersAndExpenses
      .forEach((v) => {
        const val = toNum(v?.amount || v?.total_amount || v?.cost);
        if (val > 0) {
          const k = resolveBucketKey(getRowDate(v));
          const bucket = months.find((x) => x.key === k) || months[months.length - 1];
          if (bucket) bucket.outflow += val;
        }
      });

    disbursedPayroll.forEach((p) => {
      const val = Math.max(toNum(p?.net_pay), toNum(p?.gross_pay), toNum(p?.amount), toNum(p?.salary));
      if (val > 0) {
        const k = resolveBucketKey(getRowDate(p));
        const bucket = months.find((x) => x.key === k) || months[months.length - 1];
        if (bucket) bucket.outflow += val;
      }
    });

    months.forEach((m) => {
      m.net = m.inflow - m.outflow;
    });

    const maxMonthVal = Math.max(1, ...months.map((m) => Math.max(m.inflow, m.outflow, Math.abs(m.net))));

    // Income by Service Stream Curve Data (Sorted automatically by highest income)
    const serviceStatsMap: Record<
      string,
      { name: string; cleared: number; pipeline: number; totalBilled: number; count: number }
    > = {};

    STUDIO_SERVICE_CATEGORIES.forEach((srv) => {
      serviceStatsMap[srv] = { name: srv, cleared: 0, pipeline: 0, totalBilled: 0, count: 0 };
    });

    const recordServiceRow = (row: any, clearedVal: number, unpaidVal: number) => {
      const srv = extractServiceTag(row);
      if (!serviceStatsMap[srv]) {
        serviceStatsMap[srv] = { name: srv, cleared: 0, pipeline: 0, totalBilled: 0, count: 0 };
      }
      serviceStatsMap[srv].cleared += clearedVal;
      serviceStatsMap[srv].pipeline += unpaidVal;
      serviceStatsMap[srv].totalBilled += clearedVal + unpaidVal;
      if (clearedVal > 0 || unpaidVal > 0) {
        serviceStatsMap[srv].count += 1;
      }
    };

    projectsInWindow.forEach((proj) => {
      const totalV = getRowTotalValue(proj);
      const clearedV = getRowClearedAmount(proj);
      const unpaidV = Math.max(0, totalV - clearedV);
      recordServiceRow(proj, clearedV, unpaidV);
    });

    invoicesInWindow.forEach((inv) => {
      const totalV = getRowTotalValue(inv);
      const clearedV = getRowClearedAmount(inv);
      const unpaidV = Math.max(0, totalV - clearedV);
      recordServiceRow(inv, clearedV, unpaidV);
    });

    if (combinedProjectAndInvoiceInflow === 0 && receiptClearedTotal > 0) {
      receiptsInWindow.forEach((rec) => {
        const clearedV = Math.max(toNum(rec?.amount_received), toNum(rec?.amount_paid), toNum(rec?.amount));
        recordServiceRow(rec, clearedV, 0);
      });
    }

    const maxServiceVolume = Math.max(
      1,
      ...Object.values(serviceStatsMap).map((s) => Math.max(s.cleared, s.totalBilled))
    );
    const totalClearedAcrossServices = Math.max(
      1,
      Object.values(serviceStatsMap).reduce((acc, s) => acc + s.cleared, 0)
    );

    const revenueByService = Object.values(serviceStatsMap)
      .map((s) => ({
        ...s,
        shortName: s.name.split("&")[0].replace("Out-of-Home (OOH)", "OOH").trim(),
        amount: s.cleared,
        pct: s.cleared > 0 ? Math.round((s.cleared / totalClearedAcrossServices) * 100) : 0,
        barWidthPct: Math.round((s.cleared / maxServiceVolume) * 100),
        pipelineWidthPct: Math.round((s.pipeline / maxServiceVolume) * 100),
        collectionRate: s.totalBilled > 0 ? Math.round((s.cleared / s.totalBilled) * 100) : 0,
      }))
      .sort((a, b) => b.cleared - a.cleared || b.totalBilled - a.totalBilled);

    // Outflow Distribution Donut (Sorted by actual spend)
    const catMap: Record<string, number> = {};
    disbursedVouchersAndExpenses
      .forEach((v) => {
        const c = v.category || "Operations";
        catMap[c] = (catMap[c] || 0) + toNum(v?.amount || v?.total_amount || v?.cost);
      });
    if (payrollOutflow > 0) {
      catMap["Staff Payroll (Disbursed)"] = payrollOutflow;
    }

    const totalExpenseVol = Math.max(1, Object.values(catMap).reduce((a, b) => a + b, 0));
    const palette = ["#c7cb2d", "#10b981", "#f59e0b", "#38bdf8", "#a855f7", "#60a5fa"];
    const topExpenseCategories = Object.entries(catMap)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount], idx) => ({
        name,
        amount,
        pct: Math.round((amount / totalExpenseVol) * 100),
        color: palette[idx % palette.length],
      }));

    return {
      totalInflow,
      totalOutflow,
      voucherOutflow,
      directExpensesOutflow,
      disbursedVouchersOutflow,
      payrollOutflow,
      netPosition,
      receivablesPipeline,
      pendingVouchersCount: pendingVouchers.length,
      pendingLeavesCount: pendingLeaves.length,
      inquiriesCount: inquiriesInWindow.length,
      targetAchievementPct,
      operatingMarginPct,
      collectionEfficiencyPct,
      approvalTurnaroundPct,
      months,
      maxMonthVal,
      maxServiceVolume,
      revenueByService,
      topExpenseCategories,
    };
  }, [
    isExec,
    execData,
    datePreset,
    customStartDate,
    customEndDate,
    matchesDateFilter,
    selectedServiceFilter,
    selectedDeptFilter,
    selectedCategoryFilter,
    revenueTargetBenchmark,
  ]);

  const resetOverviewFilters = () => {
    setDatePreset("this_year");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedDeptFilter("All Departments");
    setSelectedCategoryFilter("All Categories");
    setSelectedServiceFilter("All Services");
  };

  return (
    <div className="space-y-5">
      {/* WELCOME HEADER WITH OVERVIEW AS DEFAULT LANDING TAB */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono font-bold uppercase">
              {me?.staff_id || "STAFF"}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">
              {me?.job_title || "Team Member"} 
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold">
            Welcome back, {me?.first_name || "Team Member"}
          </h1>
        </div>

        {/* WORKSPACE TOOL TABS */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "overview", label: "Overview", icon: LayoutGrid },
            { id: "chat", label: `Studio Chat (${messages.length})`, icon: MessageSquare },
            { id: "leave", label: `Leave (${myLeaves.length})`, icon: Calendar },
            { id: "vouchers", label: `Vouchers (${myVouchers.length})`, icon: Receipt },
            { id: "promotion", label: "Request Promotion", icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  active
                    ? "bg-[#c7cb2d] text-black"
                    : "bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TAB 0 (DEFAULT): OVERVIEW DASHBOARD WITH DATE & CRITERIA FILTERS
      ===================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* GLOBAL OVERVIEW FILTER & PERFORMANCE CRITERIA BAR */}
          <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#c7cb2d] font-bold mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter Criteria:
              </span>
              {[
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_quarter", label: "This Quarter" },
                { id: "last_6_months", label: "6 Months" },
                { id: "this_year", label: "This Year (2026)" },
                { id: "last_year", label: "Prev Year (2025)" },
                { id: "all", label: "All Time" },
                { id: "custom", label: "Custom Range" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id as any)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                    datePreset === preset.id
                      ? "bg-[#c7cb2d] text-black font-bold"
                      : "bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {datePreset === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-2.5 py-1.5 text-[11px]"
                  />
                  <span className="text-xs text-[var(--text-dim)]">→</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-2.5 py-1.5 text-[11px]"
                  />
                </div>
              )}

              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3 py-1.5 text-[11px]"
              >
                <option value="All Services">All Studio Services</option>
                {STUDIO_SERVICE_CATEGORIES.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3 py-1.5 text-[11px]"
              >
                <option value="All Departments">All Departments</option>
                {STUDIO_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3 py-1.5 text-[11px]"
              >
                <option value="All Categories">All Expense Categories</option>
                {VOUCHER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetOverviewFilters}
                title="Reset Filters"
                className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              EXECUTIVE DIRECTOR EXCLUSIVE INTELLIGENCE SUITE (L7 / LS-01 ONLY)
          ----------------------------------------------------------------- */}
          {isExec && execAnalytics && (
            <div className="space-y-5 p-6 rounded-3xl bg-[var(--bg-card)] border border-[#c7cb2d]/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]/50 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-[#c7cb2d]/20 flex items-center justify-center text-[#c7cb2d]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold block">
                      Executive Director Intelligence
                    </span>
                    <h2 className="font-display text-lg font-bold">
                      Studio Financial, Operational & Benchmark Ratings
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Live Target Benchmark Adjuster */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[11px]">
                    <Target className="w-3.5 h-3.5 text-[#c7cb2d]" />
                    <span className="text-[var(--text-muted)]">Target (₦):</span>
                    <input
                      type="number"
                      step={500000}
                      value={revenueTargetBenchmark}
                      onChange={(e) => setRevenueTargetBenchmark(Math.max(100000, Number(e.target.value)))}
                      className="w-24 bg-transparent font-mono font-bold text-[#c7cb2d] focus:outline-none"
                    />
                  </div>

                  <Link
                    href="/admin/finance"
                    className="px-3.5 py-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[#c7cb2d] flex items-center gap-1"
                  >
                    Finance Desk <ArrowUpRight className="w-3.5 h-3.5 text-[#c7cb2d]" />
                  </Link>
                  <Link
                    href="/admin/hr"
                    className="px-3.5 py-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[#c7cb2d] flex items-center gap-1"
                  >
                    HR Queue ({execAnalytics.pendingLeavesCount + execAnalytics.pendingVouchersCount}){" "}
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#c7cb2d]" />
                  </Link>
                </div>
              </div>

              {/* EXECUTIVE 4-KPI ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>Period Revenue Inflow</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="font-display text-2xl font-bold text-emerald-400">
                    ₦{execAnalytics.totalInflow.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-dim)]">
                    Receivables Pipeline: ₦{execAnalytics.receivablesPipeline.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>Outflow</span>
                    <TrendingDown className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
                    ₦{execAnalytics.totalOutflow.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-dim)]">
                    Expenses: ₦{(execAnalytics.directExpensesOutflow || 0).toLocaleString()} • Vouchers: ₦{(execAnalytics.disbursedVouchersOutflow || 0).toLocaleString()} • Salary Paid: ₦{execAnalytics.payrollOutflow.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>Net Operating Balance</span>
                    <Wallet className="w-4 h-4 text-[#c7cb2d]" />
                  </div>
                  <p
                    className={`font-display text-2xl font-bold ${
                      execAnalytics.netPosition >= 0 ? "text-[#c7cb2d]" : "text-red-400"
                    }`}
                  >
                    ₦{execAnalytics.netPosition.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-dim)]">
                    Operating Margin: {execAnalytics.operatingMarginPct}%
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>Executive Action Queue</span>
                    <AlertCircle className="w-4 h-4 text-[#c7cb2d]" />
                  </div>
                  <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
                    {execAnalytics.pendingVouchersCount + execAnalytics.pendingLeavesCount} Pending
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-dim)]">
                    {execAnalytics.pendingVouchersCount} Vouchers • {execAnalytics.pendingLeavesCount} Leave • {execAnalytics.inquiriesCount} Inquiries
                  </p>
                </div>
              </div>

              {/* PERFORMANCE RATING SCORECARDS AGAINST BENCHMARK CRITERIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: "Revenue vs. Target Benchmark",
                    score: `${execAnalytics.targetAchievementPct}%`,
                    barPct: Math.min(100, execAnalytics.targetAchievementPct),
                    rating:
                      execAnalytics.targetAchievementPct >= 100
                        ? "Exceeding Target"
                        : execAnalytics.targetAchievementPct >= 65
                        ? "On Track"
                        : "Below Target",
                  },
                  {
                    label: "Net Operating Margin",
                    score: `${execAnalytics.operatingMarginPct}%`,
                    barPct: Math.max(0, Math.min(100, execAnalytics.operatingMarginPct)),
                    rating:
                      execAnalytics.operatingMarginPct >= 35
                        ? "Strong Margin"
                        : execAnalytics.operatingMarginPct >= 15
                        ? "Healthy"
                        : "Tight Margin",
                  },
                  {
                    label: "Invoice Collection Rate",
                    score: `${execAnalytics.collectionEfficiencyPct}%`,
                    barPct: Math.min(100, execAnalytics.collectionEfficiencyPct),
                    rating:
                      execAnalytics.collectionEfficiencyPct >= 80
                        ? "High Recovery"
                        : "Follow-up Needed",
                  },
                  {
                    label: "Approval Turnaround Speed",
                    score: `${execAnalytics.approvalTurnaroundPct}%`,
                    barPct: Math.min(100, execAnalytics.approvalTurnaroundPct),
                    rating:
                      execAnalytics.approvalTurnaroundPct >= 85
                        ? "Fast Clearance"
                        : "Pending Queue",
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--text-muted)] truncate">{metric.label}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold">
                        {metric.rating}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-lg font-bold">{metric.score}</span>
                      <Gauge className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <div
                        style={{ width: `${Math.max(5, metric.barPct)}%` }}
                        className="h-full rounded-full bg-[#c7cb2d]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* EXECUTIVE CHARTS ROW 1: DYNAMIC CASHFLOW & NET MARGIN TRAJECTORY + UNBIASED OUTFLOW DONUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                {/* DYNAMIC PERIOD CASHFLOW & NET MARGIN TRAJECTORY (HIGH-CONTRAST COLORS) */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <h3 className="font-display text-sm font-bold">
                          Cashflow & Net Margin Trajectory ({execAnalytics.months.length} Period View)
                        </h3>
                        
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981] inline-block" /> Inflow
                      </span>
                      <span className="flex items-center gap-1.5 text-[#c7cb2d] font-bold">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block" /> Outflow
                      </span>
                      <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                        ● Net Margin Curve
                      </span>
                    </div>
                  </div>

                  <div className="relative h-56 pt-6 px-3 border-b border-[var(--border-subtle)]/50 flex flex-col justify-end">
                    {/* Horizontal Scale Grid Lines */}
                    <div className="absolute inset-x-3 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
                      {[1, 0.66, 0.33, 0].map((ratio, idx) => (
                        <div
                          key={idx}
                          className="w-full border-t border-dashed border-[var(--border-subtle)]/30 flex items-center justify-end"
                        >
                          <span className="text-[9px] font-mono text-[var(--text-dim)] -mt-3 bg-[var(--bg-main)] px-1">
                            ₦{Math.round((execAnalytics.maxMonthVal * ratio) / 1000).toLocaleString()}k
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* High-Contrast Gold SVG Smooth Curve for Net Margin */}
                    {execAnalytics.months.length > 1 && (
                      <svg
                        viewBox="0 0 600 140"
                        className="absolute inset-x-4 top-8 h-36 w-[calc(100%-2rem)] overflow-visible pointer-events-none z-10"
                        preserveAspectRatio="none"
                      >
                        {(() => {
                          const pts = execAnalytics.months.map((m, idx) => {
                            const count = Math.max(1, execAnalytics.months.length - 1);
                            const x = Math.round((idx / count) * 540) + 30;
                            const norm = Math.max(0, m.net) / execAnalytics.maxMonthVal;
                            const y = 130 - Math.round(norm * 115);
                            return { x, y, label: m.label, net: m.net };
                          });
                          const dPath = pts.reduce((acc, pt, i, a) => {
                            if (i === 0) return `M ${pt.x},${pt.y}`;
                            const prev = a[i - 1];
                            const cx = Math.round((prev.x + pt.x) / 2);
                            return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
                          }, "");
                          return (
                            <>
                              <path
                                d={dPath}
                                fill="none"
                                stroke="#facc15"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              {pts.map((pt, idx) => (
                                <circle
                                  key={idx}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="4.5"
                                  fill="#facc15"
                                  stroke="#000"
                                  strokeWidth="1.5"
                                />
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    )}

                    {/* High-Contrast Emerald (#10b981) vs Crimson Rose (#f59e0b) Bars */}
                    <div className="relative z-0 flex items-end justify-between gap-2 h-40">
                      {execAnalytics.months.map((m) => {
                        const inHeight = Math.max(5, Math.round((m.inflow / execAnalytics.maxMonthVal) * 135));
                        const outHeight = Math.max(5, Math.round((m.outflow / execAnalytics.maxMonthVal) * 135));
                        return (
                          <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 group min-w-0">
                            <div className="w-full flex items-end justify-center gap-1 h-36">
                              <div
                                style={{ height: `${inHeight}px`, backgroundColor: "#10b981" }}
                                title={`${m.label} Inflow: ₦${m.inflow.toLocaleString()}`}
                                className="w-2.5 sm:w-4 rounded-t-md group-hover:brightness-110 transition-all"
                              />
                              <div
                                style={{ height: `${outHeight}px`, backgroundColor: "#f59e0b" }}
                                title={`${m.label} Outflow: ₦${m.outflow.toLocaleString()}`}
                                className="w-2.5 sm:w-4 rounded-t-md group-hover:brightness-110 transition-all"
                              />
                            </div>
                            <span className="text-[9px] font-mono text-[var(--text-muted)] pb-1 truncate max-w-full">
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* UNBIASED OUTFLOW DISTRIBUTION DONUT CHART (DYNAMICALLY SORTED BY ACTUAL SPEND) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-[#c7cb2d]" />
                      <div>
                        <h3 className="font-display text-sm font-bold">Outflow Distribution Graph</h3>
                        
                      </div>
                    </div>
                    <Link
                      href="/admin/finance?tab=expenses"
                      className="px-2 py-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[#c7cb2d] text-[9px] font-mono font-bold hover:border-[#c7cb2d] shrink-0 transition"
                    >
                      + Expense
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-1">
                    <div className="sm:col-span-5 flex justify-center">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="3.8"
                          />
                          {(() => {
                            let cumulativePct = 0;
                            return execAnalytics.topExpenseCategories.map((cat) => {
                              const dash = Math.max(0, cat.pct);
                              const offset = 100 - cumulativePct;
                              cumulativePct += dash;
                              if (dash <= 0) return null;
                              return (
                                <circle
                                  key={cat.name}
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke={cat.color}
                                  strokeWidth="3.8"
                                  strokeDasharray={`${dash} ${100 - dash}`}
                                  strokeDashoffset={offset}
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-mono uppercase text-[var(--text-dim)]">Outflow</span>
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                            ₦{Math.round(execAnalytics.totalOutflow / 1000).toLocaleString()}k
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-7 space-y-2.5">
                      {execAnalytics.topExpenseCategories.length === 0 ? (
                        <div className="space-y-1.5 text-center sm:text-left py-4">
                          <p className="text-xs font-semibold text-[var(--text-muted)]">
                            No outflow recorded in this period.
                          </p>
                          <p className="text-[10px] text-[var(--text-dim)]">
                            Approve a staff voucher or record a direct expense in Finance Desk to populate the distribution ring.
                          </p>
                        </div>
                      ) : (
                        execAnalytics.topExpenseCategories.map((cat) => (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1.5 truncate font-medium">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="truncate">{cat.name}</span>
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">
                                ₦{cat.amount.toLocaleString()} ({cat.pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                              <div
                                style={{
                                  width: `${Math.max(4, cat.pct)}%`,
                                  backgroundColor: cat.color,
                                }}
                                className="h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* EXECUTIVE CHARTS ROW 2: INCOME BY SERVICE STREAM — SMOOTH CURVE GRAPH (AUTO-SORTED BY INCOME) */}
              <div className="p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)]/40 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="font-display text-sm font-bold">
                        Income by Service Stream — Comparative Performance Curve
                      </h3>
                      
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      ● Cleared Inflow Curve
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                      ● Total Billed Pipeline Curve
                    </span>
                  </div>
                </div>

                {/* SVG SMOOTH SPLINE AREA & CURVE GRAPH SORTED BY SERVICE INCOME */}
                <div className="relative pt-4 pb-2 px-2">
                  <div className="h-52 w-full relative">
                    <svg
                      viewBox="0 0 900 180"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="clearedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((g, idx) => (
                        <line
                          key={idx}
                          x1="20"
                          x2="880"
                          y1={20 + g * 130}
                          y2={20 + g * 130}
                          stroke="rgba(255,255,255,0.07)"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {(() => {
                        const list = execAnalytics.revenueByService;
                        const count = Math.max(1, list.length - 1);
                        const maxV = Math.max(1, execAnalytics.maxServiceVolume);

                        const clearedPts = list.map((s: any, i: number) => ({
                          x: Math.round((i / count) * 840) + 30,
                          y: 150 - Math.round((s.cleared / maxV) * 125),
                          val: s.cleared,
                          name: s.shortName,
                        }));

                        const billedPts = list.map((s: any, i: number) => ({
                          x: Math.round((i / count) * 840) + 30,
                          y: 150 - Math.round((s.totalBilled / maxV) * 125),
                          val: s.totalBilled,
                          name: s.shortName,
                        }));

                        const buildSmoothPath = (pts: Array<{ x: number; y: number }>) =>
                          pts.reduce((acc, pt, i, a) => {
                            if (i === 0) return `M ${pt.x},${pt.y}`;
                            const prev = a[i - 1];
                            const cx = Math.round((prev.x + pt.x) / 2);
                            return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
                          }, "");

                        const clearedCurve = buildSmoothPath(clearedPts);
                        const billedCurve = buildSmoothPath(billedPts);
                        const clearedArea = `${clearedCurve} L ${clearedPts[clearedPts.length - 1].x},150 L ${clearedPts[0].x},150 Z`;
                        const billedArea = `${billedCurve} L ${billedPts[billedPts.length - 1].x},150 L ${billedPts[0].x},150 Z`;

                        return (
                          <>
                            <path d={billedArea} fill="url(#pipelineGrad)" />
                            <path
                              d={billedCurve}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2.2"
                              strokeDasharray="5 3"
                            />
                            <path d={clearedArea} fill="url(#clearedGrad)" />
                            <path
                              d={clearedCurve}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            {billedPts.map((pt, i) => (
                              <circle key={`b-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#38bdf8" />
                            ))}
                            {clearedPts.map((pt, i) => (
                              <g key={`c-${i}`}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="5"
                                  fill="#10b981"
                                  stroke="#000"
                                  strokeWidth="1.5"
                                />
                                {pt.val > 0 && (
                                  <text
                                    x={pt.x}
                                    y={pt.y - 10}
                                    textAnchor="middle"
                                    fill="#10b981"
                                    fontSize="10"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                  >
                                    ₦{Math.round(pt.val / 1000).toLocaleString()}k
                                  </text>
                                )}
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* X-Axis Sorted Service Labels */}
                  <div
                    className="grid gap-1 pt-2 border-t border-[var(--border-subtle)]/30"
                    style={{
                      gridTemplateColumns: `repeat(${execAnalytics.revenueByService.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {execAnalytics.revenueByService.map((srv: any, idx: number) => (
                      <div key={srv.name} className="text-center px-0.5">
                        <span className="text-[9px] font-mono text-[#c7cb2d] font-bold block">
                          #{idx + 1}
                        </span>
                        <span
                          title={srv.name}
                          className="text-[10px] font-mono text-[var(--text-muted)] truncate block"
                        >
                          {srv.shortName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COMPACT RANKED SERVICE LEADERBOARD CARDS (AUTO-SORTED BY INCOME) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {execAnalytics.revenueByService.map((srv: any, idx: number) => (
                    <div
                      key={srv.name}
                      className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-[9px] font-mono font-bold text-[#c7cb2d]">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold truncate">{srv.name}</span>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-dim)] mt-0.5">
                          {srv.count} txn(s) • {srv.pct}% share • {srv.collectionRate}% collected
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="text-xs font-bold text-emerald-400 block">
                          ₦{srv.cleared.toLocaleString()}
                        </span>
                        {srv.pipeline > 0 && (
                          <span className="text-[9px] text-sky-400 block">
                            +₦{srv.pipeline.toLocaleString()} billed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                      </div>
          )}

          {/* -----------------------------------------------------------------
              ALL-STAFF WORKSPACE OVERVIEW (SAFE, NON-CONFIDENTIAL SUMMARY)
          ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("leave")}
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 text-left space-y-1.5 transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>My Leave Allowance</span>
                <Calendar className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-display text-2xl font-bold">{remainingAnnualAllowance} Days Left</p>
              <p className="text-[11px] text-[var(--text-dim)]">
                {myUsedLeaveDays} of 20 annual days used • {filteredMyLeaves.length} in period
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("vouchers")}
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 text-left space-y-1.5 transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>My Expense Vouchers</span>
                <Receipt className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-display text-2xl font-bold">{filteredMyVouchers.length} in Period</p>
              <p className="text-[11px] text-[var(--text-dim)]">
                {filteredMyVouchers.filter((v) => v.status === "approved").length} approved •{" "}
                {filteredMyVouchers.filter((v) => v.status === "pending").length} pending
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 text-left space-y-1.5 transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>Studio Chat & Channels</span>
                <MessageSquare className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-display text-2xl font-bold">{messages.length} Messages</p>
              <p className="text-[11px] text-[var(--text-dim)]">
                {staffColleagues.length} active studio colleagues online
              </p>
            </button>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>Portfolio Output</span>
                <FolderKanban className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="font-display text-2xl font-bold">{filteredCaseStudies.length} Projects</p>
              <p className="text-[11px] text-[var(--text-dim)]">
                Published in selected period ({caseStudies.length} total)
              </p>
            </div>
          </div>

          {/* NON-CONFIDENTIAL VISUAL INSIGHTS & ACTIVITY ROW FOR ALL STAFF */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">Studio Portfolio Mix</h3>
                <span className="text-[10px] font-mono text-[var(--text-dim)]">
                  {filteredCaseStudies.length} Works
                </span>
              </div>

              {portfolioByCategory.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                  No case studies in this date range.
                </p>
              ) : (
                <div className="space-y-3">
                  {portfolioByCategory.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                        <span className="font-mono text-[11px] text-[#c7cb2d]">
                          {item.count} ({item.pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                        <div
                          style={{ width: `${Math.max(6, item.pct)}%` }}
                          className="h-full rounded-full bg-[#c7cb2d]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">Studio Departments</h3>
                <span className="text-[10px] font-mono text-[var(--text-dim)]">
                  {selectedDeptFilter === "All Departments" ? "All Units" : selectedDeptFilter}
                </span>
              </div>

              <div className="space-y-3">
                {deptDistribution.map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-[var(--text-primary)]">{d.name}</span>
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        {d.count} staff ({d.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                      <div
                        style={{ width: `${Math.max(6, d.pct)}%` }}
                        className="h-full rounded-full bg-white/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold">Recent Studio Messages</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className="text-[11px] font-mono text-[#c7cb2d] hover:underline cursor-pointer"
                  >
                    Open Chat →
                  </button>
                </div>

                {messages.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                    No messages in the workplace channel yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.slice(-3).reverse().map((m) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-[var(--bg-main)] space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#c7cb2d] font-bold">{m.sender_name}</span>
                          <FormattedDate date={m.created_at} className="text-[var(--text-dim)]" />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                          {m.content || "Sent an attachment"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)]/40 flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Quick Actions:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("leave")}
                    className="px-3 py-1 rounded-full bg-[var(--bg-main)] hover:border-[#c7cb2d] border border-[var(--border-subtle)] text-[11px] font-semibold cursor-pointer"
                  >
                    + Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("vouchers")}
                    className="px-3 py-1 rounded-full bg-[var(--bg-main)] hover:border-[#c7cb2d] border border-[var(--border-subtle)] text-[11px] font-semibold cursor-pointer"
                  >
                    + Voucher
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 1: STUDIO CHAT (100% PRESERVED)
      ===================================================================== */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 p-4 h-[560px]">
          <div className="lg:col-span-4 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)]/50 pr-0 lg:pr-3 pb-3 lg:pb-0 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2.5 shrink-0">
              {[
                { id: "group", label: "All Staff" },
                { id: "direct", label: "Direct (1:1)" },
                { id: "multi_user", label: "Multi-User" },
                { id: "multi_dept", label: "Departments" },
                { id: "mentions", label: "@Tagged You" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setChatChannelType(mode.id as any)}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition ${
                    chatChannelType === mode.id
                      ? "bg-[#c7cb2d] text-black"
                      : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="relative mb-2.5 shrink-0">
              <Search className="w-3 h-3 text-[var(--text-dim)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search messages or @tags..."
                className="w-full bg-[var(--bg-main)] rounded-xl pl-8 pr-3 py-1.5 text-[11px]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {chatChannelType === "group" && (
                <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 text-xs space-y-1">
                  <p className="font-bold text-[#c7cb2d]">General Workplace Channel</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Type <strong>@</strong> to tag colleagues or click the Mic icon to send a Voice Note.
                  </p>
                </div>
              )}

              {chatChannelType === "mentions" && (
                <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 text-xs space-y-1">
                  <p className="font-bold text-[#c7cb2d]">@Mentions Feed</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Messages where you ({me?.staff_id || "you"}) were tagged.
                  </p>
                </div>
              )}

              {chatChannelType === "direct" &&
                staffColleagues.map((st) => {
                  const active = chatTarget === st.staff_id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setChatTarget(st.staff_id)}
                      className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs cursor-pointer transition ${
                        active ? "bg-[#c7cb2d] text-black font-bold" : "bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/70"
                      }`}
                    >
                      <span className="truncate">
                        {st.first_name} {st.last_name} ({st.job_title || st.department})
                      </span>
                      <span className="text-[10px] font-mono opacity-75">{st.staff_id}</span>
                    </button>
                  );
                })}

              {chatChannelType === "multi_user" &&
                staffColleagues.map((st) => {
                  const checked = selectedRecipients.includes(st.staff_id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setSelectedRecipients((prev) =>
                          prev.includes(st.staff_id) ? prev.filter((c) => c !== st.staff_id) : [...prev, st.staff_id]
                        )
                      }
                      className={`w-full px-3 py-1.5 rounded-xl text-left flex items-center justify-between text-xs cursor-pointer ${
                        checked ? "bg-[#c7cb2d]/20 border border-[#c7cb2d] text-[#c7cb2d] font-bold" : "bg-[var(--bg-main)]"
                      }`}
                    >
                      <span className="truncate">
                        {st.first_name} {st.last_name} ({st.department?.split(" ")[0]})
                      </span>
                      <span className="text-[10px] font-mono">{checked ? "✓" : st.staff_id}</span>
                    </button>
                  );
                })}

              {chatChannelType === "multi_dept" &&
                STUDIO_DEPARTMENTS.map((dept) => {
                  const checked = selectedDepartments.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() =>
                        setSelectedDepartments((prev) =>
                          prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
                        )
                      }
                      className={`w-full px-3 py-1.5 rounded-xl text-left flex items-center justify-between text-xs cursor-pointer ${
                        checked ? "bg-[#c7cb2d]/20 border border-[#c7cb2d] text-[#c7cb2d] font-bold" : "bg-[var(--bg-main)]"
                      }`}
                    >
                      <span className="truncate">{dept}</span>
                      {checked && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
            <div className="pb-2 mb-2 border-b border-[var(--border-subtle)]/50 flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-[#c7cb2d] truncate">
                {chatChannelType === "group"
                  ? "All Staff Workplace Channel"
                  : chatChannelType === "mentions"
                  ? "Messages Tagging You (@Mentions)"
                  : chatChannelType === "direct"
                  ? `Direct Chat → ${chatTarget}`
                  : chatChannelType === "multi_user"
                  ? `Multi-User Group (${selectedRecipients.length} selected)`
                  : `Departmental Group (${selectedDepartments.join(", ") || "Select departments"})`}
              </span>
              {dispatchNotice && <span className="text-[10px] font-mono text-[#c7cb2d]">{dispatchNotice}</span>}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMessages.map((m) => {
                const isMe = m.sender_code === me?.staff_id;
                const isVoiceNote =
                  String(m.attachment_name || "").startsWith("VOICE_NOTE") ||
                  String(m.attachment_url || "").startsWith("data:audio") ||
                  /\.(webm|mp3|wav|ogg)$/i.test(String(m.attachment_url || ""));
                const isImg =
                  !isVoiceNote &&
                  m.attachment_url &&
                  (String(m.attachment_url).startsWith("data:image") ||
                    /\.(png|jpe?g|webp|gif)$/i.test(String(m.attachment_url)));

                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-2xl max-w-[85%] space-y-1 ${
                      isMe ? "ml-auto bg-[#c7cb2d]/15 border border-[#c7cb2d]/40" : "bg-[var(--bg-main)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                      <span className="font-bold text-[#c7cb2d]">
                        {m.sender_name} ({m.sender_code})
                        {m.recipient_code && m.recipient_code !== "All Staff" ? ` → ${m.recipient_code}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <FormattedDate date={m.created_at} className="text-[9px] text-[var(--text-dim)]" />
                        <button
                          type="button"
                          onClick={() => setReplyingTo(m)}
                          className="text-[var(--text-dim)] hover:text-[#c7cb2d] cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {m.reply_preview && (
                      <div className="px-2 py-1 rounded bg-black/30 border-l-2 border-[#c7cb2d] text-[10px] text-[var(--text-muted)] truncate">
                        {m.reply_preview}
                      </div>
                    )}

                    {m.content && (
                      <p className="text-xs text-[var(--text-primary)] leading-snug">
                        {renderFormattedChatText(m.content)}
                      </p>
                    )}

                    {m.attachment_url && (
                      <div className="pt-1">
                        {isVoiceNote ? (
                          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/40 border border-[#c7cb2d]/30">
                            <Volume2 className="w-4 h-4 text-[#c7cb2d] shrink-0 ml-1" />
                            <audio controls src={m.attachment_url} className="h-8 w-52 sm:w-64" />
                          </div>
                        ) : isImg ? (
                          <img
                            src={m.attachment_url}
                            alt={m.attachment_name || "Chat image"}
                            onClick={() => setPreviewProofUrl(m.attachment_url)}
                            className="max-h-36 rounded-xl object-cover cursor-pointer border border-white/10"
                          />
                        ) : (
                          <a
                            href={m.attachment_url}
                            download={m.attachment_name || "attachment"}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 text-[11px] font-mono text-[#c7cb2d]"
                          >
                            <Paperclip className="w-3 h-3" /> {m.attachment_name || "Download Attachment"}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {showMentionList && (
              <div className="p-2 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/60 max-h-36 overflow-y-auto space-y-1 mb-1.5 shadow-xl">
                {staffColleagues
                  .filter((s) =>
                    `${s.first_name} ${s.last_name} ${s.staff_id} ${s.department}`
                      .toLowerCase()
                      .includes(mentionQuery)
                  )
                  .slice(0, 6)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleInsertMention(s)}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs hover:bg-[#c7cb2d] hover:text-black flex items-center justify-between cursor-pointer"
                    >
                      <span>
                        {s.first_name} {s.last_name} — <span className="opacity-75">{s.job_title}</span>
                      </span>
                      <span className="font-mono text-[10px] font-bold">@{s.staff_id}</span>
                    </button>
                  ))}
              </div>
            )}

            {(replyingTo || chatAttachment || voiceNoteDraft || isRecordingVoice) && (
              <div className="px-3 py-1.5 mt-1 rounded-xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div className="flex items-center gap-2 truncate">
                  {isRecordingVoice && (
                    <span className="text-red-400 font-mono font-bold animate-pulse">
                      ● Recording Voice Note ({recordingSeconds}s)...
                    </span>
                  )}
                  {voiceNoteDraft && !isRecordingVoice && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#c7cb2d] font-bold">🎤 ({voiceNoteDraft.duration}s)</span>
                      <audio controls src={voiceNoteDraft.url} className="h-7 w-40" />
                    </div>
                  )}
                  {replyingTo && (
                    <span className="text-[var(--text-muted)] truncate">
                      Replying to <strong className="text-[#c7cb2d]">{replyingTo.sender_name}</strong>
                    </span>
                  )}
                  {chatAttachment && (
                    <span className="font-mono text-[#c7cb2d] truncate">📎 {chatAttachment.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isRecordingVoice) stopVoiceRecording();
                    setReplyingTo(null);
                    setChatAttachment(null);
                    setVoiceNoteDraft(null);
                  }}
                  className="text-red-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div className="flex flex-wrap gap-1.5 p-2 mt-1 rounded-xl bg-[var(--bg-main)] shrink-0">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setChatInput((prev) => prev + em)}
                    className="text-sm hover:scale-125 transition cursor-pointer px-1"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="pt-2 mt-1 flex items-center gap-1.5 shrink-0">
              <input
                ref={chatFileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xlsx,.zip"
                onChange={handleChatFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => chatFileRef.current?.click()}
                className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowMentionList((prev) => !prev)}
                className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
              >
                <Smile className="w-4 h-4" />
              </button>
              {!isRecordingVoice ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="p-2 rounded-xl bg-red-500 text-white animate-pulse cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
              <input
                value={chatInput}
                onChange={(e) => handleChatInputChange(e.target.value)}
                placeholder="Write a message or type @ to tag colleagues..."
                className="flex-1 bg-[var(--bg-main)] rounded-full px-4 py-2 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MY LEAVE APPLICATIONS (100% PRESERVED)
      ===================================================================== */}
      {activeTab === "leave" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleApplyLeave}
            className="lg:col-span-5 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">Apply for Leave ({remainingAnnualAllowance} Days Left)</h2>
            <select
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            >
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual / Emergency Leave">Casual / Emergency Leave</option>
              <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                required
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="date"
                required
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Relief / Handover Officer *
              </label>
              <select
                required
                value={leaveForm.handover_staff}
                onChange={(e) => setLeaveForm({ ...leaveForm, handover_staff: e.target.value })}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs"
              >
                <option value="">-- Select Relief Officer --</option>
                {staffColleagues
                  .filter((st) => st.id !== me?.id && (st.status || "active") === "active")
                  .map((st) => (
                    <option
                      key={st.id}
                      value={`${st.first_name} ${st.last_name} (${st.staff_id})`}
                    >
                      {st.first_name} {st.last_name} ({st.staff_id}) — {st.job_title || st.department}
                    </option>
                  ))}
              </select>
            </div>
            <textarea
              required
              rows={2}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Reason & handover notes..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase cursor-pointer"
            >
              Submit Leave Request ({requestedDays} Working Days)
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {myLeaves.slice((leavePage - 1) * 5, leavePage * 5).map((lv) => (
              <div key={lv.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold">{lv.leave_type} ({lv.working_days} working days)</span>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">
                      {lv.start_date} → {lv.end_date} • Relief: {lv.handover_staff || "—"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-mono uppercase text-[#c7cb2d]">
                    {lv.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{lv.reason}</p>
              </div>
            ))}
            {myLeaves.length === 0 && (
              <div className="p-8 rounded-3xl bg-[var(--bg-card)] text-center text-xs text-[var(--text-muted)]">
                You have not submitted any leave applications yet.
              </div>
            )}
            <AdminPagination
              currentPage={leavePage}
              totalItems={myLeaves.length}
              pageSize={5}
              onPageChange={setLeavePage}
              itemLabel="leave requests"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: MY EXPENSE VOUCHERS (100% PRESERVED)
      ===================================================================== */}
      {activeTab === "vouchers" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateVoucher}
            className="lg:col-span-5 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">Raise Expense Voucher</h2>
            <input
              required
              value={voucherForm.title}
              onChange={(e) => setVoucherForm({ ...voucherForm, title: e.target.value })}
              placeholder="Voucher Title *"
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                value={voucherForm.project_ref}
                onChange={(e) => setVoucherForm({ ...voucherForm, project_ref: e.target.value })}
                placeholder="Project Ref (Optional)"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <select
                value={voucherForm.category}
                onChange={(e) => setVoucherForm({ ...voucherForm, category: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                {VOUCHER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {voucherItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2">
                  <input
                    placeholder="Item description"
                    value={row.item}
                    onChange={(e) => {
                      const next = [...voucherItems];
                      next[idx].item = e.target.value;
                      setVoucherItems(next);
                    }}
                    className="col-span-3 bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => {
                      const next = [...voucherItems];
                      next[idx].qty = Number(e.target.value);
                      setVoucherItems(next);
                    }}
                    className="col-span-1 bg-[var(--bg-main)] rounded-xl px-2 py-2 text-xs font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Unit ₦"
                    value={row.unitPrice}
                    onChange={(e) => {
                      const next = [...voucherItems];
                      next[idx].unitPrice = Number(e.target.value);
                      setVoucherItems(next);
                    }}
                    className="col-span-2 bg-[var(--bg-main)] rounded-xl px-2 py-2 text-xs font-mono"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVoucherItems([...voucherItems, { item: "", qty: 1, unitPrice: 0 }])}
                className="text-[11px] font-mono text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <textarea
              rows={2}
              value={voucherForm.description}
              onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
              placeholder="Notes or payout account breakdown..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />

            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
                  Receipt / Image Proof (Optional)
                </span>
                <label className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-[#c7cb2d]">
                  <ImageIcon className="w-3.5 h-3.5 text-[#c7cb2d]" /> Attach Image
                  <input type="file" accept="image/*,application/pdf" onChange={handleVoucherAttachment} className="hidden" />
                </label>
              </div>
              {voucherForm.attachment_data && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-mono text-[#c7cb2d] truncate">{voucherForm.attachment_name}</span>
                  <button
                    type="button"
                    onClick={() => setVoucherForm({ ...voucherForm, attachment_data: "", attachment_name: "" })}
                    className="text-xs text-red-400 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <input
              value={voucherForm.initial_comment}
              onChange={(e) => setVoucherForm({ ...voucherForm, initial_comment: e.target.value })}
              placeholder="Add an initial comment (Optional)..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />

            {voucherNotice && (
              <p className="text-xs font-mono font-bold text-[#c7cb2d]">{voucherNotice}</p>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono font-bold text-[#c7cb2d]">
                Total: ₦{computedVoucherTotal.toLocaleString()}
              </span>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase cursor-pointer"
              >
                Submit Voucher
              </button>
            </div>
          </form>

          <div className="lg:col-span-7 space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {myVouchers.slice((voucherPage - 1) * 5, voucherPage * 5).map((v) => {
              const vComments = Array.isArray(v.comments) ? v.comments : [];
              return (
                <div key={v.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-[#c7cb2d]">
                        {v.voucher_no || v.voucher_code} • {v.category}
                      </span>
                      <h3 className="font-display text-sm font-bold">{v.title}</h3>
                      {v.description && <p className="text-xs text-[var(--text-muted)]">{v.description}</p>}
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-[#c7cb2d] block">
                        ₦{Number(v.amount || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">{v.status}</span>
                    </div>
                  </div>

                  {v.attachment_url && (
                    <button
                      type="button"
                      onClick={() => setPreviewProofUrl(v.attachment_url)}
                      className="text-[11px] font-mono text-[#c7cb2d] underline cursor-pointer"
                    >
                      View Attached Proof ({v.attachment_name || "Image"})
                    </button>
                  )}

                  <div className="pt-2 border-t border-[var(--border-subtle)]/40 space-y-2">
                    {vComments.map((c: any, i: number) => (
                      <div key={i} className="px-3 py-1.5 rounded-xl bg-[var(--bg-main)] text-xs">
                        <span className="font-mono text-[10px] text-[#c7cb2d] font-bold">{c.author}: </span>
                        <span>{c.text}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={voucherCommentInputs[v.id] || ""}
                        onChange={(e) => setVoucherCommentInputs((prev) => ({ ...prev, [v.id]: e.target.value }))}
                        placeholder="Write a comment & press Enter..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddVoucherComment(v);
                          }
                        }}
                        className="flex-1 bg-[var(--bg-main)] rounded-xl px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddVoucherComment(v)}
                        className="px-3 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-[11px] font-bold cursor-pointer"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {myVouchers.length === 0 && (
              <div className="p-8 rounded-3xl bg-[var(--bg-card)] text-center text-xs text-[var(--text-muted)]">
                You have not submitted any expense vouchers yet.
              </div>
            )}
            <AdminPagination
              currentPage={voucherPage}
              totalItems={myVouchers.length}
              pageSize={5}
              onPageChange={setVoucherPage}
              itemLabel="vouchers"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: REQUEST PROMOTION (100% PRESERVED)
      ===================================================================== */}
      {activeTab === "promotion" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSubmitPromoRequest}
            className="lg:col-span-5 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">Request Promotion / Step Upgrade</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Requested Level
                </label>
                <select
                  value={promoReqForm.desired_level}
                  onChange={(e) => setPromoReqForm({ ...promoReqForm, desired_level: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                >
                  {HIERARCHY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Requested Step (1 – 7)
                </label>
                <select
                  value={promoReqForm.desired_step}
                  onChange={(e) => setPromoReqForm({ ...promoReqForm, desired_step: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#c7cb2d]"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((st) => (
                    <option key={st} value={st}>
                      Step {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                value={promoReqForm.desired_title}
                onChange={(e) => setPromoReqForm({ ...promoReqForm, desired_title: e.target.value })}
                placeholder="Proposed Job Title"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
              <select
                value={promoReqForm.desired_employment_type}
                onChange={(e) => setPromoReqForm({ ...promoReqForm, desired_employment_type: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                {EMPLOYMENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              required
              rows={3}
              value={promoReqForm.reason}
              onChange={(e) => setPromoReqForm({ ...promoReqForm, reason: e.target.value })}
              placeholder="Key achievements, completed projects & justification..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />

            {promoNotice && <p className="text-xs font-mono text-[#c7cb2d]">{promoNotice}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase cursor-pointer"
            >
              Submit Promotion Request
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {myPromotions.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                    {p.request_status || "Approved"}
                  </span>
                  <h3 className="font-display text-sm font-bold">
                    {p.previous_level} → <span className="text-[#c7cb2d]">{p.new_level}</span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {p.previous_title} → {p.new_title}
                  </p>
                </div>
                <FormattedDate date={p.effective_date || p.created_at} className="text-[10px] font-mono text-[var(--text-dim)]" />
              </div>
            ))}
            {myPromotions.length === 0 && (
              <div className="p-8 rounded-3xl bg-[var(--bg-card)] text-center text-xs text-[var(--text-muted)]">
                No promotion history or pending requests for your profile yet.
              </div>
            )}
          </div>
        </div>
      )}

      {previewProofUrl && (
        <div
          onClick={() => setPreviewProofUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <img src={previewProofUrl} alt="Proof" className="max-h-[85vh] max-w-4xl rounded-2xl object-contain" />
        </div>
      )}
      <VoucherActionModals
        activeVoucher={activeWsVoucher}
        modalMode={wsVoucherModalMode}
        currentUser={me}
        onClose={() => {
          setActiveWsVoucher(null);
          setWsVoucherModalMode(null);
        }}
        onVoucherUpdated={(updated) => {
          setMyVouchers((prev: any[]) =>
            prev.map((v: any) => (v.id === updated.id ? { ...v, ...updated } : v))
          );
          setExecData((prev: any) => ({
            ...prev,
            allVouchers: (prev.allVouchers || []).map((v: any) =>
              v.id === updated.id ? { ...v, ...updated } : v
            ),
          }));
        }}
      />
    </div>
  );
}
