export const FOUNDER_EMAIL = "ayegboyin@studioslavie.com";
export const FOUNDER_EMAILS = [
  "ayegboyin@studioslavie.com",
  "hipheholluhayegboyin@gmail.com",
];

export const VOUCHER_CATEGORIES = [
  "Marketing & Advertising",
  "Operational & Studio Upkeep",
  "Project & Event Production",
  "Print, Signage & Large-Format Media",
  "Fabrication, Carpentry & Spatial Set Build",
  "Out-of-Home (OOH) & Billboard Operations",
  "Facility, Diesel, Inverter & Solar Power",
  "Fleet Fuel, Maintenance & Local Transport",
  "Inter-City Travel, Accommodation & Per Diem",
  "Software Subscriptions, Cloud & Internet Data",
  "Camera, Lighting, Audio & Studio Equipment",
  "Client Hospitality, Pitching & PR",
  "Vendor, Artisan & Sub-Contractor Payout",
  "Office Stationery, Cleaning & Janitorial Supplies",
  "Regulatory Permits, CAC, Signage & Legal Compliance",
  "Staff Welfare, Training & Medical",
  "Miscellaneous / Emergency Petty Cash",
];

/**
 * Strictly resolves the currently authenticated user against staff_profiles.
 * NEVER falls back to LS-01 or staffData[0] for non-founder users.
 */
export function resolveAuthenticatedStaff(authUser: any, staffList: any[]) {
  if (!authUser) return null;
  const email = (authUser.email || "").trim().toLowerCase();
  const uid = authUser.id;
  const meta = authUser.user_metadata || {};

  // 1. Exact ID or Email match in staff_profiles
  const matched =
    (staffList || []).find((s) => uid && s.id === uid) ||
    (staffList || []).find((s) => email && (s.email || "").trim().toLowerCase() === email);

  if (matched) {
    const isFounder = FOUNDER_EMAILS.includes(email) || matched.staff_id === "LS-01";
    const rawPerms = Array.isArray(matched.permissions)
      ? matched.permissions
      : matched.role
      ? [matched.role]
      : ["staff"];
    return {
      ...matched,
      permissions: isFounder
        ? Array.from(new Set([...rawPerms, "super_admin", "executive", "chief_strategist", "hr", "finance", "portfolio", "inquiries"]))
        : rawPerms,
    };
  }

  // 2. If Founder email but row not yet linked
  if (FOUNDER_EMAILS.includes(email)) {
    const ls01 = (staffList || []).find((s) => s.staff_id === "LS-01");
    if (ls01) return ls01;
    return {
      id: uid,
      staff_id: "LS-01",
      first_name: "Ifeoluwa",
      last_name: "Ayegboyin",
      email,
      role: "super_admin",
      hierarchy_level: "L7 - Executive / Director",
      step_level: 7,
      department: "Executive & Board Governance",
      job_title: "Managing Director / CEO",
      permissions: ["super_admin", "executive", "chief_strategist", "hr", "finance", "portfolio", "inquiries"],
    };
  }

  // 3. Authenticated staff member whose email wasn't found in staff_profiles yet:
  //    Build their own isolated staff profile from auth metadata (NEVER LS-01!)
  const fallbackFirst = meta.first_name || email.split("@")[0] || "Staff";
  const fallbackLast = meta.last_name || "";
  return {
    id: uid,
    staff_id: meta.staff_id || "STAFF",
    first_name: fallbackFirst.charAt(0).toUpperCase() + fallbackFirst.slice(1),
    last_name: fallbackLast,
    email,
    role: meta.role || "staff",
    hierarchy_level: meta.hierarchy_level || "L3 - Mid-Level Specialist",
    step_level: 1,
    department: meta.department || "Studio Operations",
    job_title: meta.job_title || "Team Member",
    permissions: Array.isArray(meta.permissions) ? meta.permissions : [meta.role || "staff"],
  };
}

