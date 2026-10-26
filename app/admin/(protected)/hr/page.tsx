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
  "L7 - Executive / Director",
];



const ALL_PERMISSIONS = [
  { id: "executive", label: "Executive / Director" },
  { id: "chief_strategist", label: "Chief Strategist" },
  { id: "head_of_operations", label: "Head of Operations" },
  { id: "head_of_finance", label: "Head of Finance" },
  { id: "hr", label: "HR Management" },
  { id: "finance", label: "Finance Desk" },
  { id: "portfolio", label: "Portfolio CMS" },
  { id: "inquiries", label: "Inquiries & Leads" },
  { id: "newsletter", label: "Newsletter & PR" },
  { id: "staff", label: "Standard Staff" },
];

const QUICK_EMOJIS = ["👍", "✅", "🔥", "👏", "🎯", "🚀", "🙌", "📌", "⚡", "💡", "🤝", "🎉"];


const DEPARTMENT_JOB_TITLES: Record<string, string[]> = {
  "Executive & Board Governance": [
    "Managing Director / CEO",
    "Executive Director",
    "Chief Operating Officer (COO)",
    "Non-Executive Director",
    "Board Secretary & Legal Counsel",
    "Executive Assistant to the Board",
  ],
  "Brand Strategy & Positioning": [
    "Chief Strategist",
    "Head of Brand Strategy",
    "Senior Brand Strategist",
    "Brand & Market Strategist",
    "Brand Architecture & Naming Specialist",
    "Consumer Research & Insights Analyst",
  ],
  "Brand Communications & PR": [
    "Head of Brand Communications",
    "Brand Communications & PR Manager",
    "Senior Copywriter & Verbal Identity Lead",
    "Content & Storytelling Strategist",
    "Public Relations & Media Liaison",
    "Social Media & Community Manager",
    "Newsletter & Editorial Specialist",
  ],
  "Design & Creative": [
    "Creative Director",
    "Art Director",
    "Senior Brand Identity Designer",
    "Brand & Graphic Designer",
    "Print & Packaging Designer",
    "Presentation & Deck Specialist",
    "Design Intern",
  ],
  "Spatial & Event Production": [
    "Head of Spatial & Event Production",
    "Spatial & Environmental Designer",
    "Stage & Set Architect",
    "Event Branding Coordinator",
    "Production & Lighting Technician",
    "On-Site Installation Lead",
  ],
  "Out-of-Home (OOH) & Media": [
    "Head of OOH & Media",
    "OOH Media Strategist",
    "Billboard & Inventory Manager",
    "Regulatory & Signage Compliance Officer",
    "Media Buyer & Planner",
  ],
  "Digital, UI/UX & Engineering": [
    "Lead Product & UI/UX Designer",
    "UI/UX Designer",
    "Full-Stack Software Engineer",
    "Frontend Web Developer",
    "Backend & Systems Engineer",
    "Digital Product Manager",
  ],
  "Motion, Video & Photography": [
    "Motion Graphics Lead",
    "2D/3D Motion Designer",
    "Video Director & Editor",
    "3D Spatial Visualizer",
    "Event & Brand Photographer",
    "Sound & Multimedia Specialist",
  ],
  "Client Services & Growth": [
    "Head of Client Services & Growth",
    "Business Development Manager",
    "Senior Account Executive",
    "Client Relations & Proposals Officer",
    "Sponsorships & Partnerships Lead",
  ],
  "Operations, Logistics & Procurement": [
    "Head of Operations",
    "Operations & Studio Manager",
    "Procurement & Vendor Coordinator",
    "Fabrication & Print Supervisor",
    "Logistics & Inventory Officer",
    "Facility & Power Systems Technician",
  ],
  "Finance, HR & Administration": [
    "Head of Finance",
    "Accountant & Finance Officer",
    "Payroll & Tax Compliance Specialist",
    "HR & People Operations Manager",
    "Administrative & Compliance Officer",
    "Front Desk & Studio Coordinator",
  ],
};

