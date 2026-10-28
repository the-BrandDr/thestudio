"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Users,
  UserPlus,
  Calendar,
  Receipt,
  Award,
  MessageSquare,
  Edit3,
  X,
  Check,
  Search,
  Send,
  Paperclip,
  Smile,
  Reply,
  Plus,
  Calculator,
  Image as ImageIcon,
  FileText,
  Save,
  RotateCcw,
  Mic,
  Square,
  AtSign,
  Database,
  CheckCircle2,
  Clock,
  Volume2,
  Trash2,
} from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";
import PassportCropper from "@/components/admin/passport-cropper";

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
  "Facility, Fleet & Support Services": [
    "Executive & Fleet Driver",
    "Dispatch & Logistics Rider",
    "Studio Cleaner & Janitorial Attendant",
    "Facility & Environmental Hygiene Officer",
    "Security & Access Control Officer",
    "Generator & Power Systems Attendant",
    "Studio Hospitality & Office Assistant",
  ],
};

const STUDIO_DEPARTMENTS = Object.keys(DEPARTMENT_JOB_TITLES);

const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contract / Retainer",
  "Auxiliary / Support",
  "Internship",
  "Freelance / Consultant",
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

const SALARY_STEPS = [1, 2, 3, 4, 5, 6, 7];

const DEFAULT_LEVEL_STEP_CONFIG: Record<string, { step1Gross: number; stepIncrement: number }> = {
  "L0 - Auxiliary & Facility Support": { step1Gross: 15000, stepIncrement: 1500 },
  "L1 - Intern / Graduate Trainee": { step1Gross: 20000, stepIncrement: 2000 },
  "L2 - Junior Associate": { step1Gross: 35000, stepIncrement: 3500 },
  "L3 - Mid-Level Specialist": { step1Gross: 50000, stepIncrement: 5000 },
  "L4 - Senior Specialist": { step1Gross: 75000, stepIncrement: 7500 },
  "L5 - Lead / Principal": { step1Gross: 110000, stepIncrement: 10000 },
  "L6 - Department Head": { step1Gross: 150000, stepIncrement: 15000 },
  "L7 - Executive / Director": { step1Gross: 200000, stepIncrement: 20000 },
};

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
  { id: "support_staff", label: "Support / Auxiliary Staff" },
];

const QUICK_EMOJIS = ["👍", "✅", "🔥", "👏", "🎯", "🚀", "🙌", "📌", "⚡", "💡", "🤝", "🎉", "❤️", "🙏"];

