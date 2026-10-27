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
  Building2,
  Save,
  RotateCcw,
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

// Base set to ₦20,000 on L0 Step 1 with realistic progressive increments
const DEFAULT_LEVEL_STEP_CONFIG: Record<string, { step1Gross: number; stepIncrement: number }> = {
  "L0 - Auxiliary & Facility Support": { step1Gross: 20000, stepIncrement: 2500 },
  "L1 - Intern / Graduate Trainee": { step1Gross: 30000, stepIncrement: 3500 },
  "L2 - Junior Associate": { step1Gross: 45000, stepIncrement: 5000 },
  "L3 - Mid-Level Specialist": { step1Gross: 65000, stepIncrement: 7500 },
  "L4 - Senior Specialist": { step1Gross: 95000, stepIncrement: 10000 },
  "L5 - Lead / Principal": { step1Gross: 135000, stepIncrement: 15000 },
  "L6 - Department Head": { step1Gross: 185000, stepIncrement: 20000 },
  "L7 - Executive / Director": { step1Gross: 250000, stepIncrement: 30000 },
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

const QUICK_EMOJIS = ["👍", "✅", "🔥", "👏", "🎯", "🚀", "🙌", "📌", "⚡", "💡", "🤝", "🎉"];

export default function HRAndWorkspaceSuite() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = React.useState<
    "directory" | "onboard" | "leave" | "vouchers" | "promotions" | "salary_matrix" | "chat"
  >("directory");
  const [loading, setLoading] = React.useState(true);

  // Dynamic, editable salary structure state (persisted in localStorage + site_settings if available)
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

  const computeSalaryBreakdown = React.useCallback(
    (levelLabel: string, stepNum: number, customCfg = salaryConfig) => {
      const matchedKey =
        Object.keys(customCfg).find((k) => k.startsWith((levelLabel || "L3").slice(0, 2))) ||
        "L3 - Mid-Level Specialist";
      const cfg = customCfg[matchedKey] || DEFAULT_LEVEL_STEP_CONFIG["L3 - Mid-Level Specialist"];
      const validStep = Math.min(7, Math.max(1, Number(stepNum) || 1));
      const totalGross = Number(cfg.step1Gross || 20000) + (validStep - 1) * Number(cfg.stepIncrement || 2500);

      const basic = Math.round(totalGross * 0.6);
      const transportHousing = Math.round(totalGross * 0.25);
      const internet = totalGross - basic - transportHousing;

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
    setMatrixSavedMsg("Salary structure updated!");
    setTimeout(() => setMatrixSavedMsg(""), 3000);
  };

  const handleResetSalaryStructure = () => {
    setSalaryConfig(DEFAULT_LEVEL_STEP_CONFIG);
    try {
      localStorage.removeItem("lavie_salary_structure_v1");
    } catch (_) {}
    setMatrixSavedMsg("Reset to ₦20,000 base structure.");
    setTimeout(() => setMatrixSavedMsg(""), 3000);
  };

  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [leaveList, setLeaveList] = React.useState<any[]>([]);
  const [voucherList, setVoucherList] = React.useState<any[]>([]);
  const [promotionList, setPromotionList] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);

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
    permissions: ["staff", "portfolio"],
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
    bank_account_name: "",
    bank_account_no: "",
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

  // Voucher state with optional image/proof attachment & comments
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

  // Promotion state
  const initialPromoBreakdown = computeSalaryBreakdown("L4 - Senior Specialist", 1);
  const [promoForm, setPromoForm] = React.useState({
    target_staff_id: "",
    new_level: "L4 - Senior Specialist",
    new_step: 1,
    new_department: "",
    new_title: "",
    new_role: "staff",
    basic_salary: String(initialPromoBreakdown.basic),
    internet_allowance: String(initialPromoBreakdown.internet),
    transport_housing_allowance: String(initialPromoBreakdown.transportHousing),
    new_salary: String(initialPromoBreakdown.totalGross),
    effective_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  // Compact Multi-Channel Studio Chat state (All Staff, Individual DM, Multi-User Group, Multi-Departmental Group)
  const [chatChannelType, setChatChannelType] = React.useState<
    "group" | "direct" | "multi_user" | "multi_dept"
  >("group");
  const [chatTarget, setChatTarget] = React.useState("All Staff");
  const [selectedRecipients, setSelectedRecipients] = React.useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = React.useState<string[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatSearch, setChatSearch] = React.useState("");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<any | null>(null);
  const [chatAttachment, setChatAttachment] = React.useState<{ url: string; name: string; type: string } | null>(null);
  const [dispatchNotice, setDispatchNotice] = React.useState("");
  const chatFileRef = React.useRef<HTMLInputElement>(null);

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
      supabase.from("studio_messages").select("*").order("created_at", { ascending: true }),
    ]);

    if (staffData) {
      setStaffList(staffData);
      const me =
        staffData.find((s) => s.email?.toLowerCase() === userEmail) ||
        staffData.find((s) => s.staff_id === "LS-01") ||
        staffData[0];
      setCurrentUser(
        me || {
          email: userEmail,
          role: "super_admin",
          staff_id: "LS-01",
          permissions: ["super_admin", "chief_strategist", "hr"],
        }
      );

      const nextNum = staffData.length + 1;
      setNewStaff((prev) => ({
        ...prev,
        staff_id: prev.staff_id || `LS-${String(nextNum).padStart(2, "0")}`,
      }));

      if (me) {
        setVoucherForm((prev) => ({
          ...prev,
          bank_name: prev.bank_name || me.bank_name || "",
          bank_account_name:
            prev.bank_account_name || me.bank_account_name || `${me.first_name || ""} ${me.last_name || ""}`.trim(),
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

  // Permissions & Executive Read-Only Oversight
  const myPerms: string[] = currentUser?.permissions || (currentUser?.role ? [currentUser.role] : []);
  const isPrimaryFounder =
    !currentUser ||
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

  // 1. Save Staff Edits
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
      employment_type: editingStaff.employment_type,
      phone: editingStaff.phone,
      location: editingStaff.location,
      passport_url: editingStaff.passport_url,
      basic_salary: Number(editingStaff.basic_salary || Math.round(totalGross * 0.6)),
      internet_allowance: Number(editingStaff.internet_allowance || Math.round(totalGross * 0.15)),
      transport_housing_allowance: Number(editingStaff.transport_housing_allowance || Math.round(totalGross * 0.25)),
      salary_amount: totalGross,
      bank_name: editingStaff.bank_name,
      bank_account_name: editingStaff.bank_account_name,
      bank_account_no: editingStaff.bank_account_no,
      status: editingStaff.status || "active",
    };

    let { error } = await supabase.from("staff_profiles").update(payload).eq("id", editingStaff.id);
    if (error && error.message?.includes("column")) {
      const { step_level, basic_salary, internet_allowance, transport_housing_allowance, ...fallbackPayload } = payload;
      await supabase.from("staff_profiles").update(fallbackPayload).eq("id", editingStaff.id);
    }

    setSaving(false);
    setEditingStaff(null);
    loadWorkspaceData();
  };

  // 2. Onboard Staff
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
      bank_account_name: newStaff.bank_account_name || `${newStaff.first_name} ${newStaff.last_name}`.trim(),
      bank_account_no: newStaff.bank_account_no,
      access_mode: newStaff.access_mode,
      status: "active",
    };

    let { error } = await supabase.from("staff_profiles").upsert(fullRecord, { onConflict: "id" });

    if (error && error.message?.includes("column")) {
      const { step_level, basic_salary, internet_allowance, transport_housing_allowance, access_mode, ...safeRecord } = fullRecord;
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
          `• Title: ${newStaff.job_title}\n` +
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

  // 4. Vouchers with Optional Image Proof & Comments
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
    const existing = Array.isArray(v.comments)
      ? v.comments
      : voucherCommentsMap[v.id] || [];
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

  // 5. Promotions
  const handlePromoLevelOrStepChange = (nextLevel: string, nextStep: number) => {
    const bd = computeSalaryBreakdown(nextLevel, nextStep);
    setPromoForm((prev) => ({
      ...prev,
      new_level: nextLevel,
      new_step: nextStep,
      basic_salary: String(bd.basic),
      internet_allowance: String(bd.internet),
      transport_housing_allowance: String(bd.transportHousing),
      new_salary: String(bd.totalGross),
    }));
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

    await supabase.from("staff_promotions").insert({
      staff_id: target.id,
      staff_name: `${target.first_name} ${target.last_name}`,
      staff_code: target.staff_id,
      previous_level: `${target.hierarchy_level || "L1"} (Step ${target.step_level || 1})`,
      new_level: `${promoForm.new_level} (Step ${promoForm.new_step})`,
      previous_title: target.job_title,
      new_title: promoForm.new_title || target.job_title,
      previous_salary: Number(target.salary_amount || 0),
      new_salary: newTotalGross,
      effective_date: promoForm.effective_date,
      notes: promoForm.notes,
      promoted_by: `${currentUser?.first_name || "Admin"} (${currentUser?.staff_id || "EXEC"})`,
    });

    const updatePatch: Record<string, any> = {
      hierarchy_level: promoForm.new_level,
      step_level: Number(promoForm.new_step || 1),
      department: promoForm.new_department || target.department,
      job_title: promoForm.new_title || target.job_title,
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
    alert(`Promoted ${target.first_name} ${target.last_name} to ${promoForm.new_level} • Step ${promoForm.new_step}`);
    loadWorkspaceData();
  };

  // 6. Full Compact Studio Chat (Individual DM, Multi-User Group, Multi-Departmental Group, All Staff + Image/File/Emoji)
  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setChatAttachment({
        url: (ev.target?.result as string) || "",
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "file",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatAttachment) return;
    const senderName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Executive";
    const senderCode = currentUser?.staff_id || "LS-01";
    const baseMsg = {
      sender_id: currentUser?.id || null,
      sender_name: senderName,
      sender_code: senderCode,
      sender_role: currentUser?.job_title || "Staff",
      content: chatInput.trim(),
      reply_to_id: replyingTo?.id || null,
      reply_preview: replyingTo ? `${replyingTo.sender_name}: ${replyingTo.content?.slice(0, 50)}` : null,
      attachment_url: chatAttachment?.url || null,
      attachment_name: chatAttachment?.name || null,
    };

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
      setDispatchNotice(`Broadcasted to ${selectedDepartments.length} department(s)`);
      setTimeout(() => setDispatchNotice(""), 2500);
    } else {
      await supabase.from("studio_messages").insert({
        ...baseMsg,
        channel_type: chatChannelType === "group" ? "group" : "direct",
        recipient_code: chatChannelType === "group" ? "All Staff" : chatTarget,
      });
    }

    setChatInput("");
    setReplyingTo(null);
    setChatAttachment(null);
    setShowEmojiPicker(false);
    loadWorkspaceData();
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
      {/* COMPACT, CLEAN TOP NAVIGATION BAR (NO UNNECESSARY HEADINGS) */}
      <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-lg font-bold">HR & Workspace</h1>
          {!canEditHR && isExecutive && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 text-[#c7cb2d] text-[10px] font-mono font-bold">
              View-Only
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "directory", label: `Directory (${staffList.length})`, icon: Users },
            { id: "onboard", label: "Onboard", icon: UserPlus },
            { id: "salary_matrix", label: "Salary Structure", icon: Calculator },
            { id: "promotions", label: "Promotions", icon: Award },
            { id: "leave", label: `Leave (${leaveList.length})`, icon: Calendar },
            { id: "vouchers", label: `Vouchers (${voucherList.length})`, icon: Receipt },
            { id: "chat", label: "Chat", icon: MessageSquare },
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
              const basicSal = Number(person.basic_salary || Math.round(totalSal * 0.6));
              const transSal = Number(person.transport_housing_allowance || Math.round(totalSal * 0.25));
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
                          <span className="block text-[8px] uppercase text-[var(--text-dim)]">Basic</span>
                          ₦{basicSal.toLocaleString()}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-[var(--text-dim)]">Trans/Hous</span>
                          ₦{transSal.toLocaleString()}
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-[var(--text-dim)]">Internet</span>
                          ₦{netAllow.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)]/40 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate max-w-[180px] font-mono">{person.email}</span>
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
          TAB 2: ONBOARD STAFF
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
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract / Retainer">Contract / Retainer</option>
                <option value="Auxiliary / Support">Auxiliary / Support</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                  Level
                </label>
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
                  Basic Salary (₦)
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
                  Transport / Housing (₦)
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
                  Internet Allowance (₦)
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
                  readOnly
                  value={newStaff.salary_amount}
                  className="w-full bg-[var(--bg-card)] border border-[#c7cb2d]/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#c7cb2d]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
          TAB 3: EDITABLE SALARY STRUCTURE (₦20,000 BASE + LIVE CUSTOMIZATION)
      ===================================================================== */}
      {activeTab === "salary_matrix" && (
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-5 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Salary Structure (Base: ₦20,000)</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Adjust Step 1 Base or Step Increment below to update the 7-step scale across all levels.
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
          TAB 4: PROMOTIONS & STEP ADVANCEMENT
      ===================================================================== */}
      {activeTab === "promotions" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handlePromoteStaff}
            className="lg:col-span-5 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">Promote Staff</h2>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Staff Member *</label>
              <select
                required
                value={promoForm.target_staff_id}
                onChange={(e) => {
                  const found = staffList.find((s) => s.id === e.target.value);
                  if (found) {
                    const nextStep = Math.min(7, Number(found.step_level || 1) + 1);
                    const bd = computeSalaryBreakdown(found.hierarchy_level || "L3 - Mid-Level Specialist", nextStep);
                    setPromoForm({
                      ...promoForm,
                      target_staff_id: found.id,
                      new_level: found.hierarchy_level || "L3 - Mid-Level Specialist",
                      new_step: nextStep,
                      new_department: found.department || STUDIO_DEPARTMENTS[3],
                      new_title: found.job_title || "",
                      new_role: found.role || "staff",
                      basic_salary: String(bd.basic),
                      internet_allowance: String(bd.internet),
                      transport_housing_allowance: String(bd.transportHousing),
                      new_salary: String(bd.totalGross),
                    });
                  }
                }}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              >
                <option value="">-- Select Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.staff_id}) — {(s.hierarchy_level || "L1").split(" - ")[0]} • Step {s.step_level || 1}
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
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Step (1 – 7)</label>
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

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[var(--bg-main)] text-[11px] font-mono">
              <div>
                <span className="block text-[9px] text-[var(--text-dim)] uppercase">Basic</span>
                ₦{Number(promoForm.basic_salary).toLocaleString()}
              </div>
              <div>
                <span className="block text-[9px] text-[var(--text-dim)] uppercase">Trans/Hous</span>
                ₦{Number(promoForm.transport_housing_allowance).toLocaleString()}
              </div>
              <div>
                <span className="block text-[9px] text-[var(--text-dim)] uppercase">Internet</span>
                ₦{Number(promoForm.internet_allowance).toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">New Job Title</label>
                <input
                  value={promoForm.new_title}
                  onChange={(e) => setPromoForm({ ...promoForm, new_title: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#c7cb2d] font-bold mb-1">
                  New Gross (₦)
                </label>
                <input
                  type="number"
                  value={promoForm.new_salary}
                  onChange={(e) => setPromoForm({ ...promoForm, new_salary: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[#c7cb2d]/50 rounded-xl px-3.5 py-2 text-xs font-mono font-bold"
                />
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

          <div className="lg:col-span-7 space-y-3">
            {promotionList.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                    {p.staff_name} ({p.staff_code})
                  </span>
                  <h3 className="font-display text-sm font-bold">
                    {p.previous_level} → <span className="text-[#c7cb2d]">{p.new_level}</span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {p.previous_title} → {p.new_title} • ₦{Number(p.previous_salary || 0).toLocaleString()} →{" "}
                    <strong className="text-[var(--text-primary)]">₦{Number(p.new_salary || 0).toLocaleString()}</strong>
                  </p>
                </div>
                <FormattedDate date={p.effective_date || p.created_at} className="text-[10px] font-mono text-[var(--text-dim)]" />
              </div>
            ))}
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
            <input
              value={leaveForm.handover_staff}
              onChange={(e) => setLeaveForm({ ...leaveForm, handover_staff: e.target.value })}
              placeholder="Handover Staff"
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />
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

          <div className="lg:col-span-7 space-y-3">
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
          TAB 6: EXPENSE VOUCHERS (WITH OPTIONAL IMAGE ATTACHMENT & COMMENTS)
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

            {/* OPTIONAL IMAGE / RECEIPT PROOF ATTACHMENT */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
                  Supporting Image / Receipt Proof (Optional)
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
                    {voucherForm.attachment_data.startsWith("data:image") && (
                      <img
                        src={voucherForm.attachment_data}
                        alt="Proof preview"
                        className="w-10 h-10 rounded-lg object-cover border border-[#c7cb2d]/50"
                      />
                    )}
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

            {/* OPTIONAL INITIAL COMMENT */}
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

          <div className="lg:col-span-7 space-y-3">
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

                  {/* IMAGE PROOF VIEWER */}
                  {v.attachment_url && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/40">
                      {String(v.attachment_url).startsWith("data:image") ||
                      /.(png|jpe?g|webp|gif)$/i.test(String(v.attachment_url)) ? (
                        <img
                          src={v.attachment_url}
                          alt={v.attachment_name || "Proof"}
                          onClick={() => setPreviewProofUrl(v.attachment_url)}
                          className="w-12 h-12 rounded-xl object-cover cursor-pointer border border-[#c7cb2d]/50"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-[#c7cb2d]" />
                      )}
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

                  {/* APPROVAL STAGES */}
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

                  {/* VOUCHER COMMENTS SECTION */}
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
          TAB 7: COMPACT MULTI-CHANNEL STUDIO CHAT
          (All Staff, Individual DM, Multi-User Group, Multi-Departmental Group + Image/Attachments/Emojis)
      ===================================================================== */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 p-4 h-[540px]">
          {/* LEFT SIDEBAR: COMPACT CHANNEL & RECIPIENT SELECTOR */}
          <div className="lg:col-span-4 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)]/50 pr-0 lg:pr-3 pb-3 lg:pb-0 overflow-hidden">
            {/* 4 CHANNEL MODE PILLS */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5 shrink-0">
              {[
                { id: "group", label: "All Staff" },
                { id: "direct", label: "Individual DM" },
                { id: "multi_user", label: "Multi-User Group" },
                { id: "multi_dept", label: "Multi-Dept Group" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setChatChannelType(mode.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition ${
                    chatChannelType === mode.id
                      ? "bg-[#c7cb2d] text-black"
                      : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* SEARCH MESSAGES */}
            <div className="relative mb-2.5 shrink-0">
              <Search className="w-3 h-3 text-[var(--text-dim)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Filter messages..."
                className="w-full bg-[var(--bg-main)] rounded-xl pl-8 pr-3 py-1.5 text-[11px]"
              />
            </div>

            {/* DYNAMIC TARGET SELECTOR LIST */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {chatChannelType === "group" && (
                <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 text-xs space-y-1">
                  <p className="font-bold text-[#c7cb2d]">General Studio Channel</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Messages here are visible to all {staffList.length} team members.
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
                        {st.first_name} {st.last_name}
                      </span>
                      <span className="text-[10px] font-mono opacity-75">{st.staff_id}</span>
                    </button>
                  );
                })}

              {chatChannelType === "multi_user" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase text-[var(--text-dim)] px-1">
                    Select Staff ({selectedRecipients.length} chosen)
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

          {/* RIGHT PANE: COMPACT MESSAGE FEED & COMPOSER */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
            <div className="pb-2 mb-2 border-b border-[var(--border-subtle)]/50 flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-[#c7cb2d] truncate">
                {chatChannelType === "group"
                  ? "All Staff Channel"
                  : chatChannelType === "direct"
                  ? `Direct Message → ${chatTarget}`
                  : chatChannelType === "multi_user"
                  ? `Multi-User Group (${selectedRecipients.length} selected)`
                  : `Multi-Departmental Group (${selectedDepartments.join(", ") || "Select departments"})`}
              </span>
              {dispatchNotice && <span className="text-[10px] font-mono text-[#c7cb2d]">{dispatchNotice}</span>}
            </div>

            {/* MESSAGES LIST */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMessages.map((m) => {
                const isMe = m.sender_code === currentUser?.staff_id;
                const isImg =
                  m.attachment_url &&
                  (String(m.attachment_url).startsWith("data:image") ||
                    /.(png|jpe?g|webp|gif)$/i.test(String(m.attachment_url)));

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

                    {m.content && <p className="text-xs text-[var(--text-primary)] leading-snug">{m.content}</p>}

                    {m.attachment_url && (
                      <div className="pt-1">
                        {isImg ? (
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

            {/* REPLY / ATTACHMENT PREVIEW BAR */}
            {(replyingTo || chatAttachment) && (
              <div className="px-3 py-1.5 mt-1.5 rounded-xl bg-[var(--bg-main)] flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div className="truncate">
                  {replyingTo && (
                    <span className="text-[var(--text-muted)]">
                      Replying to <strong className="text-[#c7cb2d]">{replyingTo.sender_name}</strong>{" "}
                    </span>
                  )}
                  {chatAttachment && (
                    <span className="font-mono text-[#c7cb2d]">📎 {chatAttachment.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null);
                    setChatAttachment(null);
                  }}
                  className="text-red-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* QUICK EMOJI BAR */}
            {showEmojiPicker && (
              <div className="flex flex-wrap gap-1.5 p-2 mt-1.5 rounded-xl bg-[var(--bg-main)] shrink-0">
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

            {/* COMPACT MESSAGE COMPOSER */}
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
                title="Attach Image or File"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
                title="Emojis"
              >
                <Smile className="w-4 h-4" />
              </button>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message..."
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

      {/* FULLSCREEN IMAGE PROOF / CHAT IMAGE LIGHTBOX */}
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
          EDIT STAFF MODAL
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Basic</label>
                    <input
                      type="number"
                      value={editingStaff.basic_salary || 0}
                      onChange={(e) => handleEditStaffComponentChange("basic_salary", e.target.value)}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Trans/Housing</label>
                    <input
                      type="number"
                      value={editingStaff.transport_housing_allowance || 0}
                      onChange={(e) => handleEditStaffComponentChange("transport_housing_allowance", e.target.value)}
                      className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Internet</label>
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
                      readOnly
                      value={editingStaff.salary_amount || 0}
                      className="w-full bg-[var(--bg-main)] border border-[#c7cb2d]/40 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#c7cb2d]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
                  <input
                    value={editingStaff.bank_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
                  <input
                    value={editingStaff.bank_account_name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_account_name: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number</label>
                  <input
                    maxLength={10}
                    value={editingStaff.bank_account_no || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bank_account_no: e.target.value })}
                    className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono"
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

            {/* Modal Footer */}
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