const STUDIO_DEPARTMENTS = Object.keys(DEPARTMENT_JOB_TITLES);

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
  const [isCustomNewJobTitle, setIsCustomNewJobTitle] = React.useState(false);
  const [isCustomEditJobTitle, setIsCustomEditJobTitle] = React.useState(false);

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

    const myPerms: string[] = currentUser?.permissions || (currentUser?.role ? [currentUser.role] : []);
  const isPrimaryFounder = !currentUser || currentUser?.staff_id === "LS-01" || currentUser?.email?.toLowerCase() === "hipheholluhayegboyin@gmail.com";
  const isExecutive =
    isPrimaryFounder ||
    currentUser?.role === "super_admin" ||
    currentUser?.role === "executive" ||
    myPerms.includes("super_admin") ||
    myPerms.includes("executive") ||
    myPerms.includes("chief_strategist") ||
    String(currentUser?.hierarchy_level || "").startsWith("L7");

  // Write permissions for HR: only Primary Founder / Chief Strategist / granted HR clearance can modify HR data
  const canEditHR =
    isPrimaryFounder ||
    currentUser?.role === "super_admin" ||
    currentUser?.role === "hr" ||
    myPerms.includes("super_admin") ||
    myPerms.includes("chief_strategist") ||
    myPerms.includes("hr");

  // Executives can view everything, but modification actions check department clearance
  const isSuper = canEditHR;
  const isChiefStrategist = isPrimaryFounder || myPerms.includes("chief_strategist");
  const isHeadOfFinance = currentUser?.role === "finance" || myPerms.includes("head_of_finance") || myPerms.includes("finance");
  const isHeadOfOps = isPrimaryFounder || myPerms.includes("head_of_operations");
  const isHR = canEditHR;

  const togglePermission = (list: string[], perm: string) =>
    list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];

  const toggleRecipientSelection = (staffCode: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(staffCode) ? prev.filter((c) => c !== staffCode) : [...prev, staffCode]
    );
  };

  // 1. Save Staff Edits
  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    if (!canEditHR) { e.preventDefault(); alert("View-Only Executive Access: Only HR Management or Chief Strategist clearance can modify staff records."); return; }
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
    if (!canEditHR) { e.preventDefault(); alert("View-Only Executive Access: Only HR Management or Chief Strategist clearance can onboard staff."); return; }
    e.preventDefault();
    setSaving(true);
    setOnboardStatus("Provisioning portal login & staff record...");

    const tempPass = (newStaff as any).temporary_password || "Lavie@2026";
    const cleanEmail = newStaff.email.trim().toLowerCase();

    let provisionedUserId: string | null = null;
    try {
      const authRes = await fetch("/api/admin/onboard-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: tempPass,
          first_name: newStaff.first_name,
          last_name: newStaff.last_name,
          role: newStaff.role,
          hierarchy_level: newStaff.hierarchy_level,
          department: newStaff.department,
          job_title: newStaff.job_title,
        }),
      });
      const authJson = await authRes.json().catch(() => ({}));
      if (authJson?.user_id) {
        provisionedUserId = authJson.user_id;
      }
    } catch (_) {}

    const fullRecord: Record<string, any> = {
      id: provisionedUserId || crypto.randomUUID(),
      staff_id: (newStaff.staff_id || "LS-" + Math.floor(10 + Math.random() * 89)).trim().toUpperCase(),
      first_name: newStaff.first_name.trim(),
      last_name: newStaff.last_name.trim(),
      email: cleanEmail,
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
    };

    let { error } = await supabase.from("staff_profiles").upsert(fullRecord, { onConflict: "id" });

    // If email already exists, update existing record instead of failing
    if (error && error.message?.toLowerCase().includes("duplicate")) {
      const { id, ...updateFields } = fullRecord;
      const retry = await supabase.from("staff_profiles").update(updateFields).eq("email", cleanEmail);
      error = retry.error;
    }

    setSaving(false);
    if (error) {
      setOnboardStatus("Error: " + error.message);
      alert("Database Error while onboarding: " + error.message);
    } else {
      const loginUrl = typeof window !== "undefined" ? window.location.origin + "/login" : "https://thestudio-black.vercel.app/login";
      setOnboardStatus(`✅ Onboarded! Portal Login: ${cleanEmail} | Password: ${tempPass}`);
      try {
        await navigator.clipboard.writeText(
          `LAVIE STUDIOS PORTAL ACCESS\nLogin URL: ${loginUrl}\nEmail: ${cleanEmail}\nTemporary Password: ${tempPass}`
        );
      } catch (_) {}
      alert(
        `✅ ${newStaff.first_name} ${newStaff.last_name} Onboarded Successfully!\n\n` +
        `PORTAL ACCESS CREDENTIALS (Copied to your Clipboard):\n` +
        `• Login URL: ${loginUrl}\n` +
        `• Email: ${cleanEmail}\n` +
        `• Temporary Password: ${tempPass}\n\n` +
        `Send these details to the staff member so they can sign in and access their dashboard.`
      );
      await loadWorkspaceData();
      setActiveTab("directory");
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
              <div className="space-y-2">
                    <div className="space-y-2">
                    <select
                      value={
                        isCustomEditJobTitle
                          ? "__OTHER__"
                          : (DEPARTMENT_JOB_TITLES[editingStaff.department] || []).includes(editingStaff.job_title)
                          ? editingStaff.job_title
                          : "__OTHER__"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__OTHER__") {
                          setIsCustomEditJobTitle(true);
                          setEditingStaff({ ...editingStaff, job_title: "" });
                        } else {
                          setIsCustomEditJobTitle(false);
                          setEditingStaff({ ...editingStaff, job_title: val });
                        }
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 rounded-xl px-3 py-2 text-xs"
                    >
                      {(DEPARTMENT_JOB_TITLES[editingStaff.department] || STUDIO_DEPARTMENTS.flatMap((d) => DEPARTMENT_JOB_TITLES[d])).map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                      <option value="__OTHER__">Other (Specify Manually...)</option>
                    </select>
                    {(isCustomEditJobTitle || !(DEPARTMENT_JOB_TITLES[editingStaff.department] || []).includes(editingStaff.job_title)) && (
                      <input
                        type="text"
                        value={editingStaff.job_title || ""}
                        onChange={(e) => setEditingStaff({ ...editingStaff, job_title: e.target.value })}
                        placeholder="Type custom job title..."
                        className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/60 rounded-xl px-3 py-2 text-xs"
                      />
                    )}
                  </div>
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