export function checkModuleAccess(staff: any, moduleName: "hr" | "finance" | "portfolio" | "inquiries" | "workspace") {
  if (!staff) return false;
  if (moduleName === "workspace") return true;

  const email = (staff.email || "").trim().toLowerCase();
  const role = String(staff.role || "").toLowerCase();
  const perms: string[] = Array.isArray(staff.permissions) ? staff.permissions.map((p: string) => p.toLowerCase()) : [role];
  const isExecDirector =
    FOUNDER_EMAILS.includes(email) ||
    staff.staff_id === "LS-01" ||
    role === "super_admin" ||
    role === "executive" ||
    perms.includes("super_admin") ||
    perms.includes("executive") ||
    perms.includes("chief_strategist") ||
    String(staff.hierarchy_level || "").startsWith("L7");

  if (isExecDirector) return true;

  if (moduleName === "hr") {
    return role === "hr" || perms.includes("hr") || perms.includes("head_of_operations");
  }
  if (moduleName === "finance") {
    return role === "finance" || perms.includes("finance") || perms.includes("head_of_finance");
  }
  if (moduleName === "portfolio") {
    return role === "portfolio" || perms.includes("portfolio");
  }
  if (moduleName === "inquiries") {
    return role === "inquiries" || perms.includes("inquiries") || perms.includes("newsletter");
  }
  return false;
}


export function isExecutiveDirector(staff: any): boolean {
  if (!staff) return false;
  const code = String(staff.staff_id || "").toUpperCase();
  const role = String(staff.role || "").toLowerCase();
  const level = String(staff.hierarchy_level || "").toUpperCase();
  const title = String(staff.job_title || "").toLowerCase();
  return (
    code === "LS-01" ||
    role === "super_admin" ||
    role === "executive" ||
    level.startsWith("L7") ||
    title.includes("executive director") ||
    title.includes("managing director") ||
    title.includes("ceo") ||
    title.includes("founder")
  );
}


