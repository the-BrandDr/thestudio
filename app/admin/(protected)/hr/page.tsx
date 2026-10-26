"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Users, UserPlus, Calendar, Receipt, Award, MessageSquare, 
  Edit3, X, Check, Search, Send, Paperclip, Smile, Pin, Reply, 
  Plus, Trash2, FileText, ArrowRight, CheckSquare, Square
} from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";
import PassportCropper from "@/components/admin/passport-cropper";

const HIERARCHY_LEVELS = [
  "L1 - Intern / Trainee",
  "L2 - Junior Associate",
  "L3 - Mid-Level Specialist",
  "L4 - Senior Specialist",
  "L5 - Lead / Principal",
  "L6 - Department Head",
  "L7 - Chief Strategist / Executive",
];

const ALL_PERMISSIONS = [
  { id: "chief_strategist", label: "Chief Strategist" },
  { id: "head_of_operations", label: "Head of Operations" },
  { id: "head_of_finance", label: "Head of Finance" },
  { id: "hr", label: "HR Management" },
  { id: "finance", label: "Finance Desk" },
  { id: "portfolio", label: "Portfolio CMS" },
  { id: "inquiries", label: "Inquiries" },
  { id: "staff", label: "Standard Staff" },
];

const QUICK_EMOJIS = ["👍", "✅", "🔥", "👏", "🎯", "🚀", "🙌", "📌", "⚡", "💡", "🤝", "🎉"];