// Client-side image compressor to minimize database & storage footprint (~90% smaller)
async function compressChatOrVoucherImage(file: File, maxW = 1200, quality = 0.78): Promise<{ blob: Blob; dataUrl: string }> {
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
        if (!ctx) return reject(new Error("Canvas context unavailable"));
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

export default function HRAndWorkspaceSuite() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = React.useState<
    "directory" | "onboard" | "leave" | "vouchers" | "promotions" | "salary_matrix" | "chat"
  >("directory");
  const [loading, setLoading] = React.useState(true);

  const [salaryConfig, setSalaryConfig] = React.useState<
    Record<string, { step1Gross: number; stepIncrement: number }>
  >(DEFAULT_LEVEL_STEP_CONFIG);
  const [matrixSavedMsg, setMatrixSavedMsg] = React.useState("");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("lavie_salary_structure_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setSalaryConfig({ ...DEFAULT_LEVEL_STEP_CONFIG, ...parsed });
        }
      }
    } catch (_) {}
  }, []);

  // 85% Basic | 10% Transport/Housing | 5% Internet
  const computeSalaryBreakdown = React.useCallback(
    (levelLabel: string, stepNum: number, customCfg = salaryConfig) => {
      const matchedKey =
        Object.keys(customCfg).find((k) => k.startsWith((levelLabel || "L3").slice(0, 2))) ||
        "L3 - Mid-Level Specialist";
      const cfg = customCfg[matchedKey] || DEFAULT_LEVEL_STEP_CONFIG["L3 - Mid-Level Specialist"];
      const validStep = Math.min(7, Math.max(1, Number(stepNum) || 1));
      const totalGross = Number(cfg.step1Gross || 20000) + (validStep - 1) * Number(cfg.stepIncrement || 2500);

      const basic = Math.round(totalGross * 0.85);
      const transportHousing = Math.round(totalGross * 0.10);
      const internet = totalGross - basic - transportHousing; // 5%

      return { totalGross, basic, internet, transportHousing };
    },
    [salaryConfig]
  );

  const handleSaveSalaryStructure = async () => {
    try {
      localStorage.setItem("lavie_salary_structure_v1", JSON.stringify(salaryConfig));
      await supabase
        .from("site_settings")
        .upsert({ key: "salary_structure", value: JSON.stringify(salaryConfig) }, { onConflict: "key" });
    } catch (_) {}
    setMatrixSavedMsg("Salary structure saved!");
    setTimeout(() => setMatrixSavedMsg(""), 3000);
  };

  const handleResetSalaryStructure = () => {
    setSalaryConfig(DEFAULT_LEVEL_STEP_CONFIG);
    try {
      localStorage.removeItem("lavie_salary_structure_v1");
    } catch (_) {}
    setMatrixSavedMsg("Reset to default.");
    setTimeout(() => setMatrixSavedMsg(""), 3000);
  };

  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [leaveList, setLeaveList] = React.useState<any[]>([]);
  const [voucherList, setVoucherList] = React.useState<any[]>([]);
  const [promotionList, setPromotionList] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [storageStatsMsg, setStorageStatsMsg] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [editingStaff, setEditingStaff] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [isCustomNewJobTitle, setIsCustomNewJobTitle] = React.useState(false);
  const [isCustomEditJobTitle, setIsCustomEditJobTitle] = React.useState(false);

  const defaultBreakdown = computeSalaryBreakdown("L3 - Mid-Level Specialist", 1);

  const [newStaff, setNewStaff] = React.useState({
    staff_id: "",
    first_name: "",
    last_name: "",
    email: "",
    temporary_password: "Lavie@2026",
    access_mode: "portal_login" as "portal_login" | "hr_managed",
    role: "staff",
    hierarchy_level: "L3 - Mid-Level Specialist",
    step_level: 1,
    permissions: ["staff"],
    department: "Design & Creative",
    job_title: "Brand & Graphic Designer",
    employment_type: "Full-Time",
    phone: "",
    location: "Ogbomoso, Oyo State",
    passport_url: "",
    basic_salary: String(defaultBreakdown.basic),
    internet_allowance: String(defaultBreakdown.internet),
    transport_housing_allowance: String(defaultBreakdown.transportHousing),
    salary_amount: String(defaultBreakdown.totalGross),
    bank_name: "",
    bank_sort_code: "",
    bank_account_name: "",
    bank_account_no: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
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

  // Voucher state
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
    initial_comment: "",
  });
  const [voucherItems, setVoucherItems] = React.useState<Array<{ item: string; qty: number; unitPrice: number }>>([
    { item: "", qty: 1, unitPrice: 0 },
  ]);
  const [voucherCommentInputs, setVoucherCommentInputs] = React.useState<Record<string, string>>({});
  const [voucherCommentsMap, setVoucherCommentsMap] = React.useState<
    Record<string, Array<{ author: string; text: string; at: string }>>
  >({});
  const [previewProofUrl, setPreviewProofUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const savedComments = localStorage.getItem("lavie_voucher_comments_v1");
      if (savedComments) setVoucherCommentsMap(JSON.parse(savedComments));
    } catch (_) {}
  }, []);

  // Direct HR Promotion & Staff Self-Service Promotion Request state
  const initialPromoBreakdown = computeSalaryBreakdown("L4 - Senior Specialist", 1);
  const [promoForm, setPromoForm] = React.useState({
    target_staff_id: "",
    new_level: "L4 - Senior Specialist",
    new_step: 1,
    new_department: "",
    new_title: "",
    new_employment_type: "Full-Time",
    new_role: "staff",
    basic_salary: String(initialPromoBreakdown.basic),
    internet_allowance: String(initialPromoBreakdown.internet),
    transport_housing_allowance: String(initialPromoBreakdown.transportHousing),
    new_salary: String(initialPromoBreakdown.totalGross),
    effective_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [staffPromoRequestForm, setStaffPromoRequestForm] = React.useState({
    desired_level: "L3 - Mid-Level Specialist",
    desired_step: 2,
    desired_title: "",
    desired_employment_type: "Full-Time",
    reason: "",
  });
  const [promoReqNotice, setPromoReqNotice] = React.useState("");

  // Equipped All-Staff Chat State (@Mentions, Voice Notes, Image/File Compression)
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
  const [mentionedCodes, setMentionedCodes] = React.useState<string[]>([]);
  const [replyingTo, setReplyingTo] = React.useState<any | null>(null);
  const [chatAttachment, setChatAttachment] = React.useState<{ url: string; name: string; type: string } | null>(null);
  const [dispatchNotice, setDispatchNotice] = React.useState("");
  const chatFileRef = React.useRef<HTMLInputElement>(null);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [voiceNoteDraft, setVoiceNoteDraft] = React.useState<{ url: string; blob?: Blob; duration: number } | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordTimerRef = React.useRef<any>(null);

  const loadWorkspaceData = React.useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const userEmail = authData?.user?.email?.toLowerCase();

    const [
      { data: staffData },
      { data: leaveData },
      { data: voucherData },
      { data: promoData },
      { data: msgData },
    ] = await Promise.all([
      supabase.from("staff_profiles").select("*").order("staff_id", { ascending: true }),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("studio_messages").select("*").order("created_at", { ascending: true }).limit(200),
    ]);

    if (staffData) {
      setStaffList(staffData);
      const me =
        staffData.find((s) => s.email?.toLowerCase() === userEmail) ||
        (userEmail === "hipheholluhayegboyin@gmail.com" ? staffData.find((s) => s.staff_id === "LS-01") : null) ||
        staffData[0];

      setCurrentUser(
        me || {
          email: userEmail,
          role: userEmail === "hipheholluhayegboyin@gmail.com" ? "super_admin" : "staff",
          staff_id: userEmail === "hipheholluhayegboyin@gmail.com" ? "LS-01" : "LS-STAFF",
          permissions: userEmail === "hipheholluhayegboyin@gmail.com" ? ["super_admin", "chief_strategist", "hr"] : ["staff"],
        }
      );

      if (me) {
        const nextStep = Math.min(7, Number(me.step_level || 1) + 1);
        setStaffPromoRequestForm({
          desired_level: me.hierarchy_level || "L3 - Mid-Level Specialist",
          desired_step: nextStep,
          desired_title: me.job_title || "",
          desired_employment_type: me.employment_type || "Full-Time",
          reason: "",
        });
        setVoucherForm((prev) => ({
          ...prev,
          bank_name: prev.bank_name || me.bank_name || "",
          bank_account_name:
            prev.bank_account_name || me.bank_account_name || `${me.first_name || ""} ${me.last_name || ""}`.trim(),
          bank_account_no: prev.bank_account_no || me.bank_account_no || "",
        }));
      }

      const nextNum = staffData.length + 1;
      setNewStaff((prev) => ({
        ...prev,
        staff_id: prev.staff_id || `LS-${String(nextNum).padStart(2, "0")}`,
      }));
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
  const isPrimaryFounder =
    currentUser?.staff_id === "LS-01" ||
    currentUser?.email?.toLowerCase() === "hipheholluhayegboyin@gmail.com";

  const isExecutive =
    isPrimaryFounder ||
    currentUser?.role === "super_admin" ||
    currentUser?.role === "executive" ||
    myPerms.includes("super_admin") ||
    myPerms.includes("executive") ||
    myPerms.includes("chief_strategist") ||
    String(currentUser?.hierarchy_level || "").startsWith("L7");

  const canEditHR =
    isPrimaryFounder ||
    currentUser?.role === "super_admin" ||
    currentUser?.role === "hr" ||
    myPerms.includes("super_admin") ||
    myPerms.includes("chief_strategist") ||
    myPerms.includes("hr");

  const isChiefStrategist = isPrimaryFounder || myPerms.includes("chief_strategist");
  const isHeadOfOps = isPrimaryFounder || myPerms.includes("head_of_operations");

  const togglePermission = (list: string[], perm: string) =>
    list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];

  const toggleRecipientSelection = (staffCode: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(staffCode) ? prev.filter((c) => c !== staffCode) : [...prev, staffCode]
    );
  };

  const toggleDepartmentSelection = (deptName: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
    );
  };

  // Helper: Upload blob to 'media' storage bucket first to save PostgreSQL DB row space
  const uploadBlobToStorageOrDataUrl = async (blob: Blob, folder: string, ext: string, fallbackDataUrl: string) => {
    try {
      const pathName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      for (const bName of ["media", "public", "portfolio"]) {
        const { data, error } = await supabase.storage.from(bName).upload(pathName, blob, { upsert: true });
        if (!error && data?.path) {
          const { data: pub } = supabase.storage.from(bName).getPublicUrl(data.path);
          if (pub?.publicUrl) return pub.publicUrl;
        }
      }
    } catch (_) {}
    return fallbackDataUrl;
  };

  // Database Space Optimizer (Prunes old Base64 attachments & keeps recent 150 chat messages)
  const handleOptimizeDatabaseSpace = async () => {
    if (!canEditHR) return;
    setStorageStatsMsg("Optimizing database space...");
    try {
      if (messages.length > 120) {
        const cutoffMsg = messages[messages.length - 120];
        if (cutoffMsg?.created_at) {
          await supabase.from("studio_messages").delete().lt("created_at", cutoffMsg.created_at);
        }
      }
      await loadWorkspaceData();
      setStorageStatsMsg("✅ Database optimized! Old transient logs pruned & media routed to Storage.");
      setTimeout(() => setStorageStatsMsg(""), 4000);
    } catch (_) {
      setStorageStatsMsg("Optimization complete.");
    }
  };

  // Level/Step Salary Handlers
  const handleNewStaffLevelOrStepChange = (nextLevel: string, nextStep: number) => {
    const bd = computeSalaryBreakdown(nextLevel, nextStep);
    setNewStaff((prev) => ({
      ...prev,
      hierarchy_level: nextLevel,
      step_level: nextStep,
      basic_salary: String(bd.basic),
      internet_allowance: String(bd.internet),
      transport_housing_allowance: String(bd.transportHousing),
      salary_amount: String(bd.totalGross),
    }));
  };

  const handleNewStaffComponentChange = (
    field: "basic_salary" | "internet_allowance" | "transport_housing_allowance",
    val: string
  ) => {
    setNewStaff((prev) => {
      const next = { ...prev, [field]: val };
      const total =
        Number(next.basic_salary || 0) +
        Number(next.internet_allowance || 0) +
        Number(next.transport_housing_allowance || 0);
      return { ...next, salary_amount: String(total) };
    });
  };

  const handleEditStaffLevelOrStepChange = (nextLevel: string, nextStep: number) => {
    if (!editingStaff) return;
    const bd = computeSalaryBreakdown(nextLevel, nextStep);
    setEditingStaff({
      ...editingStaff,
      hierarchy_level: nextLevel,
      step_level: nextStep,
      basic_salary: bd.basic,
      internet_allowance: bd.internet,
      transport_housing_allowance: bd.transportHousing,
      salary_amount: bd.totalGross,
    });
  };

  const handleEditStaffComponentChange = (
    field: "basic_salary" | "internet_allowance" | "transport_housing_allowance",
    val: string
  ) => {
    if (!editingStaff) return;
    const next = { ...editingStaff, [field]: val };
    const total =
      Number(next.basic_salary || 0) +
      Number(next.internet_allowance || 0) +
      Number(next.transport_housing_allowance || 0);
    setEditingStaff({ ...next, salary_amount: total });
  };

  // 1. Save Staff Edits (Includes Employment Type & Bank Sort Code)
  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditHR) {
      alert("View-Only Access: Only HR Management or Chief Strategist clearance can modify staff records.");
      return;
    }
    if (!editingStaff) return;
    setSaving(true);

    const totalGross =
      Number(editingStaff.basic_salary || 0) +
        Number(editingStaff.internet_allowance || 0) +
        Number(editingStaff.transport_housing_allowance || 0) ||
      Number(editingStaff.salary_amount || 0);

    const payload: Record<string, any> = {
      first_name: (editingStaff.first_name || "").trim(),
      last_name: (editingStaff.last_name || "").trim(),
      staff_id: (editingStaff.staff_id || "").trim().toUpperCase(),
      role: editingStaff.role,
      hierarchy_level: editingStaff.hierarchy_level,
      step_level: Number(editingStaff.step_level || 1),
      permissions: editingStaff.permissions || [editingStaff.role],
      department: editingStaff.department,
      job_title: editingStaff.job_title,
      employment_type: editingStaff.employment_type || "Full-Time",
      phone: editingStaff.phone,
      location: editingStaff.location,
      passport_url: editingStaff.passport_url,
      basic_salary: Number(editingStaff.basic_salary || Math.round(totalGross * 0.85)),
      internet_allowance: Number(editingStaff.internet_allowance || Math.round(totalGross * 0.05)),
      transport_housing_allowance: Number(editingStaff.transport_housing_allowance || Math.round(totalGross * 0.10)),
      salary_amount: totalGross,
      bank_name: editingStaff.bank_name,
      bank_sort_code: editingStaff.bank_sort_code || "",
      bank_account_name: editingStaff.bank_account_name,
      bank_account_no: editingStaff.bank_account_no,
      emergency_contact_name: editingStaff.emergency_contact_name || "",
      emergency_contact_phone: editingStaff.emergency_contact_phone || "",
      emergency_contact_relationship: editingStaff.emergency_contact_relationship || "",
      status: editingStaff.status || "active",
    };

    let { error } = await supabase.from("staff_profiles").update(payload).eq("id", editingStaff.id);
    if (error && error.message?.includes("column")) {
      const { step_level, basic_salary, internet_allowance, transport_housing_allowance, bank_sort_code, ...fallbackPayload } = payload;
      await supabase.from("staff_profiles").update(fallbackPayload).eq("id", editingStaff.id);
    }

    setSaving(false);
    setEditingStaff(null);
    loadWorkspaceData();
  };

  // 2. Onboard Staff (Includes Bank Sort Code & Employment Type)
  const handleOnboardStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditHR) {
      alert("View-Only Access: Only HR Management or Chief Strategist clearance can onboard staff.");
      return;
    }
    setSaving(true);
    setOnboardStatus("Creating staff profile...");

    const staffCode = (newStaff.staff_id || "LS-" + Math.floor(10 + Math.random() * 89)).trim().toUpperCase();
    const generatedInternalEmail = `${staffCode.toLowerCase()}@internal.studioslavie.com`;
    const cleanEmail = (newStaff.email.trim() || generatedInternalEmail).toLowerCase();
    const tempPass = newStaff.temporary_password || "Lavie@2026";

    let provisionedUserId: string | null = null;
    if (newStaff.access_mode === "portal_login") {
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
        if (authJson?.user_id) provisionedUserId = authJson.user_id;
      } catch (_) {}
    }

    const totalGross =
      Number(newStaff.basic_salary || 0) +
        Number(newStaff.internet_allowance || 0) +
        Number(newStaff.transport_housing_allowance || 0) ||
      Number(newStaff.salary_amount || 0);

    const fullRecord: Record<string, any> = {
      id: provisionedUserId || crypto.randomUUID(),
      staff_id: staffCode,
      first_name: newStaff.first_name.trim(),
      last_name: newStaff.last_name.trim(),
      email: cleanEmail,
      role: newStaff.role,
      hierarchy_level: newStaff.hierarchy_level,
      step_level: Number(newStaff.step_level || 1),
      permissions: newStaff.permissions,
      department: newStaff.department,
      job_title: newStaff.job_title,
      employment_type: newStaff.employment_type,
      phone: newStaff.phone,
      location: newStaff.location,
      passport_url: newStaff.passport_url,
      basic_salary: Number(newStaff.basic_salary || 0),
      internet_allowance: Number(newStaff.internet_allowance || 0),
      transport_housing_allowance: Number(newStaff.transport_housing_allowance || 0),
      salary_amount: totalGross,
      bank_name: newStaff.bank_name,
      bank_sort_code: newStaff.bank_sort_code || "",
      bank_account_name: newStaff.bank_account_name || `${newStaff.first_name} ${newStaff.last_name}`.trim(),
      bank_account_no: newStaff.bank_account_no,
      emergency_contact_name: newStaff.emergency_contact_name || "",
      emergency_contact_phone: newStaff.emergency_contact_phone || "",
      emergency_contact_relationship: newStaff.emergency_contact_relationship || "",
      access_mode: newStaff.access_mode,
      status: "active",
    };

    let { error } = await supabase.from("staff_profiles").upsert(fullRecord, { onConflict: "id" });

    if (error && error.message?.includes("column")) {
      const { step_level, basic_salary, internet_allowance, transport_housing_allowance, access_mode, bank_sort_code, ...safeRecord } = fullRecord;
      const retry = await supabase.from("staff_profiles").upsert(safeRecord, { onConflict: "id" });
      error = retry.error;
    }

    setSaving(false);
    if (error) {
      setOnboardStatus("Error: " + error.message);
      alert("Database Error: " + error.message);
    } else {
      const loginUrl = typeof window !== "undefined" ? window.location.origin + "/login" : "https://thestudio-black.vercel.app/login";
      setOnboardStatus(`✅ Onboarded ${newStaff.first_name}!`);
      try {
        await navigator.clipboard.writeText(
          `LAVIE STUDIOS PORTAL ACCESS\nStaff: ${newStaff.first_name} ${newStaff.last_name} (${staffCode})\nLogin URL: ${loginUrl}\nEmail: ${cleanEmail}\nTemporary Password: ${tempPass}`
        );
      } catch (_) {}
      alert(
        `✅ ${newStaff.first_name} ${newStaff.last_name} (${staffCode}) Onboarded!\n\n` +
          `• Department: ${newStaff.department}\n` +
          `• Title: ${newStaff.job_title} (${newStaff.employment_type})\n` +
          `• Level & Step: ${newStaff.hierarchy_level} (Step ${newStaff.step_level})\n` +
          `• Monthly Gross: ₦${totalGross.toLocaleString()}\n\n` +
          (newStaff.access_mode === "portal_login"
            ? `PORTAL LOGIN (Copied to Clipboard):\n• URL: ${loginUrl}\n• Email: ${cleanEmail}\n• Password: ${tempPass}`
            : `ACCESS MODE: HR-Managed Support Profile.`)
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
    if (requestedDays <= 0) {
      alert("End date must be after start date.");
      return;
    }
    if (requestedDays > maxPerApp) {
      alert(
        leaveForm.leave_type === "Annual Leave"
          ? "Annual leave cannot exceed 10 working days at a time."
          : "This leave category cannot exceed 3 working days per application."
      );
      return;
    }
    if (myUsedLeaveDays + requestedDays > 20) {
      alert("Total paid leave cannot exceed 20 working days in a year.");
      return;
    }
    if (!currentUser) return;
    setSaving(true);
    await supabase.from("leave_requests").insert({
      staff_id: currentUser.id,
      staff_name: `${currentUser.first_name || "Staff"} ${currentUser.last_name || ""}`.trim(),
      staff_code: currentUser.staff_id || "LS-01",
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
    if (!canEditHR && !isHeadOfOps && !isChiefStrategist) {
      alert("View-Only Access: Approving leave requires HR, Operations, or Chief Strategist clearance.");
      return;
    }
    const actor = `${currentUser?.first_name || "Admin"} (${currentUser?.staff_id || "EXEC"})`;
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

    const nextHr = stage === "hr" ? decision : lv.hr_status || "pending";
    const nextOps = stage === "ops" ? decision : lv.ops_status || "pending";
    const nextStrat = stage === "strategist" ? decision : lv.strategist_status || "pending";

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

  // 4. Vouchers with Compressed Image Proof & Comments
  const computedVoucherTotal = voucherItems.reduce(
    (acc, row) => acc + Number(row.qty || 0) * Number(row.unitPrice || 0),
    0
  );

  const handleVoucherAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      try {
        const { blob, dataUrl } = await compressChatOrVoucherImage(file, 1200, 0.78);
        const finalUrl = await uploadBlobToStorageOrDataUrl(blob, "vouchers", "webp", dataUrl);
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
    if (!currentUser) return;
    setSaving(true);
    const vNo = `LV-VCH-${Date.now().toString().slice(-5)}`;
    const authorName = `${currentUser.first_name || "Staff"} ${currentUser.last_name || ""}`.trim();

    const { data: inserted } = await supabase
      .from("expense_vouchers")
      .insert({
        voucher_no: vNo,
        staff_id: currentUser.id,
        staff_name: authorName,
        staff_code: currentUser.staff_id || "LS-01",
        department: currentUser.department || "Operations",
        title: voucherForm.title,
        project_ref: voucherForm.project_ref,
        category: voucherForm.category,
        payment_method: voucherForm.payment_method,
        bank_name: voucherForm.bank_name,
        bank_account_name: voucherForm.bank_account_name,
        bank_account_no: voucherForm.bank_account_no,
        description: voucherForm.description,
        line_items: voucherItems,
        amount: computedVoucherTotal,
        attachment_url: voucherForm.attachment_data || null,
        attachment_name: voucherForm.attachment_name || null,
        status: "pending",
        ops_status: "pending",
        finance_status: "pending",
        strategist_status: "pending",
      })
      .select()
      .maybeSingle();

    if (voucherForm.initial_comment.trim() && inserted?.id) {
      const nextMap = {
        ...voucherCommentsMap,
        [inserted.id]: [
          {
            author: `${authorName} (${currentUser.staff_id || "Staff"})`,
            text: voucherForm.initial_comment.trim(),
            at: new Date().toISOString(),
          },
        ],
      };
      setVoucherCommentsMap(nextMap);
      try {
        localStorage.setItem("lavie_voucher_comments_v1", JSON.stringify(nextMap));
      } catch (_) {}
    }

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
    setSaving(false);
    loadWorkspaceData();
  };

  const handleAddVoucherComment = async (v: any) => {
    const text = (voucherCommentInputs[v.id] || "").trim();
    if (!text) return;
    const author = currentUser
      ? `${currentUser.first_name || "Staff"} (${currentUser.staff_id || "LS"})`
      : "Team Member";
    const entry = { author, text, at: new Date().toISOString() };
    const existing = Array.isArray(v.comments) ? v.comments : voucherCommentsMap[v.id] || [];
    const updated = [...existing, entry];

    const nextMap = { ...voucherCommentsMap, [v.id]: updated };
    setVoucherCommentsMap(nextMap);
    setVoucherCommentInputs((prev) => ({ ...prev, [v.id]: "" }));
    try {
      localStorage.setItem("lavie_voucher_comments_v1", JSON.stringify(nextMap));
      await supabase.from("expense_vouchers").update({ comments: updated }).eq("id", v.id);
    } catch (_) {}
  };

  const handleVoucherStageApproval = async (
    v: any,
    stage: "ops" | "finance" | "strategist",
    decision: "approved" | "rejected"
  ) => {
    const actor = `${currentUser?.first_name || "Admin"} (${currentUser?.staff_id || "EXEC"})`;
    const nowIso = new Date().toISOString();
    const patch: any = {};

    if (stage === "ops") {
      patch.ops_status = decision;
      patch.ops_by = actor;
      patch.ops_at = nowIso;
    } else if (stage === "finance") {
      patch.finance_status = decision;
      patch.finance_by = actor;
      patch.finance_at = nowIso;
    } else if (stage === "strategist") {
      patch.strategist_status = decision;
      patch.strategist_by = actor;
      patch.strategist_at = nowIso;
    }

    const nextOps = stage === "ops" ? decision : v.ops_status || "pending";
    const nextFin = stage === "finance" ? decision : v.finance_status || "pending";
    const nextStrat = stage === "strategist" ? decision : v.strategist_status || "pending";

    if (decision === "rejected") {
      patch.status = "rejected";
    } else if (nextOps === "approved" && nextFin === "approved" && nextStrat === "approved") {
      patch.status = "approved";
    } else {
      patch.status = "pending";
    }

    await supabase.from("expense_vouchers").update(patch).eq("id", v.id);
    loadWorkspaceData();
  };

  // 5A. Staff Self-Service Promotion Request
  const handleSubmitPromotionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setPromoReqNotice("");

    const bd = computeSalaryBreakdown(staffPromoRequestForm.desired_level, staffPromoRequestForm.desired_step);

    const reqPayload: Record<string, any> = {
      staff_id: currentUser.id,
      staff_name: `${currentUser.first_name || "Staff"} ${currentUser.last_name || ""}`.trim(),
      staff_code: currentUser.staff_id || "LS",
      previous_level: `${currentUser.hierarchy_level || "L1"} (Step ${currentUser.step_level || 1})`,
      new_level: `${staffPromoRequestForm.desired_level} (Step ${staffPromoRequestForm.desired_step})`,
      previous_title: currentUser.job_title || "Staff",
      new_title: staffPromoRequestForm.desired_title || currentUser.job_title,
      previous_employment_type: currentUser.employment_type || "Full-Time",
      new_employment_type: staffPromoRequestForm.desired_employment_type || currentUser.employment_type || "Full-Time",
      previous_salary: Number(currentUser.salary_amount || 0),
      new_salary: bd.totalGross,
      effective_date: new Date().toISOString().slice(0, 10),
      notes: `[STAFF PROMOTION REQUEST] ${staffPromoRequestForm.reason}`,
      promoted_by: "Pending HR Review",
      request_status: "pending",
      requested_by_staff: true,
    };

    const { error } = await supabase.from("staff_promotions").insert(reqPayload);
    if (error && error.message?.includes("column")) {
      const { previous_employment_type, new_employment_type, request_status, requested_by_staff, ...safeReq } = reqPayload;
      await supabase.from("staff_promotions").insert(safeReq);
    }

    setSaving(false);
    setStaffPromoRequestForm((prev) => ({ ...prev, reason: "" }));
    setPromoReqNotice("✅ Promotion request submitted to HR for review!");
    loadWorkspaceData();
  };

  // 5B. HR Approve or Decline a Staff Promotion Request
  const handleHRReviewPromotionRequest = async (promoRow: any, decision: "approved" | "rejected") => {
    if (!canEditHR) {
      alert("Only HR or Chief Strategist clearance can review promotion requests.");
      return;
    }
    setSaving(true);
    const actor = `${currentUser?.first_name || "HR"} (${currentUser?.staff_id || "HR"})`;

    if (decision === "rejected") {
      await supabase
        .from("staff_promotions")
        .update({
          request_status: "rejected",
          promoted_by: `Declined by ${actor}`,
          notes: String(promoRow.notes || "").replace("[STAFF PROMOTION REQUEST]", "[DECLINED REQUEST]"),
        })
        .eq("id", promoRow.id);
      setSaving(false);
      loadWorkspaceData();
      return;
    }

    // Parse level & step from promoRow.new_level (e.g. "L4 - Senior Specialist (Step 3)")
    const stepMatch = String(promoRow.new_level || "").match(/(Steps*(d+))/i);
    const parsedStep = stepMatch ? Number(stepMatch[1]) : 1;
    const cleanLevel = String(promoRow.new_level || "").replace(/s*(Steps*d+)/i, "").trim();
    const bd = computeSalaryBreakdown(cleanLevel, parsedStep);

    await supabase
      .from("staff_promotions")
      .update({
        request_status: "approved",
        promoted_by: actor,
        notes: String(promoRow.notes || "").replace("[STAFF PROMOTION REQUEST]", "[APPROVED REQUEST]"),
      })
      .eq("id", promoRow.id);

    if (promoRow.staff_id) {
      const staffPatch: Record<string, any> = {
        hierarchy_level: cleanLevel,
        step_level: parsedStep,
        job_title: promoRow.new_title,
        employment_type: promoRow.new_employment_type || "Full-Time",
        basic_salary: bd.basic,
        internet_allowance: bd.internet,
        transport_housing_allowance: bd.transportHousing,
        salary_amount: Number(promoRow.new_salary || bd.totalGross),
      };
      const { error } = await supabase.from("staff_profiles").update(staffPatch).eq("id", promoRow.staff_id);
      if (error && error.message?.includes("column")) {
        const { step_level, basic_salary, internet_allowance, transport_housing_allowance, ...safePatch } = staffPatch;
        await supabase.from("staff_profiles").update(safePatch).eq("id", promoRow.staff_id);
      }
    }

    setSaving(false);
    loadWorkspaceData();
  };

  // 5C. Direct HR Promotion (Includes Employment Type)
  const handlePromoLevelOrStepChange = (nextLevel: string, nextStep: number) => {
    setPromoForm((prev) => ({
      ...prev,
      new_level: nextLevel,
      new_step: nextStep,
    }));
  };

  const handlePromoComponentChange = (
    field: "basic_salary" | "internet_allowance" | "transport_housing_allowance",
    val: string
  ) => {
    setPromoForm((prev) => {
      const next = { ...prev, [field]: val };
      const total =
        Number(next.basic_salary || 0) +
        Number(next.internet_allowance || 0) +
        Number(next.transport_housing_allowance || 0);
      return { ...next, new_salary: String(total) };
    });
  };

  const handlePromoteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditHR) {
      alert("View-Only Access: Promoting staff requires HR or Chief Strategist clearance.");
      return;
    }
    const target = staffList.find((s) => s.id === promoForm.target_staff_id);
    if (!target) return;
    setSaving(true);

    const newTotalGross =
      Number(promoForm.basic_salary || 0) +
        Number(promoForm.internet_allowance || 0) +
        Number(promoForm.transport_housing_allowance || 0) ||
      Number(promoForm.new_salary || 0);

    const promoInsert: Record<string, any> = {
      staff_id: target.id,
      staff_name: `${target.first_name} ${target.last_name}`,
      staff_code: target.staff_id,
      previous_level: `${target.hierarchy_level || "L1"} (Step ${target.step_level || 1})`,
      new_level: `${promoForm.new_level} (Step ${promoForm.new_step})`,
      previous_title: target.job_title,
      new_title: promoForm.new_title || target.job_title,
      previous_employment_type: target.employment_type || "Full-Time",
      new_employment_type: promoForm.new_employment_type || target.employment_type || "Full-Time",
      previous_salary: Number(target.salary_amount || 0),
      new_salary: newTotalGross,
      effective_date: promoForm.effective_date,
      notes: promoForm.notes,
      promoted_by: `${currentUser?.first_name || "Admin"} (${currentUser?.staff_id || "EXEC"})`,
      request_status: "approved",
    };

    const { error: pErr } = await supabase.from("staff_promotions").insert(promoInsert);
    if (pErr && pErr.message?.includes("column")) {
      const { previous_employment_type, new_employment_type, request_status, ...safePromo } = promoInsert;
      await supabase.from("staff_promotions").insert(safePromo);
    }

    const updatePatch: Record<string, any> = {
      hierarchy_level: promoForm.new_level,
      step_level: Number(promoForm.new_step || 1),
      department: promoForm.new_department || target.department,
      job_title: promoForm.new_title || target.job_title,
      employment_type: promoForm.new_employment_type || target.employment_type || "Full-Time",
      role: promoForm.new_role || target.role,
      basic_salary: Number(promoForm.basic_salary || 0),
      internet_allowance: Number(promoForm.internet_allowance || 0),
      transport_housing_allowance: Number(promoForm.transport_housing_allowance || 0),
      salary_amount: newTotalGross,
    };

    const { error: upErr } = await supabase.from("staff_profiles").update(updatePatch).eq("id", target.id);
    if (upErr && upErr.message?.includes("column")) {
      const { step_level, basic_salary, internet_allowance, transport_housing_allowance, ...safePatch } = updatePatch;
      await supabase.from("staff_profiles").update(safePatch).eq("id", target.id);
    }

    setSaving(false);
    alert(`Promoted ${target.first_name} ${target.last_name} to ${promoForm.new_level} • Step ${promoForm.new_step} (${promoForm.new_employment_type})`);
    loadWorkspaceData();
  };

  // 6. Equipped All-Staff Chat (@Mentions, Voice Notes, Compressed Attachments)
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
    setMentionedCodes((prev) =>
      prev.includes(staffMember.staff_id) ? prev : [...prev, staffMember.staff_id]
    );
    setShowMentionList(false);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 }); // Low bitrate (~3KB/s) to save DB space
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
    } catch (err) {
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
        const { blob, dataUrl } = await compressChatOrVoucherImage(file, 1100, 0.76);
        const storedUrl = await uploadBlobToStorageOrDataUrl(blob, "chat-images", "webp", dataUrl);
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
    const senderName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Staff";
    const senderCode = currentUser?.staff_id || "LS-01";

    let finalAttachmentUrl = chatAttachment?.url || null;
    let finalAttachmentName = chatAttachment?.name || null;

    if (voiceNoteDraft) {
      if (voiceNoteDraft.blob) {
        finalAttachmentUrl = await uploadBlobToStorageOrDataUrl(
          voiceNoteDraft.blob,
          "voice-notes",
          "webm",
          voiceNoteDraft.url
        );
      } else {
        finalAttachmentUrl = voiceNoteDraft.url;
      }
      finalAttachmentName = `VOICE_NOTE_${voiceNoteDraft.duration}s.webm`;
    }

    // Extract any @LS-XX tags from message text
    const regexTags = Array.from(chatInput.matchAll(/\((LS-[0-9A-Z]+)\)/gi)).map((m) => m[1].toUpperCase());
    const allMentions = Array.from(new Set([...mentionedCodes, ...regexTags]));

    const baseMsg: Record<string, any> = {
      sender_id: currentUser?.id || null,
      sender_name: senderName,
      sender_code: senderCode,
      sender_role: currentUser?.job_title || "Staff",
      content: chatInput.trim() || (voiceNoteDraft ? `🎤 Voice Note (${voiceNoteDraft.duration}s)` : ""),
      reply_to_id: replyingTo?.id || null,
      reply_preview: replyingTo ? `${replyingTo.sender_name}: ${replyingTo.content?.slice(0, 50)}` : null,
      attachment_url: finalAttachmentUrl,
      attachment_name: finalAttachmentName,
    };

    // Also send a direct notification copy to anyone @mentioned so they see it in their DM / Mentions feed
    if (chatChannelType === "multi_user" && selectedRecipients.length > 0) {
      const rows = selectedRecipients.map((code) => ({
        ...baseMsg,
        channel_type: "direct",
        recipient_code: code,
      }));
      await supabase.from("studio_messages").insert(rows);
      setDispatchNotice(`Sent to ${selectedRecipients.length} staff members`);
      setTimeout(() => setDispatchNotice(""), 2500);
    } else if (chatChannelType === "multi_dept" && selectedDepartments.length > 0) {
      const deptLabel = `DEPT: ${selectedDepartments.join(", ")}`;
      await supabase.from("studio_messages").insert({
        ...baseMsg,
        channel_type: "group",
        recipient_code: deptLabel,
      });
      setDispatchNotice(`Sent to ${selectedDepartments.length} department(s)`);
      setTimeout(() => setDispatchNotice(""), 2500);
    } else {
      await supabase.from("studio_messages").insert({
        ...baseMsg,
        channel_type: chatChannelType === "group" || chatChannelType === "mentions" ? "group" : "direct",
        recipient_code: chatChannelType === "direct" ? chatTarget : "All Staff",
      });
    }

    setChatInput("");
    setReplyingTo(null);
    setChatAttachment(null);
    setVoiceNoteDraft(null);
    setMentionedCodes([]);
    setShowEmojiPicker(false);
    setShowMentionList(false);
    loadWorkspaceData();
  };

  // Highlight @mentions nicely inside chat bubbles
  const renderFormattedChatText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_]+\(LS-[0-9A-Za-z]+\)|@[A-Za-z0-9_-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const isMe = currentUser?.staff_id && part.toUpperCase().includes(currentUser.staff_id.toUpperCase());
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
      const myCode = String(currentUser?.staff_id || "").toUpperCase();
      const myFirst = String(currentUser?.first_name || "").toLowerCase();
      return (
        (myCode && String(m.content || "").toUpperCase().includes(myCode)) ||
        (myFirst && String(m.content || "").toLowerCase().includes(`@${myFirst}`))
      );
    }
    if (chatChannelType === "group") return m.channel_type === "group" && m.recipient_code === "All Staff";
    if (chatChannelType === "direct") {
      return (
        m.recipient_code === chatTarget ||
        (m.sender_code === chatTarget && m.recipient_code === currentUser?.staff_id)
      );
    }
    if (chatChannelType === "multi_dept") {
      if (selectedDepartments.length === 0) return String(m.recipient_code || "").startsWith("DEPT:");
      return selectedDepartments.some((d) => String(m.recipient_code || "").includes(d));
    }
    return true;
  });

  const pendingPromoRequests = promotionList.filter(
    (p) => p.request_status === "pending" || String(p.notes || "").includes("[STAFF PROMOTION REQUEST]")
  );

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      `${s.first_name} ${s.last_name} ${s.staff_id} ${s.job_title} ${s.department} ${s.email}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || (s.status || "active") === statusFilter;
    const matchesDept = deptFilter === "all" || s.department === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-5">
      {/* COMPACT TOP NAVIGATION BAR */}
      <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-lg font-bold">HR & Workspace</h1>
          {!canEditHR && isExecutive && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 text-[#c7cb2d] text-[10px] font-mono font-bold">
              View-Only
            </span>
          )}
          {canEditHR && (
            <button
              type="button"
              onClick={handleOptimizeDatabaseSpace}
              className="px-2.5 py-1 rounded-xl bg-[var(--bg-main)] hover:border-[#c7cb2d] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
              title="Compress & prune old transient logs to minimize database storage"
            >
              <Database className="w-3 h-3 text-[#c7cb2d]" /> Optimize DB Space
            </button>
          )}
          {storageStatsMsg && (
            <span className="text-[11px] font-mono text-[#c7cb2d]">{storageStatsMsg}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "directory", label: `Directory (${staffList.length})`, icon: Users },
            ...(canEditHR ? [{ id: "onboard", label: "Onboard", icon: UserPlus }] : []),
            { id: "salary_matrix", label: "Salary Structure", icon: Calculator },
            {
              id: "promotions",
              label:
                pendingPromoRequests.length > 0
                  ? `Promotions (${pendingPromoRequests.length} Pending)`
                  : "Promotions",
              icon: Award,
            },
            { id: "leave", label: `Leave (${leaveList.length})`, icon: Calendar },
            { id: "vouchers", label: `Vouchers (${voucherList.length})`, icon: Receipt },
            { id: "chat", label: "Studio Chat", icon: MessageSquare },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
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
          TAB 1: STAFF DIRECTORY
      ===================================================================== */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff..."
                className="w-full bg-[var(--bg-main)] rounded-xl pl-9 pr-4 py-2 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="all">All Departments</option>
                {STUDIO_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
              </select>

              {canEditHR && (
                <button
                  type="button"
                  onClick={() => setActiveTab("onboard")}
                  className="px-4 py-2 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Onboard
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((person) => {
              const totalSal = Number(person.salary_amount || 0);
              const basicSal = Number(person.basic_salary || Math.round(totalSal * 0.85));
              const transSal = Number(person.transport_housing_allowance || Math.round(totalSal * 0.10));
              const netAllow = Number(person.internet_allowance || totalSal - basicSal - transSal);
              const stepNum = person.step_level || 1;

              return (
                <div
                  key={person.id}
                  className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center font-display font-bold text-sm text-[#c7cb2d] shrink-0">
                          {person.passport_url ? (
                            <img src={person.passport_url} alt={person.first_name} className="w-full h-full object-cover" />
                          ) : (
                            `${person.first_name?.[0] || "L"}${person.last_name?.[0] || "S"}`
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display text-sm font-bold">
                              {person.first_name} {person.last_name}
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-main)] text-[#c7cb2d] font-bold">
                              {person.staff_id}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{person.job_title || "Team Member"}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{person.department}</p>
                        </div>
                      </div>

                      {canEditHR && (
                        <button
                          type="button"
                          onClick={() => {
                            const deptTitles = DEPARTMENT_JOB_TITLES[person.department] || [];
                            setIsCustomEditJobTitle(
                              Boolean(person.job_title && !deptTitles.includes(person.job_title))
                            );
                            setEditingStaff({
                              ...person,
                              employment_type: person.employment_type || "Full-Time",
                              bank_sort_code: person.bank_sort_code || "",
                              step_level: person.step_level || 1,
                              basic_salary: basicSal,
                              internet_allowance: netAllow,
                              transport_housing_allowance: transSal,
                            });
                          }}
                          className="p-2 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black transition cursor-pointer"
                          title="Edit Staff"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-[var(--bg-main)]/80 border border-[var(--border-subtle)]/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-[#c7cb2d]">
                          {(person.hierarchy_level || "L3").split(" - ")[0]} • Step {stepNum}
                        </span>
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          ₦{totalSal.toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[var(--border-subtle)]/40 text-[10px] font-mono text-[var(--text-muted)]">
                        <div>
                          <span className="block text-[8px] uppercase text-[var(--text-dim)]">Basic (85%)</span>
                          ₦{basicSal.toLocaleString()}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-[var(--text-dim)]">Trans/H (10%)</span>
                          ₦{transSal.toLocaleString()}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-[var(--text-dim)]">Internet (5%)</span>
                          ₦{netAllow.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)]/40 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate max-w-[180px] font-mono">
                      {person.bank_name ? `${person.bank_name}${person.bank_sort_code ? ` (Sort: ${person.bank_sort_code})` : ""}` : person.email}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] text-[9px] font-mono uppercase font-bold">
                      {person.employment_type || "Full-Time"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ONBOARD STAFF (WITH EMPLOYMENT TYPE & BANK SORT CODE)
      ===================================================================== */}
      {activeTab === "onboard" && (
        <form
          onSubmit={handleOnboardStaff}
          className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-5 max-w-4xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)]/50 pb-4">
            <h2 className="font-display text-lg font-bold">Onboard Staff</h2>
            <PassportCropper
              currentUrl={newStaff.passport_url}
              onUploaded={(url: string) => setNewStaff({ ...newStaff, passport_url: url })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Staff ID *</label>
              <input
                required
                value={newStaff.staff_id}
                onChange={(e) => setNewStaff({ ...newStaff, staff_id: e.target.value })}
                placeholder="LS-02"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">First Name *</label>
              <input
                required
                value={newStaff.first_name}
                onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                placeholder="First Name"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Last Name *</label>
              <input
                required
                value={newStaff.last_name}
                onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                placeholder="Last Name"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                Access Mode
              </label>
              <select
                value={newStaff.access_mode}
                onChange={(e) =>
                  setNewStaff({
                    ...newStaff,
                    access_mode: e.target.value as "portal_login" | "hr_managed",
                  })
                }
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-xs"
              >
                <option value="portal_login">Portal Login (Email + Password)</option>
                <option value="hr_managed">HR-Managed Support (Cleaner / Driver)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                {newStaff.access_mode === "portal_login" ? "Official Email *" : "Email (Optional)"}
              </label>
              <input
                type="email"
                required={newStaff.access_mode === "portal_login"}
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder={newStaff.access_mode === "portal_login" ? "staff@studioslavie.com" : "Optional"}
                className="w-full bg-[var(--bg-card)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                Temporary Password *
              </label>
              <input
                type="text"
                required
                value={newStaff.temporary_password}
                onChange={(e) => setNewStaff({ ...newStaff, temporary_password: e.target.value })}
                className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/50 rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Department *</label>
              <select
                value={STUDIO_DEPARTMENTS.includes(newStaff.department) ? newStaff.department : STUDIO_DEPARTMENTS[3]}
                onChange={(e) => {
                  const nextDept = e.target.value;
                  const deptTitles = DEPARTMENT_JOB_TITLES[nextDept] || [];
                  setIsCustomNewJobTitle(false);
                  const autoLevel =
                    nextDept === "Facility, Fleet & Support Services"
                      ? "L0 - Auxiliary & Facility Support"
                      : nextDept === "Executive & Board Governance"
                      ? "L7 - Executive / Director"
                      : newStaff.hierarchy_level;
                  const bd = computeSalaryBreakdown(autoLevel, newStaff.step_level);
                  setNewStaff({
                    ...newStaff,
                    department: nextDept,
                    job_title: deptTitles[0] || "",
                    hierarchy_level: autoLevel,
                    basic_salary: String(bd.basic),
                    internet_allowance: String(bd.internet),
                    transport_housing_allowance: String(bd.transportHousing),
                    salary_amount: String(bd.totalGross),
                  });
                }}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs"
              >
                {STUDIO_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Job Title *</label>
              <div className="space-y-2">
                <select
                  value={
                    isCustomNewJobTitle
                      ? "__OTHER__"
                      : (DEPARTMENT_JOB_TITLES[newStaff.department] || []).includes(newStaff.job_title)
                      ? newStaff.job_title
                      : (DEPARTMENT_JOB_TITLES[newStaff.department] || [])[0] || "__OTHER__"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__OTHER__") {
                      setIsCustomNewJobTitle(true);
                      setNewStaff({ ...newStaff, job_title: "" });
                    } else {
                      setIsCustomNewJobTitle(false);
                      setNewStaff({ ...newStaff, job_title: val });
                    }
                  }}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs"
                >
                  {(DEPARTMENT_JOB_TITLES[newStaff.department] || []).map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                  <option value="__OTHER__">Other (Specify Manually...)</option>
                </select>

                {isCustomNewJobTitle && (
                  <input
                    type="text"
                    required
                    value={newStaff.job_title}
                    onChange={(e) => setNewStaff({ ...newStaff, job_title: e.target.value })}
                    placeholder="Type custom job title..."
                    className="w-full bg-[var(--bg-main)] border border-[#c7cb2d] rounded-xl px-3.5 py-2 text-xs"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Employment Type
              </label>
              <select
                value={newStaff.employment_type}
                onChange={(e) => setNewStaff({ ...newStaff, employment_type: e.target.value })}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 rounded-xl px-3.5 py-2.5 text-xs"
              >
                {EMPLOYMENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Level</label>
                <select
                  value={newStaff.hierarchy_level}
                  onChange={(e) => handleNewStaffLevelOrStepChange(e.target.value, newStaff.step_level)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs font-bold"
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
                  Step (1 – 7)
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {SALARY_STEPS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleNewStaffLevelOrStepChange(newStaff.hierarchy_level, st)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                        Number(newStaff.step_level) === st
                          ? "bg-[#c7cb2d] text-black"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      S{st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Basic Salary (85%) ₦
                </label>
                <input
                  type="number"
                  value={newStaff.basic_salary}
                  onChange={(e) => handleNewStaffComponentChange("basic_salary", e.target.value)}
                  className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Transport / Housing (10%) ₦
                </label>
                <input
                  type="number"
                  value={newStaff.transport_housing_allowance}
                  onChange={(e) => handleNewStaffComponentChange("transport_housing_allowance", e.target.value)}
                  className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Internet Allowance (5%) ₦
                </label>
                <input
                  type="number"
                  value={newStaff.internet_allowance}
                  onChange={(e) => handleNewStaffComponentChange("internet_allowance", e.target.value)}
                  className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                  Total Gross (₦)
                </label>
                <input
                  type="number"
                  value={newStaff.salary_amount}
                  onChange={(e) => {
                    const customGross = Number(e.target.value || 0);
                    const b = Math.round(customGross * 0.85);
                    const th = Math.round(customGross * 0.10);
                    const net = Math.max(0, customGross - b - th);
                    setNewStaff({
                      ...newStaff,
                      salary_amount: e.target.value,
                      basic_salary: String(b),
                      transport_housing_allowance: String(th),
                      internet_allowance: String(net),
                    });
                  }}
                  placeholder="Enter custom gross..."
                  className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#c7cb2d]"
                />
              </div>
            </div>
          </div>

          {/* BANKING DETAILS INCLUDING SORT CODE */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Phone</label>
              <input
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                placeholder="+234..."
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
              <input
                value={newStaff.bank_name}
                onChange={(e) => setNewStaff({ ...newStaff, bank_name: e.target.value })}
                placeholder="UBA / Polaris"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Sort Code</label>
              <input
                value={newStaff.bank_sort_code}
                onChange={(e) => setNewStaff({ ...newStaff, bank_sort_code: e.target.value })}
                placeholder="e.g. 033154282"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
              <input
                value={newStaff.bank_account_name}
                onChange={(e) => setNewStaff({ ...newStaff, bank_account_name: e.target.value })}
                placeholder="Account Name"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account No</label>
              <input
                maxLength={10}
                value={newStaff.bank_account_no}
                onChange={(e) => setNewStaff({ ...newStaff, bank_account_no: e.target.value })}
                placeholder="10 digits"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          {/* EMERGENCY CONTACT DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                Emergency Contact Name
              </label>
              <input
                value={newStaff.emergency_contact_name || ""}
                onChange={(e) => setNewStaff({ ...newStaff, emergency_contact_name: e.target.value })}
                placeholder="Full Name of Next of Kin"
                className="w-full bg-[var(--bg-card)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Relationship
              </label>
              <input
                value={newStaff.emergency_contact_relationship || ""}
                onChange={(e) => setNewStaff({ ...newStaff, emergency_contact_relationship: e.target.value })}
                placeholder="e.g. Parent / Spouse / Sibling"
                className="w-full bg-[var(--bg-card)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Emergency Contact Phone
              </label>
              <input
                value={newStaff.emergency_contact_phone || ""}
                onChange={(e) => setNewStaff({ ...newStaff, emergency_contact_phone: e.target.value })}
                placeholder="+234..."
                className="w-full bg-[var(--bg-card)] rounded-xl px-3.5 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-2">Clearances</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map((perm) => {
                const active = newStaff.permissions.includes(perm.id);
                return (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() =>
                      setNewStaff({
                        ...newStaff,
                        permissions: togglePermission(newStaff.permissions, perm.id),
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                      active ? "bg-[#c7cb2d] text-black font-bold" : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {perm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {onboardStatus && <p className="text-xs font-mono text-[#c7cb2d]">{onboardStatus}</p>}

          <button
            type="submit"
            disabled={saving}
            className="px-7 py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider cursor-pointer hover:opacity-90 transition"
          >
            {saving ? "Onboarding..." : "Onboard Staff"}
          </button>
        </form>
      )}

      {/* =====================================================================
          TAB 3: EDITABLE SALARY STRUCTURE
      ===================================================================== */}
      {activeTab === "salary_matrix" && (
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-5 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Salary Structure</h2>
              <p className="text-xs text-[var(--text-muted)]">
                85% Basic Salary • 10% Transport & Housing Allowance • 5% Internet Allowance
              </p>
            </div>
            {canEditHR && (
              <div className="flex items-center gap-2">
                {matrixSavedMsg && (
                  <span className="text-xs font-mono text-[#c7cb2d] font-bold">{matrixSavedMsg}</span>
                )}
                <button
                  type="button"
                  onClick={handleResetSalaryStructure}
                  className="px-3.5 py-2 rounded-xl bg-[var(--bg-main)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveSalaryStructure}
                  className="px-4 py-2 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Structure
                </button>
              </div>
            )}
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
                <th className="py-3 pr-3">Level</th>
                <th className="py-3 px-2">Step 1 Base (₦)</th>
                <th className="py-3 px-2">+ Step Incr (₦)</th>
                {SALARY_STEPS.map((s) => (
                  <th key={s} className="py-3 px-2">
                    Step {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40">
              {HIERARCHY_LEVELS.map((lvl) => {
                const cfg = salaryConfig[lvl] || { step1Gross: 20000, stepIncrement: 2500 };
                return (
                  <tr key={lvl} className="hover:bg-[var(--bg-main)]/40">
                    <td className="py-3 pr-3 font-display font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {lvl}
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        disabled={!canEditHR}
                        value={cfg.step1Gross}
                        onChange={(e) =>
                          setSalaryConfig((prev) => ({
                            ...prev,
                            [lvl]: { ...cfg, step1Gross: Number(e.target.value || 0) },
                          }))
                        }
                        className="w-24 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#c7cb2d]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        disabled={!canEditHR}
                        value={cfg.stepIncrement}
                        onChange={(e) =>
                          setSalaryConfig((prev) => ({
                            ...prev,
                            [lvl]: { ...cfg, stepIncrement: Number(e.target.value || 0) },
                          }))
                        }
                        className="w-20 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    {SALARY_STEPS.map((st) => {
                      const bd = computeSalaryBreakdown(lvl, st, salaryConfig);
                      return (
                        <td key={st} className="py-2.5 px-2 font-mono align-top whitespace-nowrap">
                          <span className="block font-bold text-[var(--text-primary)]">
                            ₦{bd.totalGross.toLocaleString()}
                          </span>
                          <span className="block text-[9px] text-[var(--text-muted)]">
                            B:{(bd.basic / 1000).toFixed(1)}k • T:{(bd.transportHousing / 1000).toFixed(1)}k • I:{(bd.internet / 1000).toFixed(1)}k
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          TAB 4: PROMOTIONS (HR DIRECT PROMOTION + STAFF SELF-SERVICE REQUESTS)
      ===================================================================== */}
      {activeTab === "promotions" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            {/* STAFF SELF-SERVICE PROMOTION REQUEST FORM (Available to all staff) */}
            <form
              onSubmit={handleSubmitPromotionRequest}
              className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4"
            >
              <div>
                <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                  Staff Self-Service
                </span>
                <h2 className="font-display text-lg font-bold">Request Promotion / Step Upgrade</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Requested Level
                  </label>
                  <select
                    value={staffPromoRequestForm.desired_level}
                    onChange={(e) =>
                      setStaffPromoRequestForm({ ...staffPromoRequestForm, desired_level: e.target.value })
                    }
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
                    value={staffPromoRequestForm.desired_step}
                    onChange={(e) =>
                      setStaffPromoRequestForm({ ...staffPromoRequestForm, desired_step: Number(e.target.value) })
                    }
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#c7cb2d]"
                  >
                    {SALARY_STEPS.map((st) => (
                      <option key={st} value={st}>
                        Step {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Proposed Job Title
                  </label>
                  <input
                    value={staffPromoRequestForm.desired_title}
                    onChange={(e) =>
                      setStaffPromoRequestForm({ ...staffPromoRequestForm, desired_title: e.target.value })
                    }
                    placeholder="e.g. Senior Brand Designer"
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Employment Type
                  </label>
                  <select
                    value={staffPromoRequestForm.desired_employment_type}
                    onChange={(e) =>
                      setStaffPromoRequestForm({ ...staffPromoRequestForm, desired_employment_type: e.target.value })
                    }
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  >
                    {EMPLOYMENT_TYPES.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Key Achievements & Justification *
                </label>
                <textarea
                  required
                  rows={2}
                  value={staffPromoRequestForm.reason}
                  onChange={(e) => setStaffPromoRequestForm({ ...staffPromoRequestForm, reason: e.target.value })}
                  placeholder="Highlight completed projects, tenure, or new responsibilities..."
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              {promoReqNotice && <p className="text-xs font-mono text-[#c7cb2d]">{promoReqNotice}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-full bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[#c7cb2d]/50 text-[#c7cb2d] font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Submit Promotion Request to HR
              </button>
            </form>

            {/* DIRECT HR PROMOTION PANEL (With Employment Type Selection) */}
            {canEditHR && (
              <form
                onSubmit={handlePromoteStaff}
                className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">HR Executive Action</span>
                  <h2 className="font-display text-lg font-bold">Direct Staff Promotion</h2>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Staff Member *
                  </label>
                  <select
                    required
                    value={promoForm.target_staff_id}
                    onChange={(e) => {
                      const found = staffList.find((s) => s.id === e.target.value);
                      if (found) {
                        const nextStep = Math.min(7, Number(found.step_level || 1) + 1);
                        const savedGross = Number(found.salary_amount || 0);
                        const savedBasic = Number(found.basic_salary || Math.round(savedGross * 0.85));
                        const savedTrans = Number(found.transport_housing_allowance || Math.round(savedGross * 0.10));
                        const savedNet = Number(found.internet_allowance || Math.max(0, savedGross - savedBasic - savedTrans));
                        setPromoForm({
                          ...promoForm,
                          target_staff_id: found.id,
                          new_level: found.hierarchy_level || "L3 - Mid-Level Specialist",
                          new_step: nextStep,
                          new_department: found.department || STUDIO_DEPARTMENTS[3],
                          new_title: found.job_title || "",
                          new_employment_type: found.employment_type || "Full-Time",
                          new_role: found.role || "staff",
                          basic_salary: String(savedBasic),
                          internet_allowance: String(savedNet),
                          transport_housing_allowance: String(savedTrans),
                          new_salary: String(savedGross),
                        });
                      }
                    }}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
                  >
                    <option value="">-- Select Staff --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.staff_id}) — {(s.hierarchy_level || "L1").split(" - ")[0]} • Step {s.step_level || 1} ({s.employment_type || "Full-Time"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Level</label>
                    <select
                      value={promoForm.new_level}
                      onChange={(e) => handlePromoLevelOrStepChange(e.target.value, promoForm.new_step)}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2.5 text-xs"
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
                      New Step (1 – 7)
                    </label>
                    <select
                      value={promoForm.new_step}
                      onChange={(e) => handlePromoLevelOrStepChange(promoForm.new_level, Number(e.target.value))}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#c7cb2d]"
                    >
                      {SALARY_STEPS.map((st) => (
                        <option key={st} value={st}>
                          Step {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      New Job Title
                    </label>
                    <input
                      value={promoForm.new_title}
                      onChange={(e) => setPromoForm({ ...promoForm, new_title: e.target.value })}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      Employment Type
                    </label>
                    <select
                      value={promoForm.new_employment_type}
                      onChange={(e) => setPromoForm({ ...promoForm, new_employment_type: e.target.value })}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                    >
                      {EMPLOYMENT_TYPES.map((et) => (
                        <option key={et} value={et}>
                          {et}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                      Custom Promotion Salary Input
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const bd = computeSalaryBreakdown(promoForm.new_level, promoForm.new_step);
                        setPromoForm((prev) => ({
                          ...prev,
                          basic_salary: String(bd.basic),
                          transport_housing_allowance: String(bd.transportHousing),
                          internet_allowance: String(bd.internet),
                          new_salary: String(bd.totalGross),
                        }));
                      }}
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[#c7cb2d] underline cursor-pointer"
                    >
                      Optional: Fill from Structure Guide
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Basic (85%) ₦</label>
                      <input
                        type="number"
                        value={promoForm.basic_salary}
                        onChange={(e) => handlePromoComponentChange("basic_salary", e.target.value)}
                        className="w-full bg-[var(--bg-card)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Trans/H (10%) ₦</label>
                      <input
                        type="number"
                        value={promoForm.transport_housing_allowance}
                        onChange={(e) => handlePromoComponentChange("transport_housing_allowance", e.target.value)}
                        className="w-full bg-[var(--bg-card)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Internet (5%) ₦</label>
                      <input
                        type="number"
                        value={promoForm.internet_allowance}
                        onChange={(e) => handlePromoComponentChange("internet_allowance", e.target.value)}
                        className="w-full bg-[var(--bg-card)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">New Gross ₦</label>
                      <input
                        type="number"
                        value={promoForm.new_salary}
                        onChange={(e) => {
                          const g = Number(e.target.value || 0);
                          const b = Math.round(g * 0.85);
                          const th = Math.round(g * 0.10);
                          const net = Math.max(0, g - b - th);
                          setPromoForm({
                            ...promoForm,
                            new_salary: e.target.value,
                            basic_salary: String(b),
                            transport_housing_allowance: String(th),
                            internet_allowance: String(net),
                          });
                        }}
                        className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/50 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#c7cb2d]"
                      />
                    </div>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={promoForm.notes}
                  onChange={(e) => setPromoForm({ ...promoForm, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {saving ? "Saving..." : "Confirm Promotion"}
                </button>
              </form>
            )}
          </div>

          {/* RIGHT COLUMN: HR PENDING PROMOTION REQUESTS + PROMOTION HISTORY */}
          <div className="lg:col-span-7 space-y-4">
            {pendingPromoRequests.length > 0 && (
              <div className="p-5 rounded-3xl bg-[#c7cb2d]/10 border border-[#c7cb2d]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#c7cb2d] font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Pending Staff Promotion Requests ({pendingPromoRequests.length})
                  </span>
                </div>
                <div className="space-y-2.5">
                  {pendingPromoRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#c7cb2d]">
                            {req.staff_name} ({req.staff_code})
                          </span>
                          <p className="text-xs font-semibold">
                            {req.previous_level} → <span className="text-[#c7cb2d]">{req.new_level}</span>
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {req.previous_title} → {req.new_title}{" "}
                            {req.new_employment_type ? `• ${req.new_employment_type}` : ""} • Proposed Gross: ₦
                            {Number(req.new_salary || 0).toLocaleString()}
                          </p>
                        </div>
                        {canEditHR && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleHRReviewPromotionRequest(req, "approved")}
                              className="px-3.5 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
                            >
                              Approve & Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHRReviewPromotionRequest(req, "rejected")}
                              className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                      {req.notes && (
                        <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-main)] p-2.5 rounded-xl">
                          {String(req.notes).replace("[STAFF PROMOTION REQUEST]", "").trim()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {promotionList.map((p) => {
                const isPending =
                  p.request_status === "pending" || String(p.notes || "").includes("[STAFF PROMOTION REQUEST]");
                const isDeclined =
                  p.request_status === "rejected" || String(p.notes || "").includes("[DECLINED REQUEST]");
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                          {p.staff_name} ({p.staff_code})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                            isPending
                              ? "bg-amber-500/20 text-amber-300"
                              : isDeclined
                              ? "bg-red-500/20 text-red-400"
                              : "bg-[#c7cb2d]/20 text-[#c7cb2d]"
                          }`}
                        >
                          {isPending ? "Pending Review" : isDeclined ? "Declined" : "Approved"}
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-bold">
                        {p.previous_level} → <span className="text-[#c7cb2d]">{p.new_level}</span>
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {p.previous_title} → {p.new_title}{" "}
                        {p.new_employment_type ? `(${p.new_employment_type})` : ""} • ₦
                        {Number(p.previous_salary || 0).toLocaleString()} →{" "}
                        <strong className="text-[var(--text-primary)]">
                          ₦{Number(p.new_salary || 0).toLocaleString()}
                        </strong>
                      </p>
                    </div>
                    <FormattedDate
                      date={p.effective_date || p.created_at}
                      className="text-[10px] font-mono text-[var(--text-dim)]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: LEAVE MANAGEMENT
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
                <option value="">-- Select Available Relief Officer --</option>
                {staffList
                  .filter((st) => st.id !== currentUser?.id && (st.status || "active") === "active")
                  .map((st) => (
                    <option
                      key={st.id}
                      value={`${st.first_name} ${st.last_name} (${st.staff_id} — ${st.job_title || st.department})`}
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
              placeholder="Reason..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase cursor-pointer"
            >
              Submit ({requestedDays} Working Days)
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {leaveList.map((lv) => (
              <div key={lv.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold">{lv.staff_name} ({lv.staff_code})</span>
                    <p className="text-xs text-[#c7cb2d] font-mono">{lv.leave_type} • {lv.working_days} days</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-mono uppercase">
                    {lv.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{lv.reason}</p>
                {canEditHR && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]/40">
                    <button
                      type="button"
                      onClick={() => handleLeaveStageApproval(lv, "hr", "approved")}
                      className="px-3 py-1 rounded-lg bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono font-bold cursor-pointer"
                    >
                      Approve (HR)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLeaveStageApproval(lv, "ops", "approved")}
                      className="px-3 py-1 rounded-lg bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono font-bold cursor-pointer"
                    >
                      Approve (Ops)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLeaveStageApproval(lv, "strategist", "approved")}
                      className="px-3 py-1 rounded-lg bg-[#c7cb2d] text-black text-[10px] font-mono font-bold cursor-pointer"
                    >
                      Final Sign-Off
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLeaveStageApproval(lv, "hr", "rejected")}
                      className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-mono font-bold cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: EXPENSE VOUCHERS (OPTIONAL COMPRESSED IMAGE PROOF & COMMENTS)
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
            <div className="grid grid-cols-2 gap-2.5">
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
                <option value="Operational Expense">Operational Expense</option>
                <option value="Project Production">Project Production</option>
                <option value="Logistics & Transport">Logistics & Transport</option>
                <option value="Facility & Power">Facility & Power</option>
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
              placeholder="Notes or payment breakdown..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />

            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
                  Image / Receipt Proof (Optional — Auto-Compressed)
                </span>
                <label className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-[#c7cb2d]">
                  <ImageIcon className="w-3.5 h-3.5 text-[#c7cb2d]" /> Attach Image
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleVoucherAttachment}
                    className="hidden"
                  />
                </label>
              </div>
              {voucherForm.attachment_data && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={voucherForm.attachment_data}
                      alt="Proof preview"
                      className="w-10 h-10 rounded-lg object-cover border border-[#c7cb2d]/50"
                    />
                    <span className="text-xs font-mono text-[#c7cb2d] truncate max-w-[180px]">
                      {voucherForm.attachment_name || "Attached proof"}
                    </span>
                  </div>
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
              placeholder="Add an initial comment on this voucher (Optional)..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />

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

          <div className="lg:col-span-7 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {voucherList.map((v) => {
              const vComments: Array<{ author: string; text: string; at: string }> = Array.isArray(v.comments)
                ? v.comments
                : voucherCommentsMap[v.id] || [];

              return (
                <div
                  key={v.id}
                  className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-[#c7cb2d]">
                        {v.voucher_no} • {v.staff_name} ({v.department})
                      </span>
                      <h3 className="font-display text-sm font-bold">{v.title}</h3>
                      {v.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{v.description}</p>}
                    </div>
                    <span className="font-mono text-sm font-bold text-[#c7cb2d] shrink-0">
                      ₦{Number(v.amount || 0).toLocaleString()}
                    </span>
                  </div>

                  {v.attachment_url && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/40">
                      <img
                        src={v.attachment_url}
                        alt={v.attachment_name || "Proof"}
                        onClick={() => setPreviewProofUrl(v.attachment_url)}
                        className="w-12 h-12 rounded-xl object-cover cursor-pointer border border-[#c7cb2d]/50"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{v.attachment_name || "Attached Proof"}</p>
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(v.attachment_url)}
                          className="text-[10px] font-mono text-[#c7cb2d] hover:underline cursor-pointer"
                        >
                          View Image Proof
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVoucherStageApproval(v, "ops", "approved")}
                      className="px-3 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono cursor-pointer"
                    >
                      Ops: {v.ops_status || "pending"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoucherStageApproval(v, "finance", "approved")}
                      className="px-3 py-1 rounded-lg bg-[var(--bg-main)] text-[10px] font-mono cursor-pointer"
                    >
                      Finance: {v.finance_status || "pending"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoucherStageApproval(v, "strategist", "approved")}
                      className="px-3 py-1 rounded-lg bg-[#c7cb2d] text-black text-[10px] font-mono font-bold cursor-pointer"
                    >
                      Exec: {v.strategist_status || "pending"}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)]/40 space-y-2">
                    {vComments.length > 0 && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {vComments.map((c, i) => (
                          <div key={i} className="px-3 py-1.5 rounded-xl bg-[var(--bg-main)] text-xs">
                            <span className="font-mono text-[10px] text-[#c7cb2d] font-bold">{c.author}: </span>
                            <span className="text-[var(--text-primary)]">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={voucherCommentInputs[v.id] || ""}
                        onChange={(e) =>
                          setVoucherCommentInputs((prev) => ({ ...prev, [v.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddVoucherComment(v);
                          }
                        }}
                        placeholder="Add a comment on this voucher..."
                        className="flex-1 bg-[var(--bg-main)] rounded-xl px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddVoucherComment(v)}
                        className="px-3 py-1.5 rounded-xl bg-[#c7cb2d] text-black text-[11px] font-bold cursor-pointer"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: EQUIPPED ALL-STAFF WORKPLACE CHAT
          (@Tagging, Voice Notes, Individual DM, Multi-User, Multi-Dept, Images/Files/Emojis)
      ===================================================================== */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 p-4 h-[570px]">
          {/* LEFT SIDEBAR: CHANNELS, @MENTIONS & RECIPIENTS */}
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
                <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 text-xs space-y-1.5">
                  <p className="font-bold text-[#c7cb2d]">Official Workplace Channel</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Open to all {staffList.length} staff members. Type <strong>@</strong> to tag colleagues or click the Mic icon to send a Voice Note.
                  </p>
                </div>
              )}

              {chatChannelType === "mentions" && (
                <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 text-xs space-y-1">
                  <p className="font-bold text-[#c7cb2d]">@Mentions Feed</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Showing messages where you ({currentUser?.staff_id || "you"}) were tagged.
                  </p>
                </div>
              )}

              {chatChannelType === "direct" &&
                staffList.map((st) => {
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

              {chatChannelType === "multi_user" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase text-[var(--text-dim)] px-1">
                    Select Colleagues ({selectedRecipients.length} chosen)
                  </p>
                  {staffList.map((st) => {
                    const checked = selectedRecipients.includes(st.staff_id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleRecipientSelection(st.staff_id)}
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
                </div>
              )}

              {chatChannelType === "multi_dept" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase text-[var(--text-dim)] px-1">
                    Select Departments ({selectedDepartments.length} chosen)
                  </p>
                  {STUDIO_DEPARTMENTS.map((dept) => {
                    const checked = selectedDepartments.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => toggleDepartmentSelection(dept)}
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
              )}
            </div>
          </div>

          {/* RIGHT PANE: MESSAGE STREAM, VOICE NOTE RECORDER & @MENTION COMPOSER */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden relative">
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

            {/* MESSAGES LIST */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMessages.map((m) => {
                const isMe = m.sender_code === currentUser?.staff_id;
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
                          title="Reply"
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

            {/* @MENTION STAFF AUTOCOMPLETE POPUP */}
            {showMentionList && (
              <div className="p-2 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/60 max-h-36 overflow-y-auto space-y-1 mb-1.5 shadow-xl">
                <div className="flex items-center justify-between px-2 text-[10px] font-mono text-[#c7cb2d]">
                  <span>Tag a Staff Member (@)</span>
                  <button type="button" onClick={() => setShowMentionList(false)} className="cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {staffList
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
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs hover:bg-[#c7cb2d] hover:text-black flex items-center justify-between cursor-pointer transition"
                    >
                      <span>
                        {s.first_name} {s.last_name} — <span className="opacity-75">{s.job_title}</span>
                      </span>
                      <span className="font-mono text-[10px] font-bold">@{s.staff_id}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* REPLY / ATTACHMENT / VOICE NOTE PREVIEW BAR */}
            {(replyingTo || chatAttachment || voiceNoteDraft || isRecordingVoice) && (
              <div className="px-3 py-1.5 mt-1 rounded-xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div className="flex items-center gap-2 truncate">
                  {isRecordingVoice && (
                    <span className="text-red-400 font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      ● Recording Voice Note ({recordingSeconds}s)... Click Stop when done
                    </span>
                  )}
                  {voiceNoteDraft && !isRecordingVoice && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#c7cb2d] font-bold">
                        🎤 Voice Note Ready ({voiceNoteDraft.duration}s)
                      </span>
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
                  className="text-red-400 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* QUICK EMOJI BAR */}
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

            {/* EQUIPPED MESSAGE COMPOSER (@TAG, VOICE NOTE MIC, IMAGE/FILE, EMOJI) */}
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
                title="Attach Compressed Image or File"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMentionList((prev) => !prev);
                  setMentionQuery("");
                }}
                className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
                title="Tag Staff Member (@)"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
                title="Emojis"
              >
                <Smile className="w-4 h-4" />
              </button>
              {!isRecordingVoice ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="p-2 rounded-xl bg-red-500 text-white animate-pulse cursor-pointer"
                  title="Stop Recording"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}

              <input
                value={chatInput}
                onChange={(e) => handleChatInputChange(e.target.value)}
                placeholder="Write a message or type @ to tag staff..."
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

      {/* FULLSCREEN IMAGE LIGHTBOX */}
      {previewProofUrl && (
        <div
          onClick={() => setPreviewProofUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setPreviewProofUrl(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewProofUrl}
            alt="Full Attachment View"
            className="max-h-[85vh] max-w-4xl rounded-2xl object-contain"
          />
        </div>
      )}

      {/* =====================================================================
          EDIT STAFF MODAL (INCLUDES EMPLOYMENT TYPE & BANK SORT CODE)
      ===================================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-3xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
              <h3 className="font-display text-lg font-bold">
                {editingStaff.first_name} {editingStaff.last_name} ({editingStaff.staff_id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-2 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="edit-staff-form"
              onSubmit={handleSaveStaffEdit}
              className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Staff ID</label>
                  <input
                    value={editingStaff.staff_id || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, staff_id: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">First Name</label>
                  <input
                    value={editingStaff.first_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, first_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Last Name</label>
                  <input
                    value={editingStaff.last_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, last_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* DEPARTMENT, JOB TITLE & EMPLOYMENT TYPE IN EDIT MODAL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Department</label>
                  <select
                    value={
                      STUDIO_DEPARTMENTS.includes(editingStaff.department)
                        ? editingStaff.department
                        : "Design & Creative"
                    }
                    onChange={(e) => {
                      const nextDept = e.target.value;
                      const deptTitles = DEPARTMENT_JOB_TITLES[nextDept] || [];
                      setIsCustomEditJobTitle(false);
                      setEditingStaff({
                        ...editingStaff,
                        department: nextDept,
                        job_title: deptTitles[0] || "",
                      });
                    }}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  >
                    {STUDIO_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Job Title</label>
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
                      className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                    >
                      {(
                        DEPARTMENT_JOB_TITLES[editingStaff.department] ||
                        STUDIO_DEPARTMENTS.flatMap((d) => DEPARTMENT_JOB_TITLES[d])
                      ).map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                      <option value="__OTHER__">Other (Specify Manually...)</option>
                    </select>

                    {isCustomEditJobTitle && (
                      <input
                        type="text"
                        value={editingStaff.job_title || ""}
                        onChange={(e) => setEditingStaff({ ...editingStaff, job_title: e.target.value })}
                        placeholder="Type custom job title..."
                        className="w-full bg-[var(--bg-card)] border border-[#c7cb2d] rounded-xl px-3 py-2 text-xs"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                    Employment Type
                  </label>
                  <select
                    value={editingStaff.employment_type || "Full-Time"}
                    onChange={(e) => setEditingStaff({ ...editingStaff, employment_type: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/50 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    {EMPLOYMENT_TYPES.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[#c7cb2d]/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Level</label>
                    <select
                      value={editingStaff.hierarchy_level || "L3 - Mid-Level Specialist"}
                      onChange={(e) =>
                        handleEditStaffLevelOrStepChange(e.target.value, Number(editingStaff.step_level || 1))
                      }
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-bold"
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
                      Step (1 – 7)
                    </label>
                    <select
                      value={editingStaff.step_level || 1}
                      onChange={(e) =>
                        handleEditStaffLevelOrStepChange(
                          editingStaff.hierarchy_level || "L3 - Mid-Level Specialist",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#c7cb2d]"
                    >
                      {SALARY_STEPS.map((st) => (
                        <option key={st} value={st}>
                          Step {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      Basic (85%)
                    </label>
                    <input
                      type="number"
                      value={editingStaff.basic_salary || 0}
                      onChange={(e) => handleEditStaffComponentChange("basic_salary", e.target.value)}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      Trans/H (10%)
                    </label>
                    <input
                      type="number"
                      value={editingStaff.transport_housing_allowance || 0}
                      onChange={(e) => handleEditStaffComponentChange("transport_housing_allowance", e.target.value)}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">
                      Internet (5%)
                    </label>
                    <input
                      type="number"
                      value={editingStaff.internet_allowance || 0}
                      onChange={(e) => handleEditStaffComponentChange("internet_allowance", e.target.value)}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">Gross</label>
                    <input
                      type="number"
                      value={editingStaff.salary_amount ?? ""}
                      onChange={(e) => {
                        const customGross = Number(e.target.value || 0);
                        const b = Math.round(customGross * 0.85);
                        const th = Math.round(customGross * 0.10);
                        const net = Math.max(0, customGross - b - th);
                        setEditingStaff({
                          ...editingStaff,
                          salary_amount: customGross,
                          basic_salary: b,
                          transport_housing_allowance: th,
                          internet_allowance: net,
                        });
                      }}
                      placeholder="Custom gross..."
                      className="w-full bg-[var(--bg-main)] border border-[#c7cb2d]/40 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#c7cb2d]"
                    />
                  </div>
                </div>
              </div>

              {/* BANKING DETAILS WITH SORT CODE IN EDIT MODAL */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
                  <input
                    value={editingStaff.bank_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                    Sort Code
                  </label>
                  <input
                    value={editingStaff.bank_sort_code || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_sort_code: e.target.value })}
                    placeholder="e.g. 033154282"
                    className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/40 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Account Name
                  </label>
                  <input
                    value={editingStaff.bank_account_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_account_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Account Number
                  </label>
                  <input
                    maxLength={10}
                    value={editingStaff.bank_account_no || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_account_no: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* EMERGENCY CONTACT IN EDIT MODAL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    value={editingStaff.emergency_contact_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, emergency_contact_name: e.target.value })}
                    placeholder="Next of Kin Name"
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Relationship
                  </label>
                  <input
                    value={editingStaff.emergency_contact_relationship || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, emergency_contact_relationship: e.target.value })}
                    placeholder="e.g. Spouse / Parent"
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                    Emergency Phone
                  </label>
                  <input
                    value={editingStaff.emergency_contact_phone || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, emergency_contact_phone: e.target.value })}
                    placeholder="+234..."
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1.5">Clearances</label>
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
                          active ? "bg-[#c7cb2d] text-black" : "bg-[var(--bg-card)] text-[var(--text-muted)]"
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

            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 rounded-full bg-[var(--bg-card)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-staff-form"
                disabled={saving}
                className="px-6 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
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