export const STUDIO_DEPARTMENTS = [
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

export const STUDIO_SERVICE_CATEGORIES = [
  "Event Branding & Scenography",
  "Craft Productions & Custom Fabrication",
  "Corporate Branding & Identity",
  "Event Media & Video Production",
  "Photography & Visual Coverage",
  "Gadgets & Equipment Rental",
  "Souvenirs & Corporate Merch",
  "Design & Print Production",
  "Out-of-Home (OOH) Advertising",
  "Stage, Lighting & LED Screen Rental",
  "Brand Strategy & Consultation",
];

export type ApprovalRoleTier = "level1_ceo" | "level2_ops" | "level3_finance" | "staff";

export function getStaffApprovalLevel(staff: any): ApprovalRoleTier {
  if (!staff) return "staff";
  const code = String(staff.staff_id || staff.staff_code || "").toUpperCase().trim();
  const role = String(staff.role || staff.designation || staff.position || "").toLowerCase();
  const dept = String(staff.department || "").toLowerCase();

  if (
    code === "LS-01" ||
    code === "LS-1" ||
    role.includes("ceo") ||
    role.includes("chief executive") ||
    role.includes("founder") ||
    role.includes("managing director") ||
    role.includes("strategist") ||
    dept.includes("executive")
  ) {
    return "level1_ceo";
  }

  if (
    role.includes("finance") ||
    role.includes("account") ||
    role.includes("treasur") ||
    dept.includes("finance") ||
    dept.includes("accounting")
  ) {
    return "level3_finance";
  }

  if (
    role.includes("operation") ||
    role.includes("head of ops") ||
    role.includes("ops") ||
    role.includes("manager") ||
    dept.includes("operation")
  ) {
    return "level2_ops";
  }

  return "staff";
}

export function getVoucherStageMeta(v: any): {
  stage: "pending" | "approved_waiting" | "disbursed" | "rejected";
  currentLevel: 1 | 2 | 3 | 4 | 0;
  requiredApproverTier: ApprovalRoleTier | null;
  label: string;
  badgeClass: string;
  isDisbursedOutflow: boolean;
  isDirectExpense: boolean;
  isDisbursedVoucher: boolean;
  canDisburse: boolean;
  approvalSummary: string;
} {
  const codeStr = String(v?.voucher_no || v?.voucher_code || "");
  const isDirect =
    String(v?.staff_code || "") === "FIN-DIRECT" ||
    codeStr.startsWith("LV-EXP") ||
    String(v?.staff_name || "").startsWith("[DIRECT]");

  if (isDirect) {
    return {
      stage: "disbursed",
      currentLevel: 4,
      requiredApproverTier: null,
      label: "DIRECT EXPENSE • PAID",
      badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      isDisbursedOutflow: true,
      isDirectExpense: true,
      isDisbursedVoucher: false,
      canDisburse: false,
      approvalSummary: "Direct Finance Entry",
    };
  }

  const rawStatus = String(v?.status || "pending").toLowerCase();
  const lvl1Ceo = String(v?.strategist_status || "pending").toLowerCase();
  const lvl2Ops = String(v?.ops_status || "pending").toLowerCase();
  const lvl3Fin = String(v?.finance_status || "pending").toLowerCase();

  const approvalSummary = "L1 CEO: " + lvl1Ceo.toUpperCase() + " → L2 Ops: " + lvl2Ops.toUpperCase() + " → L3 Fin: " + lvl3Fin.toUpperCase();

  if (
    rawStatus === "rejected" ||
    rawStatus === "declined" ||
    lvl1Ceo === "rejected" ||
    lvl2Ops === "rejected" ||
    lvl3Fin === "rejected"
  ) {
    const rejectedBy =
      lvl1Ceo === "rejected"
        ? "CEO (Level 1)"
        : lvl2Ops === "rejected"
        ? "Head of Ops (Level 2)"
        : lvl3Fin === "rejected"
        ? "Head of Finance (Level 3)"
        : "Executive";
    return {
      stage: "rejected",
      currentLevel: 0,
      requiredApproverTier: null,
      label: "REJECTED BY " + rejectedBy.toUpperCase(),
      badgeClass: "bg-red-500/15 text-red-400 border border-red-500/30",
      isDisbursedOutflow: false,
      isDirectExpense: false,
      isDisbursedVoucher: false,
      canDisburse: false,
      approvalSummary,
    };
  }

  if (rawStatus === "disbursed" || rawStatus === "paid") {
    return {
      stage: "disbursed",
      currentLevel: 4,
      requiredApproverTier: null,
      label: "DISBURSED • PAID",
      badgeClass: "bg-[#c7cb2d]/20 text-[#c7cb2d] border border-[#c7cb2d]/40",
      isDisbursedOutflow: true,
      isDirectExpense: false,
      isDisbursedVoucher: true,
      canDisburse: false,
      approvalSummary,
    };
  }

  if (lvl1Ceo !== "approved") {
    return {
      stage: "pending",
      currentLevel: 1,
      requiredApproverTier: "level1_ceo",
      label: "LEVEL 1/3 • AWAITING CEO APPROVAL",
      badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      isDisbursedOutflow: false,
      isDirectExpense: false,
      isDisbursedVoucher: false,
      canDisburse: false,
      approvalSummary,
    };
  }

  if (lvl2Ops !== "approved") {
    return {
      stage: "pending",
      currentLevel: 2,
      requiredApproverTier: "level2_ops",
      label: "LEVEL 2/3 • AWAITING HEAD OF OPS",
      badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      isDisbursedOutflow: false,
      isDirectExpense: false,
      isDisbursedVoucher: false,
      canDisburse: false,
      approvalSummary,
    };
  }

  if (lvl3Fin !== "approved") {
    return {
      stage: "pending",
      currentLevel: 3,
      requiredApproverTier: "level3_finance",
      label: "LEVEL 3/3 • AWAITING HEAD OF FINANCE",
      badgeClass: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
      isDisbursedOutflow: false,
      isDirectExpense: false,
      isDisbursedVoucher: false,
      canDisburse: false,
      approvalSummary,
    };
  }

  return {
    stage: "approved_waiting",
    currentLevel: 3,
    requiredApproverTier: "level3_finance",
    label: "APPROVED (3/3) • READY FOR DISBURSEMENT",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    isDisbursedOutflow: false,
    isDirectExpense: false,
    isDisbursedVoucher: false,
    canDisburse: true,
    approvalSummary,
  };
}
export const resolveCurrentStaff = resolveAuthenticatedStaff;