export default function HRAndWorkspaceSuite() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = React.useState<"directory" | "onboard" | "leave" | "vouchers" | "promotions" | "chat">("directory");
  const [loading, setLoading] = React.useState(true);

  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [leaveList, setLeaveList] = React.useState<any[]>([]);
  const [voucherList, setVoucherList] = React.useState<any[]>([]);
  const [promotionList, setPromotionList] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);

  // Directory filters & editing
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [editingStaff, setEditingStaff] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Onboarding state
  const [newStaff, setNewStaff] = React.useState({
    staff_id: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "staff",
    hierarchy_level: "L3 - Mid-Level Specialist",
    permissions: ["staff", "portfolio"],
    department: "Design & Creative",
    job_title: "",
    employment_type: "Full-Time",
    phone: "",
    location: "Ogbomoso, Oyo State",
    passport_url: "",
    salary_amount: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_no: "",
    temporary_password: "Lavie@2026",
  });
  const [onboardStatus, setOnboardStatus] = React.useState("");

  // Leave state
  const [leaveForm, setLeaveForm] = React.useState({
    leave_type: "Annual Leave",
    start_date: "",
    end_date: "",
    handover_staff: "",
    reason: "",
  });

  // Detailed Voucher state
  const [voucherForm, setVoucherForm] = React.useState({
    title: "",
    project_ref: "",
    category: "Operational Expense",
    payment_method: "Bank Transfer",
    bank_name: "",
    bank_account_name: "",
    bank_account_no: "",
    description: "",
    attachment_data: "",
    attachment_name: "",
  });
  const [voucherItems, setVoucherItems] = React.useState<Array<{ item: string; qty: number; unitPrice: number }>>([
    { item: "", qty: 1, unitPrice: 0 },
  ]);

  // Promotion state
  const [promoForm, setPromoForm] = React.useState({
    target_staff_id: "",
    new_level: "L4 - Senior Specialist",
    new_title: "",
    new_role: "staff",
    new_salary: "",
    effective_date: "",
    notes: "",
  });

  // Compact Studio Chat + Multi-DM Dispatch state
  const [chatChannelType, setChatChannelType] = React.useState<"group" | "direct" | "multi_dm">("group");
  const [chatTarget, setChatTarget] = React.useState("All Staff");
  const [selectedRecipients, setSelectedRecipients] = React.useState<string[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatSearch, setChatSearch] = React.useState("");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<any | null>(null);
  const [chatAttachment, setChatAttachment] = React.useState<{ url: string; name: string; type: string } | null>(null);
  const [dispatchNotice, setDispatchNotice] = React.useState("");
  const chatFileRef = React.useRef<HTMLInputElement>(null);

  const loadWorkspaceData = React.useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const [
      { data: staffData },
      { data: leaveData },
      { data: voucherData },
      { data: promoData },
      { data: msgData }
    ] = await Promise.all([
      supabase.from("staff_profiles").select("*").order("staff_id", { ascending: true }),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("internal_messages").select("*").order("created_at", { ascending: true }).limit(200)
    ]);

    if (staffData) {
      setStaffList(staffData);
      const me = staffData.find((s) => s.id === user?.id) || staffData[0];
      setCurrentUser(me);
      const nextNum = staffData.length + 1;
      setNewStaff((prev) => ({
        ...prev,
        staff_id: prev.staff_id || `LS-${String(nextNum).padStart(2, "0")}`,
      }));
      if (me) {
        setVoucherForm((prev) => ({
          ...prev,
          bank_name: prev.bank_name || me.bank_name || "",
          bank_account_name: prev.bank_account_name || me.bank_account_name || `${me.first_name} ${me.last_name}`,
          bank_account_no: prev.bank_account_no || me.bank_account_no || "",
        }));
      }
    }
    if (leaveData) setLeaveList(leaveData);
    if (voucherData) setVoucherList(voucherData);
    if (promoData) setPromotionList(promoData);
    if (msgData) setMessages(msgData);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const myPerms: string[] = currentUser?.permissions || [currentUser?.role];
  const isSuper = currentUser?.role === "super_admin" || myPerms.includes("super_admin");
  const isChiefStrategist = currentUser?.staff_id === "LS-01" || myPerms.includes("chief_strategist") || currentUser?.job_title?.toLowerCase().includes("chief strategist");
  const isHeadOfFinance = currentUser?.role === "finance" || (myPerms.includes("head_of_finance") && currentUser?.staff_id !== "LS-01");
  const isHeadOfOps = myPerms.includes("head_of_operations") && currentUser?.staff_id !== "LS-01";
  const isHR = currentUser?.role === "hr" || (myPerms.includes("hr") && currentUser?.staff_id !== "LS-01");

  const togglePermission = (list: string[], perm: string) =>
    list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];

  const toggleRecipientSelection = (staffCode: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(staffCode) ? prev.filter((c) => c !== staffCode) : [...prev, staffCode]
    );
  };

  // 1. Save Staff Edits
  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);
    await supabase
      .from("staff_profiles")
      .update({
        first_name: editingStaff.first_name.trim(),
        last_name: editingStaff.last_name.trim(),
        staff_id: editingStaff.staff_id.trim().toUpperCase(),
        role: editingStaff.role,
        hierarchy_level: editingStaff.hierarchy_level,
        permissions: editingStaff.permissions || [editingStaff.role],
        department: editingStaff.department,
        job_title: editingStaff.job_title,
        employment_type: editingStaff.employment_type,
        phone: editingStaff.phone,
        location: editingStaff.location,
        passport_url: editingStaff.passport_url,
        salary_amount: Number(editingStaff.salary_amount || 0),
        bank_name: editingStaff.bank_name,
        bank_account_name: editingStaff.bank_account_name,
        bank_account_no: editingStaff.bank_account_no,
        status: editingStaff.status,
      })
      .eq("id", editingStaff.id);
    setSaving(false);
    setEditingStaff(null);
    loadWorkspaceData();
  };

  // 2. Onboard Staff
  const handleOnboardStaff = async (e: React.FormEvent) => {
    try {
      await fetch("/api/admin/onboard-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStaff.email,
          password: (newStaff as any).temporary_password || "Lavie@2026",
          first_name: newStaff.first_name,
          last_name: newStaff.last_name,
          role: newStaff.role,
          hierarchy_level: newStaff.hierarchy_level,
          department: newStaff.department,
          job_title: newStaff.job_title,
        }),
      });
    } catch (_) {}
    e.preventDefault();
    setSaving(true);
    setOnboardStatus("");

    const { error } = await supabase.from("staff_profiles").insert({
      id: crypto.randomUUID(),
      staff_id: newStaff.staff_id.trim().toUpperCase(),
      first_name: newStaff.first_name.trim(),
      last_name: newStaff.last_name.trim(),
      email: newStaff.email.trim().toLowerCase(),
      role: newStaff.role,
      hierarchy_level: newStaff.hierarchy_level,
      permissions: newStaff.permissions,
      department: newStaff.department,
      job_title: newStaff.job_title,
      employment_type: newStaff.employment_type,
      phone: newStaff.phone,
      location: newStaff.location,
      passport_url: newStaff.passport_url,
      salary_amount: Number(newStaff.salary_amount || 0),
      bank_name: newStaff.bank_name,
      bank_account_name: newStaff.bank_account_name || `${newStaff.first_name} ${newStaff.last_name}`.trim(),
      bank_account_no: newStaff.bank_account_no,
      status: "active",
    });

    setSaving(false);
    if (error) {
      setOnboardStatus("Error: " + error.message);
    } else {
      setOnboardStatus("Personnel onboarded!");
      await loadWorkspaceData();
      setTimeout(() => setActiveTab("directory"), 800);
    }
  };

  // 3. Leave Approval Pipeline
  
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
  const myUsedLeaveDays = leaveList
    .filter((l) => l.staff_code === currentUser?.staff_id && l.status === "approved")
    .reduce((acc, l) => acc + (Number(l.working_days) || countWorkingDays(l.start_date, l.end_date)), 0);
  const maxPerApp = leaveForm.leave_type === "Annual Leave" ? 10 : 3;
  const remainingAnnualAllowance = Math.max(0, 20 - myUsedLeaveDays);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedDays <= 0) { alert('End date must be after start date.'); return; }
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const startMidnight = new Date(leaveForm.start_date); startMidnight.setHours(0,0,0,0);
    const advanceDays = Math.round((startMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    const noticeDaysRequired = leaveForm.leave_type === "Annual Leave" ? 14 : leaveForm.leave_type.includes("Sick") ? 0 : 3;
    if (advanceDays < noticeDaysRequired) {
      alert(leaveForm.leave_type === "Annual Leave" ? "Annual Leave must be applied at least 2 weeks (14 days) in advance." : "This leave type must be applied at least 3 days in advance (only Sick Leave is exempt).");
      return;
    }
    if (requestedDays > maxPerApp) { alert(leaveForm.leave_type === 'Annual Leave' ? 'Annual leave cannot exceed 2 weeks (10 working days) at a time.' : 'This leave category cannot exceed 3 working days per application.'); return; }
    if (myUsedLeaveDays + requestedDays > 20) { alert('Total paid leave cannot exceed 4 weeks (20 working days) in a year.'); return; }
    if (!currentUser) return;
    setSaving(true);
    await supabase.from("leave_requests").insert({
      staff_id: currentUser.id,
      staff_name: `${currentUser.first_name} ${currentUser.last_name}`,
      staff_code: currentUser.staff_id,
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
    setLeaveForm({ leave_type: "Annual Leave", start_date: "", end_date: "", handover_staff: "", reason: "" });
    setSaving(false);
    loadWorkspaceData();
  };

  const handleLeaveStageApproval = async (
    lv: any,
    stage: "hr" | "ops" | "strategist",
    decision: "approved" | "rejected"
  ) => {
    const actor = `${currentUser?.first_name} (${currentUser?.staff_id})`;
    const nowIso = new Date().toISOString();
    const patch: any = {};

    if (stage === "hr") {
      patch.hr_status = decision;
      patch.hr_by = actor;
      patch.hr_at = nowIso;
    } else if (stage === "ops") {
      patch.ops_status = decision;
      patch.ops_by = actor;
      patch.ops_at = nowIso;
    } else if (stage === "strategist") {
      patch.strategist_status = decision;
      patch.strategist_by = actor;
      patch.strategist_at = nowIso;
    }

    const nextHr = stage === "hr" ? decision : (lv.hr_status || "pending");
    const nextOps = stage === "ops" ? decision : (lv.ops_status || "pending");
    const nextStrat = stage === "strategist" ? decision : (lv.strategist_status || "pending");

    if (decision === "rejected") {
      patch.status = "rejected";
    } else if (nextHr === "approved" && nextOps === "approved" && nextStrat === "approved") {
      patch.status = "approved";
    } else {
      patch.status = "pending";
    }

    patch.reviewed_by = actor;
    await supabase.from("leave_requests").update(patch).eq("id", lv.id);
    loadWorkspaceData();
  };

  // 4. Vouchers
  const computedVoucherTotal = voucherItems.reduce(
    (acc, row) => acc + Number(row.qty || 0) * Number(row.unitPrice || 0),
    0
  );

  const handleVoucherAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setVoucherForm((prev) => ({
        ...prev,
        attachment_data: ev.target?.result as string,
        attachment_name: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRaiseVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || computedVoucherTotal <= 0) return;
    setSaving(true);
    const code = "LV-" + Math.floor(1000 + Math.random() * 9000);

    await supabase.from("expense_vouchers").insert({
      voucher_code: code,
      staff_id: currentUser.id,
      staff_name: `${currentUser.first_name} ${currentUser.last_name}`,
      staff_code: currentUser.staff_id,
      title: voucherForm.title,
      project_ref: voucherForm.project_ref,
      category: voucherForm.category,
      payment_method: voucherForm.payment_method,
      amount: computedVoucherTotal,
      bank_name: voucherForm.bank_name,
      bank_account_name: voucherForm.bank_account_name,
      bank_account_no: voucherForm.bank_account_no,
      bank_details: `${voucherForm.bank_name} • ${voucherForm.bank_account_name} (${voucherForm.bank_account_no})`,
      line_items: voucherItems,
      description: voucherForm.description,
      attachment_data: voucherForm.attachment_data || null,
      attachment_name: voucherForm.attachment_name || null,
      status: "pending",
      finance_status: "pending",
      strategist_status: "pending",
    });

    setVoucherForm((prev) => ({
      ...prev,
      title: "",
      project_ref: "",
      description: "",
      attachment_data: "",
      attachment_name: "",
    }));
    setVoucherItems([{ item: "", qty: 1, unitPrice: 0 }]);
    setSaving(false);
    loadWorkspaceData();
  };

  const handleVoucherStageApproval = async (
    vc: any,
    stage: "finance" | "strategist" | "disburse",
    decision: "approved" | "rejected" | "paid"
  ) => {
    const actor = `${currentUser?.first_name} (${currentUser?.staff_id})`;
    const nowIso = new Date().toISOString();
    const patch: any = { reviewed_by: actor };

    if (stage === "disburse") {
      patch.status = "paid";
    } else {
      if (stage === "finance") {
        patch.finance_status = decision;
        patch.finance_by = actor;
        patch.finance_at = nowIso;
      } else if (stage === "strategist") {
        patch.strategist_status = decision;
        patch.strategist_by = actor;
        patch.strategist_at = nowIso;
      }

      const nextFin = stage === "finance" ? decision : (vc.finance_status || "pending");
      const nextStrat = stage === "strategist" ? decision : (vc.strategist_status || "pending");

      if (decision === "rejected") {
        patch.status = "rejected";
      } else if (nextFin === "approved" && nextStrat === "approved") {
        patch.status = "approved";
      } else {
        patch.status = "pending";
      }
    }

    await supabase.from("expense_vouchers").update(patch).eq("id", vc.id);
    loadWorkspaceData();
  };

  // 5. Promotions
  const handleIssuePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = staffList.find((s) => s.id === promoForm.target_staff_id);
    if (!target || !currentUser) return;
    setSaving(true);

    await supabase.from("staff_promotions").insert({
      staff_id: target.id,
      staff_name: `${target.first_name} ${target.last_name}`,
      staff_code: target.staff_id,
      previous_level: target.hierarchy_level || "L3 - Mid-Level Specialist",
      new_level: promoForm.new_level,
      previous_title: target.job_title || "Staff",
      new_title: promoForm.new_title,
      previous_role: target.role,
      new_role: promoForm.new_role,
      previous_salary: Number(target.salary_amount || 0),
      new_salary: promoForm.new_salary ? Number(promoForm.new_salary) : Number(target.salary_amount || 0),
      effective_date: promoForm.effective_date || undefined,
      notes: promoForm.notes,
      promoted_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.staff_id})`,
    });

    const updateFields: any = {
      hierarchy_level: promoForm.new_level,
      job_title: promoForm.new_title,
      role: promoForm.new_role,
    };
    if (promoForm.new_salary) updateFields.salary_amount = Number(promoForm.new_salary);

    await supabase.from("staff_profiles").update(updateFields).eq("id", target.id);
    setPromoForm({
      target_staff_id: "",
      new_level: "L4 - Senior Specialist",
      new_title: "",
      new_role: "staff",
      new_salary: "",
      effective_date: "",
      notes: "",
    });
    setSaving(false);
    loadWorkspaceData();
  };

  // 6. Studio Chat (Supports Group, 1-on-1 Direct, and Multi-Select Individual Inbox Dispatch)
  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setChatAttachment({
        url: ev.target?.result as string,
        name: file.name,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatAttachment) || !currentUser) return;

    const textPayload = chatInput.trim() || (chatAttachment ? `Attached: ${chatAttachment.name}` : "");

    if (chatChannelType === "multi_dm") {
      if (selectedRecipients.length === 0) return;
      // Insert a separate 1-on-1 direct message for each selected staff member
      const rows = selectedRecipients.map((code) => {
        const rec = staffList.find((s) => s.staff_id === code);
        return {
          sender_id: currentUser.id,
          sender_name: `${currentUser.first_name} ${currentUser.last_name}`,
          sender_code: currentUser.staff_id,
          channel_type: "direct",
          channel_target: code,
          recipient_name: rec ? `${rec.first_name} ${rec.last_name}` : code,
          message: textPayload,
          attachment_url: chatAttachment?.url || null,
          attachment_name: chatAttachment?.name || null,
          attachment_type: chatAttachment?.type || null,
        };
      });

      await supabase.from("internal_messages").insert(rows);
      setDispatchNotice(`Delivered individually to ${selectedRecipients.length} inbox(es)`);
      setTimeout(() => setDispatchNotice(""), 2500);
    } else {
      const recipientStaff = staffList.find((s) => s.staff_id === chatTarget);
      await supabase.from("internal_messages").insert({
        sender_id: currentUser.id,
        sender_name: `${currentUser.first_name} ${currentUser.last_name}`,
        sender_code: currentUser.staff_id,
        channel_type: chatChannelType,
        channel_target: chatTarget,
        recipient_name: recipientStaff ? `${recipientStaff.first_name} ${recipientStaff.last_name}` : chatTarget,
        message: textPayload,
        attachment_url: chatAttachment?.url || null,
        attachment_name: chatAttachment?.name || null,
        attachment_type: chatAttachment?.type || null,
        reply_to_id: replyingTo?.id || null,
        reply_to_snippet: replyingTo ? `${replyingTo.sender_name}: ${replyingTo.message.slice(0, 60)}` : null,
      });
    }

    setChatInput("");
    setChatAttachment(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    loadWorkspaceData();
  };

  const togglePinMessage = async (msg: any) => {
    await supabase.from("internal_messages").update({ is_pinned: !msg.is_pinned }).eq("id", msg.id);
    loadWorkspaceData();
  };

  const filteredStaff = staffList.filter((m) => {
    const q = `${m.first_name} ${m.last_name} ${m.staff_id} ${m.job_title || ""} ${m.department || ""} ${m.hierarchy_level || ""}`.toLowerCase();
    const matchQ = q.includes(searchQuery.toLowerCase());
    const matchS = statusFilter === "all" || m.status === statusFilter;
    return matchQ && matchS;
  });

  const pendingLeaveCount = leaveList.filter((l) => l.status === "pending").length;
  const pendingVoucherCount = voucherList.filter((v) => v.status === "pending" || v.status === "approved").length;

  const statusBadge = (status: string) => {
    if (status === "active") return "bg-[#c7cb2d]/15 text-[#c7cb2d]";
    if (status === "on_leave") return "bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-subtle)]";
    if (status === "suspended") return "bg-amber-500/15 text-amber-400";
    if (status === "terminated") return "bg-red-500/15 text-red-400 line-through";
    return "bg-zinc-500/15 text-zinc-400";
  };

  const approvalPill = (label: string, status: string, by?: string | null) => {
    const color =
      status === "approved"
        ? "bg-[#c7cb2d]/15 text-[#c7cb2d] border-[#c7cb2d]/30"
        : status === "rejected"
        ? "bg-red-500/15 text-red-400 border-red-500/30"
        : "bg-[var(--bg-card)] text-[var(--text-dim)] border-[var(--border-subtle)]";
    return (
      <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 ${color}`} title={by || "Pending"}>
        <span className="uppercase font-bold">{label}:</span>
        <span className="uppercase">{status || "pending"}</span>
        {by && <span className="opacity-75">({by.split(" ")[0]})</span>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      
      {/* ULTRA-COMPACT COMMAND BAR */}
      <div className="bg-[var(--bg-card)] px-3 py-2 rounded-2xl border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "directory", label: "Roster", icon: Users, count: staffList.length, show: true },
            { id: "onboard", label: "Onboard", icon: UserPlus, count: 0, show: isHR },
            { id: "leave", label: "Leave", icon: Calendar, count: pendingLeaveCount, show: true },
            { id: "vouchers", label: "Vouchers", icon: Receipt, count: pendingVoucherCount, show: true },
            { id: "promotions", label: "Promotions", icon: Award, count: 0, show: true },
            { id: "chat", label: "Studio Chat", icon: MessageSquare, count: 0, show: true },
          ].filter((t) => t.show).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[var(--text-primary)] text-[var(--bg-main)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]/60"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    active ? "bg-black/20 text-[var(--bg-main)]" : "bg-[#c7cb2d]/20 text-[#c7cb2d]"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase text-[var(--text-dim)] pr-2">
          <span className="text-[#c7cb2d] font-bold">{(currentUser?.hierarchy_level || "L7").split(" - ")[0]}</span>
          <span>•</span>
          <span>{currentUser?.job_title || "Executive"}</span>
        </div>
      </div>

      {/* TAB 1: PERSONNEL ROSTER */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by name, ID (LS-01), level, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-card)] rounded-full pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d]"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {["all", "active", "on_leave", "suspended", "terminated"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase cursor-pointer transition ${
                    statusFilter === st
                      ? "bg-[var(--text-primary)] text-[var(--bg-main)] font-bold"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((member) => {
              const photo = member.passport_url || member.avatar_url;
              const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`.toUpperCase();
              const perms: string[] = member.permissions || [member.role];

              return (
                <div key={member.id} className="p-5 rounded-3xl bg-[var(--bg-card)] flex flex-col justify-between space-y-4 border border-[var(--border-subtle)]/50">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold">
                          {member.staff_id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[var(--bg-main)] text-[var(--text-muted)]">
                          {(member.hierarchy_level || "L3").split(" - ")[0]}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${statusBadge(member.status)}`}>
                        {member.status?.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="w-14 h-[72px] rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] overflow-hidden shrink-0 flex items-center justify-center">
                        {photo ? (
                          <img src={photo} alt={member.first_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-sm font-bold text-[var(--text-primary)] truncate">
                          {member.first_name} {member.last_name}
                        </h3>
                        <p className="text-xs font-semibold text-[#c7cb2d] truncate">
                          {member.job_title || "Specialist"}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {member.department || "Executive"}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {perms.slice(0, 4).map((p) => (
                            <span key={p} className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-dim)]">
                              {p.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--bg-main)] text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-mono uppercase text-[var(--text-dim)]">Bank</span>
                        <span className="truncate max-w-[160px] text-[var(--text-muted)]">
                          {member.bank_name ? `${member.bank_name} • ${member.bank_account_no || ""}` : "Not set"}
                        </span>
                      </div>
                      {member.bank_account_name && (
                        <div className="flex justify-between">
                          <span className="text-[9px] font-mono uppercase text-[var(--text-dim)]">Account Name</span>
                          <span className="truncate max-w-[160px] font-medium">{member.bank_account_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isHR && (
                    <button
                      onClick={() => setEditingStaff({ ...member, permissions: member.permissions || [member.role] })}
                      className="w-full py-2 rounded-xl bg-[var(--bg-main)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-main)] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Personnel Record
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ONBOARD NEW STAFF */}
      {activeTab === "onboard" && isHR && (
        <form onSubmit={handleOnboardStaff} className="bg-[var(--bg-card)] p-6 rounded-3xl max-w-4xl space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <PassportCropper
              value={newStaff.passport_url}
              onChange={(dataUrl) => setNewStaff({ ...newStaff, passport_url: dataUrl })}
              initials="NEW"
            />
            <div>
              <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">New Personnel</span>
              <h2 className="font-display text-lg font-bold">Onboard Staff Member</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Click the passport frame on the left to upload & crop 3:4 photo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Staff ID</label>
              <input
                type="text"
                required
                value={newStaff.staff_id}
                onChange={(e) => setNewStaff({ ...newStaff, staff_id: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">First Name</label>
              <input
                type="text"
                required
                value={newStaff.first_name}
                onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Last Name</label>
              <input
                type="text"
                required
                value={newStaff.last_name}
                onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Corporate Email</label>
              <input
                type="email"
                required
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="name@studioslavie.com"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Hierarchy Grade</label>
              <select
                value={newStaff.hierarchy_level}
                onChange={(e) => setNewStaff({ ...newStaff, hierarchy_level: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                {HIERARCHY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Department</label>
              <input
                type="text"
                required
                value={newStaff.department}
                onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Job Title</label>
              <input
                type="text"
                required
                value={newStaff.job_title}
                onChange={(e) => setNewStaff({ ...newStaff, job_title: e.target.value })}
                placeholder="e.g. Brand Designer"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Monthly Salary (₦)</label>
              <input
                type="number"
                value={newStaff.salary_amount}
                onChange={(e) => setNewStaff({ ...newStaff, salary_amount: e.target.value })}
                placeholder="150000"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg-main)]">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
              <input
                type="text"
                value={newStaff.bank_name}
                onChange={(e) => setNewStaff({ ...newStaff, bank_name: e.target.value })}
                placeholder="UBA / Polaris Bank"
                className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Account Name</label>
              <input
                type="text"
                value={newStaff.bank_account_name}
                onChange={(e) => setNewStaff({ ...newStaff, bank_account_name: e.target.value })}
                placeholder="Registered Account Name"
                className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number (NUBAN)</label>
              <input
                type="text"
                maxLength={10}
                value={newStaff.bank_account_no}
                onChange={(e) => setNewStaff({ ...newStaff, bank_account_no: e.target.value })}
                placeholder="10-digit NUBAN"
                className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1.5">
              Portal & Approval Clearances
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PERMISSIONS.map((perm) => {
                const active = newStaff.permissions.includes(perm.id);
                return (
                  <button
                    type="button"
                    key={perm.id}
                    onClick={() => setNewStaff({ ...newStaff, permissions: togglePermission(newStaff.permissions, perm.id) })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      active ? "bg-[#c7cb2d] text-black" : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {perm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {onboardStatus && <p className="text-xs font-semibold text-[#c7cb2d]">{onboardStatus}</p>}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
          >
            {saving ? "Saving..." : "Onboard Personnel"}
          </button>
        </form>
      )}

      {/* TAB 3: 3-TIER LEAVE PORTAL */}
      {activeTab === "leave" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form onSubmit={handleApplyLeave} className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Request Leave</h2>
              <span className="text-[10px] font-mono text-[#c7cb2d]">Used: {myUsedLeaveDays}/20 days</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)] space-y-0.5">
              <p>• Max Paid Leave: 4 Weeks (20 working days/yr) • Left: <strong>{remainingAnnualAllowance} days</strong></p>
              <p>• Annual Leave: Max 2 Weeks (10 working days) per request</p>
              <p>• Sick / Study / Compassionate: Max 3 working days per request</p>
              {requestedDays > 0 && <p className="text-[#c7cb2d] font-bold">Selected Duration: {requestedDays} working day(s)</p>}
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Leave Type</label>
              <select
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick / Medical Leave">Sick / Medical Leave</option>
                <option value="Study / Exam Leave">Study / Exam Leave</option>
                <option value="Compassionate Leave">Compassionate Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Return Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Relieving Officer</label>
              <select
                required
                value={leaveForm.handover_staff}
                onChange={(e) => setLeaveForm({ ...leaveForm, handover_staff: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="">-- Select Relieving Staff --</option>
                {staffList
                  .filter((s) => s.id !== currentUser?.id && s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={`${s.first_name} ${s.last_name} (${s.staff_id})`}>
                      {s.first_name} {s.last_name} ({s.staff_id} • {s.department})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Reason & Handover Notes</label>
              <textarea
                rows={3}
                required
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
            >
              Submit Leave Request
            </button>
          </form>

          <div className="lg:col-span-2 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Leave Approval Pipeline</h2>
              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
                HR → Head of Operations → Chief Strategist
              </span>
            </div>

            <div className="space-y-3">
              {leaveList.length > 0 ? leaveList.map((lv) => (
                <div key={lv.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                        {lv.staff_code}
                      </span>
                      <span className="text-xs font-bold">{lv.staff_name}</span>
                      <span className="text-xs text-[var(--text-muted)]">• {lv.leave_type}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                      lv.status === "approved" ? "bg-[#c7cb2d]/15 text-[#c7cb2d]" :
                      lv.status === "rejected" ? "bg-red-500/15 text-red-400" :
                      "bg-amber-500/15 text-amber-400"
                    }`}>
                      {lv.status}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-primary)]">{lv.reason}</p>
                  <p className="text-[10px] font-mono text-[var(--text-dim)]">
                    {lv.start_date} → {lv.end_date} {lv.handover_staff ? `• Handover: ${lv.handover_staff}` : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {approvalPill("1. HR", lv.hr_status || "pending", lv.hr_by)}
                    {approvalPill("2. Head of Ops", lv.ops_status || "pending", lv.ops_by)}
                    {approvalPill("3. Chief Strategist", lv.strategist_status || "pending", lv.strategist_by)}
                  </div>

                  {lv.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                      {isHR && (lv.hr_status || "pending") === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleLeaveStageApproval(lv, "hr", "approved")}
                            className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✓ HR Approve
                          </button>
                          <button
                            onClick={() => handleLeaveStageApproval(lv, "hr", "rejected")}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {isHeadOfOps && (lv.ops_status || "pending") === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleLeaveStageApproval(lv, "ops", "approved")}
                            className="px-2.5 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✓ Ops Approve
                          </button>
                          <button
                            onClick={() => handleLeaveStageApproval(lv, "ops", "rejected")}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {isChiefStrategist && (lv.strategist_status || "pending") === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleLeaveStageApproval(lv, "strategist", "approved")}
                            className="px-2.5 py-1 rounded-lg bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono uppercase font-bold cursor-pointer"
                          >
                            ✓ Chief Strategist Sign-Off
                          </button>
                          <button
                            onClick={() => handleLeaveStageApproval(lv, "strategist", "rejected")}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">No leave requests logged.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DETAILED VOUCHERS */}
      {activeTab === "vouchers" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={handleRaiseVoucher} className="lg:col-span-5 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit">
            <h2 className="font-display text-base font-bold">Raise Payment Voucher</h2>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Voucher Title</label>
                <input
                  type="text"
                  required
                  value={voucherForm.title}
                  onChange={(e) => setVoucherForm({ ...voucherForm, title: e.target.value })}
                  placeholder="e.g. Print Run"
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project / Client Ref</label>
                <input
                  type="text"
                  value={voucherForm.project_ref}
                  onChange={(e) => setVoucherForm({ ...voucherForm, project_ref: e.target.value })}
                  placeholder="Project Code"
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Category</label>
                <select
                  value={voucherForm.category}
                  onChange={(e) => setVoucherForm({ ...voucherForm, category: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Operational Expense">Operations</option>
                  <option value="Rent & Facility Lease">Rent & Facility Lease</option>
                  <option value="Electricity, Power & Fuel">Electricity, Power & Fuel</option>
                  <option value="Staff Support & Welfare">Staff Support & Welfare</option>
                  <option value="Adhoc Vendors Payment">Adhoc Vendors Payment</option>
                  <option value="Print & Production">Print & Production</option>
                  <option value="Software & Cloud">Software / Cloud</option>
                  <option value="Client Logistics & Rigging">Client Logistics & Rigging</option>
                  <option value="Equipment & Hardware">Equipment & Hardware</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Payment Method</label>
                <select
                  value={voucherForm.payment_method}
                  onChange={(e) => setVoucherForm({ ...voucherForm, payment_method: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Corporate Card">Corporate Card</option>
                  <option value="Reimbursement">Staff Reimbursement</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--bg-main)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] font-bold">Line Items</span>
                <button
                  type="button"
                  onClick={() => setVoucherItems([...voucherItems, { item: "", qty: 1, unitPrice: 0 }])}
                  className="text-[10px] font-mono text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

              {voucherItems.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Description"
                    value={row.item}
                    onChange={(e) => {
                      const copy = [...voucherItems];
                      copy[idx].item = e.target.value;
                      setVoucherItems(copy);
                    }}
                    className="col-span-6 bg-[var(--bg-card)] rounded-lg px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    required
                    value={row.qty}
                    onChange={(e) => {
                      const copy = [...voucherItems];
                      copy[idx].qty = Number(e.target.value);
                      setVoucherItems(copy);
                    }}
                    className="col-span-2 bg-[var(--bg-card)] rounded-lg px-2 py-1.5 text-xs text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Unit ₦"
                    value={row.unitPrice || ""}
                    onChange={(e) => {
                      const copy = [...voucherItems];
                      copy[idx].unitPrice = Number(e.target.value);
                      setVoucherItems(copy);
                    }}
                    className="col-span-3 bg-[var(--bg-card)] rounded-lg px-2 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setVoucherItems(voucherItems.filter((_, i) => i !== idx))}
                    disabled={voucherItems.length === 1}
                    className="col-span-1 text-[var(--text-dim)] hover:text-red-400 disabled:opacity-30 flex justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs font-bold">
                <span>Total Amount</span>
                <span className="font-mono text-[#c7cb2d]">₦{computedVoucherTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={voucherForm.bank_name}
                  onChange={(e) => setVoucherForm({ ...voucherForm, bank_name: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={voucherForm.bank_account_name}
                  onChange={(e) => setVoucherForm({ ...voucherForm, bank_account_name: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={voucherForm.bank_account_no}
                  onChange={(e) => setVoucherForm({ ...voucherForm, bank_account_no: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Supporting Receipt</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleVoucherAttachment}
                className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[var(--bg-main)] file:text-xs file:font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
            >
              Submit Voucher (₦{computedVoucherTotal.toLocaleString()})
            </button>
          </form>

          <div className="lg:col-span-7 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Voucher Approval Queue</h2>
              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
                Head of Finance + Chief Strategist
              </span>
            </div>

            <div className="space-y-3">
              {voucherList.length > 0 ? voucherList.map((vc) => (
                <div key={vc.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                        {vc.voucher_code}
                      </span>
                      <span className="text-xs font-bold">{vc.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-[#c7cb2d]">
                        ₦{Number(vc.amount).toLocaleString()}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                        vc.status === "paid" ? "bg-[#c7cb2d]/15 text-[#c7cb2d]" :
                        vc.status === "approved" ? "bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-subtle)]" :
                        vc.status === "rejected" ? "bg-red-500/15 text-red-400" :
                        "bg-amber-500/15 text-amber-400"
                      }`}>
                        {vc.status}
                      </span>
                    </div>
                  </div>

                  {Array.isArray(vc.line_items) && vc.line_items.length > 0 && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-2.5 space-y-1 text-[11px]">
                      {vc.line_items.map((li: any, i: number) => (
                        <div key={i} className="flex justify-between font-mono">
                          <span className="font-sans text-[var(--text-primary)]">{li.item} (x{li.qty})</span>
                          <span>₦{(Number(li.qty) * Number(li.unitPrice)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-dim)]">
                    <span>By: {vc.staff_name} ({vc.staff_code})</span>
                    <span>
                      Payee: <strong className="text-[var(--text-primary)]">{vc.bank_account_name || vc.staff_name}</strong> • {vc.bank_name} ({vc.bank_account_no})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {approvalPill("1. Head of Finance", vc.finance_status || "pending", vc.finance_by)}
                    {approvalPill("2. Chief Strategist", vc.strategist_status || "pending", vc.strategist_by)}
                  </div>

                  {vc.status !== "paid" && vc.status !== "rejected" && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                      {isHeadOfFinance && (vc.finance_status || "pending") === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleVoucherStageApproval(vc, "finance", "approved")}
                            className="px-2.5 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✓ Finance Approve
                          </button>
                          <button
                            onClick={() => handleVoucherStageApproval(vc, "finance", "rejected")}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {isChiefStrategist && (vc.strategist_status || "pending") === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleVoucherStageApproval(vc, "strategist", "approved")}
                            className="px-2.5 py-1 rounded-lg bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono uppercase font-bold cursor-pointer"
                          >
                            ✓ Strategist Approve
                          </button>
                          <button
                            onClick={() => handleVoucherStageApproval(vc, "strategist", "rejected")}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-mono uppercase cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {isHeadOfFinance && vc.finance_status === "approved" && vc.strategist_status === "approved" && (
                        <button
                          onClick={() => handleVoucherStageApproval(vc, "disburse", "paid")}
                          className="px-3 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold text-[10px] font-mono uppercase font-bold cursor-pointer"
                        >
                          ₦ Mark Paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">No vouchers raised yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HIERARCHICAL LEVEL PROMOTIONS */}
      {activeTab === "promotions" && (
        <div className="space-y-5">
          <div className="bg-[var(--bg-card)] p-3.5 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto">
            {HIERARCHY_LEVELS.map((lvl, index) => {
              const code = lvl.split(" - ")[0];
              const title = lvl.split(" - ")[1];
              const count = staffList.filter((s) => (s.hierarchy_level || "L3 - Mid-Level Specialist").startsWith(code)).length;
              return (
                <div key={lvl} className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 min-w-[125px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#c7cb2d]">{code}</span>
                      <span className="text-[10px] font-mono text-[var(--text-dim)]">{count}</span>
                    </div>
                    <p className="text-[11px] font-semibold truncate mt-0.5">{title}</p>
                  </div>
                  {index < HIERARCHY_LEVELS.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[var(--text-dim)] shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {isHR && (
              <form onSubmit={handleIssuePromotion} className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit">
                <h2 className="font-display text-base font-bold">Promote Personnel</h2>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Select Staff</label>
                  <select
                    required
                    value={promoForm.target_staff_id}
                    onChange={(e) => setPromoForm({ ...promoForm, target_staff_id: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="">-- Choose Personnel --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.staff_id} — {s.first_name} {s.last_name} ({(s.hierarchy_level || "L3").split(" - ")[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Hierarchy Level</label>
                  <select
                    value={promoForm.new_level}
                    onChange={(e) => setPromoForm({ ...promoForm, new_level: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  >
                    {HIERARCHY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Job Title</label>
                  <input
                    type="text"
                    required
                    value={promoForm.new_title}
                    onChange={(e) => setPromoForm({ ...promoForm, new_title: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Clearance</label>
                    <select
                      value={promoForm.new_role}
                      onChange={(e) => setPromoForm({ ...promoForm, new_role: e.target.value })}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="staff">Staff</option>
                      <option value="hr">HR Manager</option>
                      <option value="finance">Finance Officer</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Salary (₦)</label>
                    <input
                      type="number"
                      value={promoForm.new_salary}
                      onChange={(e) => setPromoForm({ ...promoForm, new_salary: e.target.value })}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={promoForm.notes}
                    onChange={(e) => setPromoForm({ ...promoForm, notes: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
                >
                  Confirm Promotion
                </button>
              </form>
            )}

            <div className={`${isHR ? "lg:col-span-2" : "lg:col-span-3"} bg-[var(--bg-card)] p-5 rounded-3xl space-y-3`}>
              <h2 className="font-display text-base font-bold">Promotions History</h2>
              <div className="space-y-2.5">
                {promotionList.length > 0 ? promotionList.map((pr) => (
                  <div key={pr.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold">
                          {pr.staff_code}
                        </span>
                        <span className="text-xs font-bold">{pr.staff_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-dim)]">
                        <FormattedDate dateString={pr.effective_date || pr.created_at} />
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] font-mono text-[10px]">
                        {(pr.previous_level || "L3").split(" - ")[0]} → <strong className="text-[#c7cb2d]">{(pr.new_level || "L4").split(" - ")[0]}</strong>
                      </span>
                      <span className="font-semibold text-[#c7cb2d]">
                        {pr.previous_title} → {pr.new_title}
                      </span>
                    </div>
                    {pr.notes && <p className="text-xs text-[var(--text-muted)]">{pr.notes}</p>}
                  </div>
                )) : (
                  <p className="text-xs text-[var(--text-muted)] py-8 text-center">No promotions logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: COMPACT, INTENTIONAL STUDIO CHAT + MULTI-SELECT INDIVIDUAL INBOX DISPATCH */}
      {activeTab === "chat" && (
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)]/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[540px]">
          
          {/* Compact Left Sidebar (Channels, 1-on-1 DMs, & Multi-Select Dispatch) */}
          <div className="lg:col-span-3 border-r border-[var(--border-subtle)]/60 p-3.5 flex flex-col justify-between bg-[var(--bg-main)]/40 overflow-y-auto">
            <div className="space-y-4">
              {/* Mode Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-main)] text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => { setChatChannelType("group"); setChatTarget("All Staff"); }}
                  className={`py-1.5 rounded-lg cursor-pointer transition ${chatChannelType === "group" ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "text-[var(--text-muted)]"}`}
                >
                  Channels
                </button>
                <button
                  type="button"
                  onClick={() => { setChatChannelType("direct"); if (staffList[0]) setChatTarget(staffList[0].staff_id); }}
                  className={`py-1.5 rounded-lg cursor-pointer transition ${chatChannelType === "direct" ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "text-[var(--text-muted)]"}`}
                >
                  1-on-1 DM
                </button>
                <button
                  type="button"
                  onClick={() => setChatChannelType("multi_dm")}
                  className={`py-1.5 rounded-lg cursor-pointer transition ${chatChannelType === "multi_dm" ? "bg-[#c7cb2d] text-black" : "text-[var(--text-muted)]"}`}
                  title="Select multiple individuals and send a private message to each inbox separately"
                >
                  Multi-DM
                </button>
              </div>

              {chatChannelType === "group" && (
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase text-[var(--text-dim)] px-2 mb-1">Studio Rooms</p>
                  {["All Staff", "Executive", "Design & Creative", "Operations", "Finance & HR"].map((grp) => (
                    <button
                      key={grp}
                      onClick={() => setChatTarget(grp)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        chatTarget === grp
                          ? "bg-[var(--text-primary)] text-[var(--bg-main)] font-bold"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                      }`}
                    >
                      # {grp}
                    </button>
                  ))}
                </div>
              )}

              {chatChannelType === "direct" && (
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase text-[var(--text-dim)] px-2 mb-1">Direct Inbox</p>
                  {staffList.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setChatTarget(st.staff_id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                        chatTarget === st.staff_id
                          ? "bg-[var(--text-primary)] text-[var(--bg-main)] font-bold"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                      }`}
                    >
                      <span className="truncate">{st.first_name} {st.last_name}</span>
                      <span className="text-[9px] font-mono opacity-60">{st.staff_id}</span>
                    </button>
                  ))}
                </div>
              )}

              {chatChannelType === "multi_dm" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[9px] font-mono uppercase text-[#c7cb2d] font-bold">
                      Select Recipients ({selectedRecipients.length})
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRecipients(
                          selectedRecipients.length === staffList.length ? [] : staffList.map((s) => s.staff_id)
                        )
                      }
                      className="text-[9px] font-mono underline text-[var(--text-muted)] cursor-pointer"
                    >
                      {selectedRecipients.length === staffList.length ? "Clear" : "Select All"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {staffList.map((st) => {
                      const checked = selectedRecipients.includes(st.staff_id);
                      return (
                        <button
                          type="button"
                          key={st.id}
                          onClick={() => toggleRecipientSelection(st.staff_id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                            checked ? "bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {checked ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0 opacity-50" />}
                            <span className="truncate">{st.first_name} {st.last_name}</span>
                          </div>
                          <span className="text-[9px] font-mono opacity-75">{st.staff_id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Compact Chat Stream & Composer */}
          <div className="lg:col-span-9 flex flex-col justify-between h-full p-4 overflow-hidden">
            
            {/* Compact Top Bar */}
            <div className="pb-2.5 border-b border-[var(--border-subtle)]/60 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold shrink-0">
                  {chatChannelType === "group" ? "Channel" : chatChannelType === "direct" ? "1-on-1" : "Multi-Inbox"}
                </span>
                <h3 className="font-display text-sm font-bold truncate">
                  {chatChannelType === "group"
                    ? `#${chatTarget}`
                    : chatChannelType === "direct"
                    ? `${staffList.find((s) => s.staff_id === chatTarget)?.first_name || chatTarget} (${chatTarget})`
                    : selectedRecipients.length > 0
                    ? `Separate DMs to: ${selectedRecipients.join(", ")}`
                    : "Select individuals on the left"}
                </h3>
              </div>

              <div className="relative w-40 shrink-0">
                <Search className="w-3 h-3 text-[var(--text-dim)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter chat..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full bg-[var(--bg-main)] rounded-full pl-7 pr-2.5 py-1 text-[10px]"
                />
              </div>
            </div>

            {/* Pinned Notice */}
            {chatChannelType !== "multi_dm" && messages.some((m) => m.is_pinned && m.channel_target === chatTarget) && (
              <div className="my-1.5 px-2.5 py-1 rounded-lg bg-[#c7cb2d]/10 border border-[#c7cb2d]/30 flex items-center gap-1.5 text-[11px] shrink-0">
                <Pin className="w-3 h-3 text-[#c7cb2d] shrink-0" />
                <span className="truncate">
                  {messages.find((m) => m.is_pinned && m.channel_target === chatTarget)?.message}
                </span>
              </div>
            )}

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {chatChannelType === "multi_dm" ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-2">
                  <div className="px-3 py-1 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] text-[10px] font-mono uppercase font-bold">
                    Individual Multi-Dispatch Mode
                  </div>
                  <p className="text-xs text-[var(--text-muted)] max-w-md">
                    Check any number of people in the left sidebar and send your message below. Each selected staff member receives an independent 1-on-1 message directly in their private inbox.
                  </p>
                  {dispatchNotice && (
                    <p className="text-xs font-bold text-[#c7cb2d]">{dispatchNotice}</p>
                  )}
                </div>
              ) : (
                messages
                  .filter((m) => {
                    const inChan =
                      chatChannelType === "group"
                        ? m.channel_type === "group" && m.channel_target === chatTarget
                        : m.channel_type === "direct" &&
                          ((m.sender_code === currentUser?.staff_id && m.channel_target === chatTarget) ||
                            (m.sender_code === chatTarget && m.channel_target === currentUser?.staff_id));
                    const matchText = !chatSearch || m.message?.toLowerCase().includes(chatSearch.toLowerCase());
                    return inChan && matchText;
                  })
                  .map((m) => {
                    const isMe = m.sender_code === currentUser?.staff_id;
                    return (
                      <div key={m.id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`max-w-md px-3 py-2 rounded-2xl text-xs space-y-1 ${
                          isMe ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "bg-[var(--bg-main)] text-[var(--text-primary)]"
                        }`}>
                          <div className="flex items-center justify-between gap-3 opacity-70 text-[9px] font-mono">
                            <span className="font-bold">{m.sender_name} ({m.sender_code})</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button type="button" onClick={() => setReplyingTo(m)} className="cursor-pointer">
                                <Reply className="w-2.5 h-2.5" />
                              </button>
                              <button type="button" onClick={() => togglePinMessage(m)} className="cursor-pointer">
                                <Pin className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          {m.reply_to_snippet && (
                            <div className="px-2 py-0.5 rounded bg-black/15 text-[10px] opacity-80 border-l-2 border-[#c7cb2d] truncate">
                              ↩ {m.reply_to_snippet}
                            </div>
                          )}

                          <p className="leading-snug">{m.message}</p>

                          {m.attachment_url && (
                            <div className="pt-1">
                              {m.attachment_type?.startsWith("image/") ? (
                                <img
                                  src={m.attachment_url}
                                  alt={m.attachment_name || "Attachment"}
                                  className="max-h-36 rounded-lg object-cover"
                                />
                              ) : (
                                <a
                                  href={m.attachment_url}
                                  download={m.attachment_name || "file"}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/20 text-[10px] font-mono underline"
                                >
                                  <FileText className="w-3 h-3" /> {m.attachment_name || "File"}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Compact Intentional Composer */}
            <div className="pt-2 border-t border-[var(--border-subtle)]/60 space-y-1.5 shrink-0">
              {replyingTo && (
                <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--bg-main)] text-[10px]">
                  <span className="truncate">Replying to <strong>{replyingTo.sender_name}</strong>: {replyingTo.message}</span>
                  <button type="button" onClick={() => setReplyingTo(null)}><X className="w-3 h-3" /></button>
                </div>
              )}

              {chatAttachment && (
                <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#c7cb2d]/15 text-[#c7cb2d] text-[10px] font-mono">
                  <span className="truncate">📎 {chatAttachment.name}</span>
                  <button type="button" onClick={() => setChatAttachment(null)}><X className="w-3 h-3" /></button>
                </div>
              )}

              {showEmojiPicker && (
                <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-[var(--bg-main)]">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setChatInput((prev) => prev + em)}
                      className="text-sm hover:scale-125 transition px-1 cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                <input ref={chatFileRef} type="file" onChange={handleChatFileSelect} className="hidden" />
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  className="p-2 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Attach File"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Emoji"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    chatChannelType === "multi_dm"
                      ? `Send separate DMs to ${selectedRecipients.length} selected staff...`
                      : `Message ${chatChannelType === "group" ? "#" + chatTarget : chatTarget}...`
                  }
                  className="flex-1 bg-[var(--bg-main)] rounded-full px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d]"
                />
                <button
                  type="submit"
                  disabled={chatChannelType === "multi_dm" && selectedRecipients.length === 0}
                  className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                  <span>{chatChannelType === "multi_dm" ? `Send (${selectedRecipients.length})` : "Send"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT CENTERED PERSONNEL EDIT MODAL (No right-side view distortion) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)] shrink-0">
              <div className="flex items-center gap-3.5">
                <PassportCropper
                  value={editingStaff.passport_url}
                  onChange={(dataUrl) => setEditingStaff({ ...editingStaff, passport_url: dataUrl })}
                  initials={`${editingStaff.first_name?.[0] || ""}${editingStaff.last_name?.[0] || ""}`}
                />
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                    {editingStaff.staff_id} • Personnel Record
                  </span>
                  <h2 className="font-display text-lg font-bold">
                    {editingStaff.first_name} {editingStaff.last_name}
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">Hover on passport photo to re-crop or replace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-2 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Centered Form Body */}
            <form id="edit-staff-form" onSubmit={handleSaveStaffEdit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.first_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, first_name: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.last_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, last_name: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.staff_id}
                    onChange={(e) => setEditingStaff({ ...editingStaff, staff_id: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Hierarchy Grade</label>
                  <select
                    value={editingStaff.hierarchy_level || "L3 - Mid-Level Specialist"}
                    onChange={(e) => setEditingStaff({ ...editingStaff, hierarchy_level: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  >
                    {HIERARCHY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Employment Status</label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Monthly Salary (₦)</label>
                  <input
                    type="number"
                    value={editingStaff.salary_amount || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, salary_amount: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Department</label>
                  <input
                    type="text"
                    value={editingStaff.department || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editingStaff.job_title || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, job_title: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[var(--bg-main)]">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editingStaff.bank_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
                  <input
                    type="text"
                    value={editingStaff.bank_account_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_account_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={editingStaff.bank_account_no || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_account_no: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1.5">
                  Assigned Clearances & Permissions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PERMISSIONS.map((perm) => {
                    const active = (editingStaff.permissions || []).includes(perm.id);
                    return (
                      <button
                        type="button"
                        key={perm.id}
                        onClick={() =>
                          setEditingStaff({
                            ...editingStaff,
                            permissions: togglePermission(editingStaff.permissions || [], perm.id),
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer flex items-center gap-1 ${
                          active ? "bg-[#c7cb2d] text-black" : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {perm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-staff-form"
                disabled={saving}
                className="px-6 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
