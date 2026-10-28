export const FOUNDER_EMAIL = "ayegboyin@studioslavie.com";
export const FOUNDER_EMAILS = [
  "ayegboyin@studioslavie.com",
  "hipheholluhayegboyin@gmail.com",
];

export const VOUCHER_CATEGORIES = [
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
