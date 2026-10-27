"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Check, Loader2, ShieldCheck, Lock, Calendar, Receipt, 
  ShieldAlert, FileCheck, Plus, Trash2, Paperclip, Printer, Filter 
} from "lucide-react";
import PassportCropper from "@/components/admin/passport-cropper";
import OfficialDocumentModal from "@/components/admin/official-document-modal";
import FormattedDate from "@/components/admin/formatted-date";

const VOUCHER_CATEGORIES = [
  "Operational Expense",
  "Rent & Facility Lease",
  "Electricity, Power & Fuel",
  "Staff Support & Welfare",
  "Adhoc Vendors Payment",
  "Print & Production",
  "Software & Cloud",
  "Client Logistics & Rigging",
  "Equipment & Hardware",
];

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "01", label: "01 - January" },
  { value: "02", label: "02 - February" },
  { value: "03", label: "03 - March" },
  { value: "04", label: "04 - April" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - June" },
  { value: "07", label: "07 - July" },
  { value: "08", label: "08 - August" },
  { value: "09", label: "09 - September" },
  { value: "10", label: "10 - October" },
  { value: "11", label: "11 - November" },
  { value: "12", label: "12 - December" },
];

export default function StaffProfileAndSelfServicePage() {
  const supabase = createClient();
  const [heroVideoUrl, setHeroVideoUrl] = React.useState("");
  const [heroVideoInputUrl, setHeroVideoInputUrl] = React.useState("");
  const [heroVideoUploadState, setHeroVideoUploadState] = React.useState<{
    active: boolean;
    percent: number;
    etaSeconds: number;
    fileName: string;
    statusText: string;
  }>({ active: false, percent: 0, etaSeconds: 0, fileName: "", statusText: "" });

  React.useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_video_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setHeroVideoUrl(data.value);
          setHeroVideoInputUrl(data.value);
        }
      });
  }, [supabase]);

  const saveHeroVideoUrlToDb = async (urlToSave: string) => {
    const clean = urlToSave.trim();
    if (!clean) return;
    await supabase
      .from("site_settings")
      .upsert({ key: "hero_video_url", value: clean, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setHeroVideoUrl(clean);
    setHeroVideoInputUrl(clean);
    setHeroVideoUploadState((prev) => ({
      ...prev,
      active: false,
      percent: 100,
      etaSeconds: 0,
      statusText: "✅ Hero Showreel Video updated and live on Homepage!",
    }));
  };

  const handleHeroVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const startTime = Date.now();
    const totalBytes = file.size;
    setHeroVideoUploadState({
      active: true,
      percent: 3,
      etaSeconds: Math.max(3, Math.ceil(totalBytes / (800 * 1024))),
      fileName: `${file.name} (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`,
      statusText: "Uploading Hero Showreel Video...",
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const objectPath = `showreel/hero-${Date.now()}.${ext}`;

      // Use XMLHttpRequest so we get true byte-by-byte upload progress & accurate ETA countdown
      const uploadedPublicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${supabaseUrl}/storage/v1/object/media/${objectPath}`, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.min(98, Math.max(4, Math.round((ev.loaded / ev.total) * 100)));
            const elapsedSec = Math.max(0.5, (Date.now() - startTime) / 1000);
            const bytesPerSec = ev.loaded / elapsedSec;
            const remainingBytes = Math.max(0, ev.total - ev.loaded);
            const eta = bytesPerSec > 0 ? Math.ceil(remainingBytes / bytesPerSec) : 1;
            setHeroVideoUploadState({
              active: true,
              percent: pct,
              etaSeconds: eta,
              fileName: `${file.name} (${(ev.loaded / (1024 * 1024)).toFixed(1)} / ${(ev.total / (1024 * 1024)).toFixed(1)} MB)`,
              statusText: "Uploading Hero Showreel Video...",
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const { data: pub } = supabase.storage.from("media").getPublicUrl(objectPath);
            resolve(pub.publicUrl);
          } else {
            reject(new Error(`Storage upload status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during video upload"));
        xhr.send(file);
      });

      await saveHeroVideoUrlToDb(uploadedPublicUrl);
    } catch (err: any) {
      setHeroVideoUploadState({
        active: false,
        percent: 0,
        etaSeconds: 0,
        fileName: file.name,
        statusText: `⚠️ Upload error: ${err?.message || "Ensure the 'media' bucket SQL was run in Supabase."}`,
      });
    }
  };
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwMessage, setPwMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMessage({ type: "error", text: error.message });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage({ type: "success", text: "Your portal password has been updated!" });
    }
  };
  const router = useRouter();
  const [activeSection, setActiveSection] = React.useState<"profile" | "leave" | "voucher" | "relief" | "payslips">("profile");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  const [profile, setProfile] = React.useState<any>(null);
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [myLeaves, setMyLeaves] = React.useState<any[]>([]);
  const [myVouchers, setMyVouchers] = React.useState<any[]>([]);
  const [myReliefs, setMyReliefs] = React.useState<any[]>([]);
  const [myPayslips, setMyPayslips] = React.useState<any[]>([]);
  const [printSlip, setPrintSlip] = React.useState<any | null>(null);

  // Payslip Year & Month Filters
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const [selectedMonth, setSelectedMonth] = React.useState<string>("all");

  // 1. Complete Leave Form
  const [leaveForm, setLeaveForm] = React.useState({
    leave_type: "Annual Leave",
    start_date: "",
    end_date: "",
    handover_staff: "",
    reason: "",
  });

  // 2. Complete Expense Voucher Form (matching HR module 100%)
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
  });
  const [voucherItems, setVoucherItems] = React.useState<Array<{ item: string; qty: number; unitPrice: number }>>([
    { item: "", qty: 1, unitPrice: 0 },
  ]);

  // 3. Complete Tax Relief Form
  const [reliefForm, setReliefForm] = React.useState({
    relief_type: "Annual Rent Relief",
    annual_expense_declared: "",
    proof_document: "",
    proof_name: "",
  });

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const loadSelfServiceData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase.from("staff_profiles").select("*").eq("id", user.id).single();
    if (me) {
      setProfile(me);
      setVoucherForm((prev) => ({
        ...prev,
        bank_name: prev.bank_name || me.bank_name || "",
        bank_account_name: prev.bank_account_name || me.bank_account_name || `${me.first_name} ${me.last_name}`,
        bank_account_no: prev.bank_account_no || me.bank_account_no || "",
      }));

      const [
        { data: allStaff },
        { data: leaves },
        { data: vouchers },
        { data: reliefs },
        { data: slips }
      ] = await Promise.all([
        supabase.from("staff_profiles").select("id, first_name, last_name, staff_id, department, status").eq("status", "active"),
        supabase.from("leave_requests").select("*").eq("staff_code", me.staff_id).order("created_at", { ascending: false }),
        supabase.from("expense_vouchers").select("*").eq("staff_code", me.staff_id).order("created_at", { ascending: false }),
        supabase.from("staff_tax_reliefs").select("*").eq("staff_code", me.staff_id).order("created_at", { ascending: false }),
        supabase.from("payroll_runs").select("*").eq("staff_code", me.staff_id).eq("hr_status", "approved").eq("strategist_status", "approved").order("pay_period", { ascending: false }),
      ]);
      if (allStaff) setStaffList(allStaff);
      if (leaves) setMyLeaves(leaves);
      if (vouchers) setMyVouchers(vouchers);
      if (reliefs) setMyReliefs(reliefs);
      if (slips) setMyPayslips(slips);
    }
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadSelfServiceData();
  }, [loadSelfServiceData]);

  const canEditEmployment = profile?.role === "super_admin" || profile?.role === "hr";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const updatePayload: Record<string, any> = {
      first_name: profile.first_name.trim(),
      last_name: profile.last_name.trim(),
      phone: profile.phone,
      location: profile.location,
      emergency_contact: profile.emergency_contact,
      passport_url: profile.passport_url,
      bank_name: profile.bank_name,
      bank_account_name: profile.bank_account_name,
      bank_account_no: profile.bank_account_no,
      bio: profile.bio,
    };
    if (canEditEmployment) {
      updatePayload.department = profile.department;
      updatePayload.job_title = profile.job_title;
      updatePayload.employment_type = profile.employment_type;
    }
    await supabase.from("staff_profiles").update(updatePayload).eq("id", profile.id);
    setSaving(false);
    showToast("Profile updated");
    router.refresh();
  };

  // --- LEAVE APPLICATION LOGIC ---
  const countWorkingDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const requestedDays = countWorkingDays(leaveForm.start_date, leaveForm.end_date);
  const usedLeaveDays = myLeaves
    .filter((l) => l.status === "approved")
    .reduce((a, b) => a + (Number(b.working_days) || countWorkingDays(b.start_date, b.end_date)), 0);
  const remainingAnnualAllowance = Math.max(0, 20 - usedLeaveDays);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const maxPerReq = leaveForm.leave_type === "Annual Leave" ? 10 : 3;
    if (requestedDays <= 0) { alert("End date must be after start date."); return; }
    if (requestedDays > maxPerReq) {
      alert(leaveForm.leave_type === "Annual Leave" ? "Annual Leave cannot exceed 2 weeks (10 working days) per application." : "This leave category cannot exceed 3 working days per application.");
      return;
    }
    if (usedLeaveDays + requestedDays > 20) {
      alert("Total paid leave cannot exceed 4 weeks (20 working days) in a year.");
      return;
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(leaveForm.start_date); start.setHours(0,0,0,0);
    const noticeDays = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const reqNotice = leaveForm.leave_type === "Annual Leave" ? 14 : leaveForm.leave_type.includes("Sick") ? 0 : 3;
    if (noticeDays < reqNotice) {
      alert(leaveForm.leave_type === "Annual Leave" ? "Annual Leave must be applied at least 2 weeks (14 days) in advance." : "This leave category must be applied at least 3 days in advance (only emergency Sick Leave is exempt).");
      return;
    }

    setSaving(true);
    await supabase.from("leave_requests").insert({
      staff_id: profile.id,
      staff_name: `${profile.first_name} ${profile.last_name}`,
      staff_code: profile.staff_id,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      working_days: requestedDays,
      handover_staff: leaveForm.handover_staff,
      reason: leaveForm.reason,
      status: "pending",
      hr_status: "pending",
      ops_status: "pending",
      strategist_status: "pending",
    });
    setSaving(false);
    setLeaveForm({ leave_type: "Annual Leave", start_date: "", end_date: "", handover_staff: "", reason: "" });
    showToast("Leave application submitted");
    loadSelfServiceData();
  };

  // --- EXPENSE VOUCHER LOGIC ---
  const computedVoucherTotal = voucherItems.reduce((a, r) => a + Number(r.qty || 0) * Number(r.unitPrice || 0), 0);

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
    if (!profile || computedVoucherTotal <= 0) return;
    setSaving(true);
    const code = "LV-" + Math.floor(1000 + Math.random() * 9000);
    await supabase.from("expense_vouchers").insert({
      voucher_code: code,
      staff_id: profile.id,
      staff_name: `${profile.first_name} ${profile.last_name}`,
      staff_code: profile.staff_id,
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
    setSaving(false);
    setVoucherForm((prev) => ({ ...prev, title: "", project_ref: "", description: "", attachment_data: "", attachment_name: "" }));
    setVoucherItems([{ item: "", qty: 1, unitPrice: 0 }]);
    showToast(`Voucher ${code} raised`);
    loadSelfServiceData();
  };

  // --- TAX RELIEF FILING LOGIC ---
  const declaredAnnual = Number(reliefForm.annual_expense_declared || 0);
  const previewMonthlyRelief = Math.round(Math.min(500000, Math.round(declaredAnnual * 0.2)) / 12);

  const handleFileRelief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await supabase.from("staff_tax_reliefs").insert({
      staff_id: profile.id,
      staff_code: profile.staff_id,
      staff_name: `${profile.first_name} ${profile.last_name}`,
      relief_type: reliefForm.relief_type,
      annual_expense_declared: declaredAnnual,
      approved_monthly_relief: previewMonthlyRelief,
      proof_document: reliefForm.proof_document || null,
      proof_name: reliefForm.proof_name || null,
      status: "pending",
    });
    setSaving(false);
    setReliefForm({ relief_type: "Annual Rent Relief", annual_expense_declared: "", proof_document: "", proof_name: "" });
    showToast("Tax relief claim submitted");
    loadSelfServiceData();
  };

  // --- PAYSLIPS YEAR & MONTH FILTER ---
  const availableYears = React.useMemo(() => {
    const yrs = new Set<string>(["2026", "2025"]);
    myPayslips.forEach((p) => {
      if (p.pay_period && p.pay_period.includes("-")) {
        yrs.add(p.pay_period.split("-")[0]);
      }
    });
    return Array.from(yrs).sort((a, b) => Number(b) - Number(a));
  }, [myPayslips]);

  const filteredPayslips = myPayslips.filter((sl) => {
    const [yr, mo] = (sl.pay_period || "").split("-");
    const matchYr = selectedYear === "all" || yr === selectedYear;
    const matchMo = selectedMonth === "all" || mo === selectedMonth;
    return matchYr && matchMo;
  });

  const approvalPill = (label: string, status: string, by?: string | null) => {
    const color =
      status === "approved"
        ? "bg-[#c7cb2d]/15 text-[#c7cb2d] border-[#c7cb2d]/30"
        : status === "rejected"
        ? "bg-red-500/15 text-red-400 border-red-500/30"
        : "bg-[var(--bg-card)] text-[var(--text-dim)] border-[var(--border-subtle)]";
    return (
      <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 ${color}`}>
        <span className="uppercase font-bold">{label}:</span>
        <span className="uppercase">{status || "pending"}</span>
        {by && <span className="opacity-75">({by.split(" ")[0]})</span>}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-xs text-[var(--text-muted)]">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-xs text-red-400">Profile not found.</div>;

  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  const gradeCode = (profile.hierarchy_level || "L3").split(" - ")[0];

  return (
    <div className="max-w-6xl space-y-5">
      {/* Staff Identity & Navigation Bar */}
      <div className="bg-[var(--bg-card)] px-5 py-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-[var(--border-subtle)]/60">
        <div className="flex items-center gap-4">
          <PassportCropper
            value={profile.passport_url}
            onChange={(dataUrl) => setProfile({ ...profile, passport_url: dataUrl })}
            initials={initials}
          />
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold">
                {profile.staff_id}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[var(--bg-main)] text-[var(--text-dim)]">
                Grade {gradeCode}
              </span>
            </div>
            <h1 className="font-display text-lg font-bold text-[var(--text-primary)]">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {profile.job_title} • {profile.department}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "profile", label: "Personal & Bank", icon: ShieldCheck },
            { id: "leave", label: "Leave Application", icon: Calendar, badge: myLeaves.length },
            { id: "voucher", label: "Expense Vouchers", icon: Receipt, badge: myVouchers.length },
            { id: "relief", label: "Tax Relief Filing", icon: ShieldAlert, badge: myReliefs.length },
            { id: "payslips", label: "My Payslips", icon: FileCheck, badge: myPayslips.length },
          ].map((t) => {
            const active = activeSection === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveSection(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                  active ? "bg-[var(--text-primary)] text-[var(--bg-main)]" : "bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge ? (
                  <span className={`text-[10px] font-mono px-1.5 rounded-full ${active ? "bg-black/20 text-[var(--bg-main)]" : "bg-[#c7cb2d]/20 text-[#c7cb2d]"}`}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {notice && <p className="text-xs font-mono font-bold text-[#c7cb2d] px-1">{notice}</p>}

      {/* SECTION 1: PERSONAL & BANKING PROFILE */}
      {activeSection === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="bg-[var(--bg-card)] p-5 rounded-2xl space-y-3.5 border border-[var(--border-subtle)]/60">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#c7cb2d]" /> Employment Classification
              </h2>
              {!canEditEmployment && <Lock className="w-3 h-3 text-[var(--text-dim)]" />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Corporate Email</label>
                <input type="email" disabled value={profile.email || ""} className="w-full bg-[var(--bg-main)]/60 rounded-xl px-3 py-2 text-xs text-[var(--text-muted)]" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Contract Type</label>
                <input type="text" disabled={!canEditEmployment} value={profile.employment_type || "Full-Time"} onChange={(e) => setProfile({ ...profile, employment_type: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Department</label>
                <input type="text" disabled={!canEditEmployment} value={profile.department || ""} onChange={(e) => setProfile({ ...profile, department: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Job Title</label>
                <input type="text" disabled={!canEditEmployment} value={profile.job_title || ""} onChange={(e) => setProfile({ ...profile, job_title: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs disabled:opacity-60" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] p-5 rounded-2xl space-y-3.5 border border-[var(--border-subtle)]/60">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
              Personal & Salary Disbursement Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">First Name</label>
                <input type="text" required value={profile.first_name || ""} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Last Name</label>
                <input type="text" required value={profile.last_name || ""} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Phone Number</label>
                <input type="tel" value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--bg-main)]">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank Name</label>
                <input type="text" value={profile.bank_name || ""} onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })} placeholder="e.g. UBA / Polaris Bank" className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
                <input type="text" value={profile.bank_account_name || ""} onChange={(e) => setProfile({ ...profile, bank_account_name: e.target.value })} className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Number (NUBAN)</label>
                <input type="text" maxLength={10} value={profile.bank_account_no || ""} onChange={(e) => setProfile({ ...profile, bank_account_no: e.target.value })} className="w-full bg-[var(--bg-card)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
            </div>

            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer">
              {saving ? "Saving..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      )}

      {/* SECTION 2: COMPLETE LEAVE APPLICATION & 3-TIER TRACKER */}
      {activeSection === "leave" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={handleApplyLeave} className="lg:col-span-5 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Request Leave</h2>
              <span className="text-[10px] font-mono text-[#c7cb2d] font-bold">Used: {usedLeaveDays}/20 days</span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--bg-main)] text-[10px] font-mono text-[var(--text-muted)] space-y-1">
              <p>• Annual Paid Leave Cap: <strong>20 working days/yr</strong> ({remainingAnnualAllowance} days left)</p>
              <p>• Annual Leave: Max <strong>10 working days</strong> per request (apply 14 days ahead)</p>
              <p>• Other Leaves: Max <strong>3 working days</strong> per request (apply 3 days ahead; Sick Leave exempt)</p>
              {requestedDays > 0 && (
                <p className="text-[#c7cb2d] font-bold pt-1">Selected Duration: {requestedDays} working day(s)</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Leave Category</label>
              <select
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick / Medical Leave">Sick / Medical Leave (Emergency Exempt)</option>
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
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">End Date</label>
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
                  .filter((s) => s.id !== profile.id)
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
                placeholder="State reason and task handover details..."
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
            >
              {saving ? "Submitting..." : "Submit Leave Request"}
            </button>
          </form>

          <div className="lg:col-span-7 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <h2 className="font-display text-base font-bold">My Leave Applications & Approval Pipeline</h2>
            <div className="space-y-3">
              {myLeaves.map((lv) => (
                <div key={lv.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold">{lv.leave_type}</span>
                      <p className="text-[11px] font-mono text-[#c7cb2d]">
                        {lv.start_date} → {lv.end_date} ({lv.working_days || countWorkingDays(lv.start_date, lv.end_date)} working days)
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                      lv.status === "approved" ? "bg-[#c7cb2d]/15 text-[#c7cb2d]" : lv.status === "rejected" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {lv.status}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)]">
                    <strong>Relieving Officer:</strong> {lv.handover_staff || "N/A"} — "{lv.reason}"
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                    {approvalPill("1. HR", lv.hr_status || "pending", lv.hr_by)}
                    {approvalPill("2. Head of Ops", lv.ops_status || "pending", lv.ops_by)}
                    {approvalPill("3. Chief Strategist", lv.strategist_status || "pending", lv.strategist_by)}
                  </div>
                </div>
              ))}
              {myLeaves.length === 0 && <p className="text-xs text-[var(--text-muted)] py-8 text-center">No leave requests submitted yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: COMPLETE EXPENSE VOUCHERS & 2-TIER TRACKER */}
      {activeSection === "voucher" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={handleRaiseVoucher} className="lg:col-span-5 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
            <h2 className="font-display text-base font-bold">Raise Expense Voucher</h2>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Voucher Title</label>
                <input
                  type="text"
                  required
                  value={voucherForm.title}
                  onChange={(e) => setVoucherForm({ ...voucherForm, title: e.target.value })}
                  placeholder="e.g. Large Format Print"
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project Ref</label>
                <input
                  type="text"
                  value={voucherForm.project_ref}
                  onChange={(e) => setVoucherForm({ ...voucherForm, project_ref: e.target.value })}
                  placeholder="Client / Project Code"
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
                  {VOUCHER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
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
                  <option value="POS / Card">POS / Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            {/* Line Items Repeater */}
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
                    placeholder="Item description"
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
                    className="col-span-1 text-[var(--text-dim)] hover:text-red-400 flex justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Total Voucher Amount:</span>
                <span className="font-bold text-[#c7cb2d]">₦{computedVoucherTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Disbursement Bank Details */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Bank</label>
                <input
                  type="text"
                  required
                  value={voucherForm.bank_name}
                  onChange={(e) => setVoucherForm({ ...voucherForm, bank_name: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={voucherForm.bank_account_name}
                  onChange={(e) => setVoucherForm({ ...voucherForm, bank_account_name: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Account No</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={voucherForm.bank_account_no}
                  onChange={(e) => setVoucherForm({ ...voucherForm, bank_account_no: e.target.value })}
                  className="w-full bg-[var(--bg-main)] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Supporting Receipt / Proforma Invoice (Optional)
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleVoucherAttachment}
                className="w-full text-xs text-[var(--text-muted)] file:mr-2 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-[var(--bg-main)] file:text-xs font-semibold cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Notes / Justification</label>
              <textarea
                rows={2}
                value={voucherForm.description}
                onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
            >
              {saving ? "Submitting..." : "Submit Expense Voucher"}
            </button>
          </form>

          <div className="lg:col-span-7 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <h2 className="font-display text-base font-bold">My Expense Vouchers & Approvals</h2>
            <div className="space-y-3">
              {myVouchers.map((vc) => (
                <div key={vc.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                          {vc.voucher_code}
                        </span>
                        <span className="text-xs font-bold">{vc.title}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {vc.category} {vc.project_ref ? `• Ref: ${vc.project_ref}` : ""}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-sm font-bold text-[#c7cb2d]">₦{Number(vc.amount).toLocaleString()}</p>
                      <span className="text-[9px] uppercase text-[var(--text-dim)]">{vc.status}</span>
                    </div>
                  </div>

                  {Array.isArray(vc.line_items) && vc.line_items.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-card)] space-y-1 text-[11px] font-mono">
                      {vc.line_items.map((li: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{li.qty}x {li.item}</span>
                          <span>₦{(Number(li.qty) * Number(li.unitPrice)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {approvalPill("1. Head of Finance", vc.finance_status || "pending", vc.finance_by)}
                      {approvalPill("2. Chief Strategist", vc.strategist_status || "pending", vc.strategist_by)}
                    </div>
                    {vc.attachment_data && (
                      <a
                        href={vc.attachment_data}
                        download={vc.attachment_name || "voucher-attachment"}
                        className="text-[10px] font-mono text-[#c7cb2d] underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" /> {vc.attachment_name || "Attachment"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {myVouchers.length === 0 && <p className="text-xs text-[var(--text-muted)] py-8 text-center">No vouchers raised yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: COMPLETE TAX RELIEF FILING & SUPPORTING PROOF */}
      {activeSection === "relief" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={handleFileRelief} className="lg:col-span-5 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
            <h2 className="font-display text-base font-bold">File Staff Tax Relief</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Submit your annual rent or statutory insurance documentation. Once approved, your monthly tax relief automatically reduces your taxable PAYE base in Payroll.
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Relief Category</label>
              <select
                value={reliefForm.relief_type}
                onChange={(e) => setReliefForm({ ...reliefForm, relief_type: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="Annual Rent Relief">Annual Rent Relief (20% up to ₦500,000/yr)</option>
                <option value="Life Assurance / Medical Relief">Life Assurance / Medical Relief</option>
                <option value="National Housing / Statutory Relief">National Housing / Statutory Relief</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Annual Amount Paid (₦) *</label>
              <input
                type="number"
                required
                min="1"
                value={reliefForm.annual_expense_declared}
                onChange={(e) => setReliefForm({ ...reliefForm, annual_expense_declared: e.target.value })}
                placeholder="e.g. 600000"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            {declaredAnnual > 0 && (
              <div className="p-3 rounded-2xl bg-[var(--bg-main)] flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Computed Monthly Tax Relief:</span>
                <span className="font-bold text-[#c7cb2d]">₦{previewMonthlyRelief.toLocaleString()} / month</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Supporting Document (Rent Receipt / Tenancy Agreement / Certificate) *
              </label>
              <input
                type="file"
                required
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = (ev) =>
                    setReliefForm({
                      ...reliefForm,
                      proof_document: ev.target?.result as string,
                      proof_name: f.name,
                    });
                  r.readAsDataURL(f);
                }}
                className="w-full text-xs text-[var(--text-muted)] file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[var(--bg-main)] file:text-xs font-semibold cursor-pointer"
              />
              {reliefForm.proof_name && (
                <p className="text-[10px] font-mono text-[#c7cb2d] mt-1">Attached: {reliefForm.proof_name}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
            >
              {saving ? "Submitting..." : "Submit Tax Relief Claim"}
            </button>
          </form>

          <div className="lg:col-span-7 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <h2 className="font-display text-base font-bold">My Tax Relief Filings</h2>
            <div className="space-y-3">
              {myReliefs.map((rel) => (
                <div key={rel.id} className="p-4 rounded-2xl bg-[var(--bg-main)] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold">{rel.relief_type}</p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">
                      Declared Expense: ₦{Number(rel.annual_expense_declared).toLocaleString()}/yr • Monthly Relief:{" "}
                      <strong className="text-[#c7cb2d]">₦{Number(rel.approved_monthly_relief).toLocaleString()}/mo</strong>
                    </p>
                    {rel.approved_by && (
                      <p className="text-[10px] font-mono text-[#c7cb2d]">Verified by: {rel.approved_by}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {rel.proof_document && (
                      <a
                        href={rel.proof_document}
                        download={rel.proof_name || "tax-relief-proof"}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[#c7cb2d] text-[10px] font-mono uppercase underline"
                      >
                        View Proof
                      </a>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold ${
                      rel.status === "approved" ? "bg-[#c7cb2d]/15 text-[#c7cb2d]" : rel.status === "rejected" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {rel.status}
                    </span>
                  </div>
                </div>
              ))}
              {myReliefs.length === 0 && <p className="text-xs text-[var(--text-muted)] py-8 text-center">No tax relief claims filed yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: MY PAYSLIPS (INLINE BREAKDOWN PREVIEW + YEAR & MONTH FILTER) */}
      {activeSection === "payslips" && (
        <div className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-4 border border-[var(--border-subtle)]/60">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="font-display text-base font-bold">My Official Payslips</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Review your complete salary breakdown below or open the official letterhead preview before printing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[var(--bg-main)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
                <Filter className="w-3.5 h-3.5 text-[#c7cb2d]" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[var(--bg-main)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
                <Calendar className="w-3.5 h-3.5 text-[#c7cb2d]" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-mono focus:outline-none cursor-pointer"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPayslips.map((sl) => (
              <div key={sl.id} className="p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 space-y-4">
                {/* Top Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]/50">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-lg bg-[var(--bg-card)] text-[#c7cb2d] font-mono text-xs font-bold">
                      {sl.pay_period}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold">{sl.staff_name} ({sl.staff_code})</h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">
                        {sl.department} • Grade {sl.hierarchy_level}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] text-[10px] font-mono uppercase font-bold">
                      Approved
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrintSlip(sl)}
                      className="px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-[#c7cb2d]" /> Preview & Print Payslip
                    </button>
                  </div>
                </div>

                {/* Inline Itemized Breakdown Preview (Visible immediately before opening PDF) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[var(--bg-card)]">
                    <span className="text-[9px] uppercase text-[var(--text-dim)] block">Basic Salary</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5 block">
                      ₦{Number(sl.basic_salary || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-card)]">
                    <span className="text-[9px] uppercase text-[var(--text-dim)] block">Allowance / Bonus</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5 block">
                      +₦{Number(sl.bonuses || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-card)]">
                    <span className="text-[9px] uppercase text-[var(--text-dim)] block">Tax Relief</span>
                    <span className="text-sm font-bold text-[var(--text-muted)] mt-0.5 block">
                      ₦{Number(sl.tax_relief_applied || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-card)]">
                    <span className="text-[9px] uppercase text-[var(--text-dim)] block">PAYE Tax</span>
                    <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                      -₦{Number(sl.paye_tax || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[#c7cb2d]/40">
                    <span className="text-[9px] uppercase text-[#c7cb2d] font-bold block">Net Take-Home Pay</span>
                    <span className="text-sm font-bold text-[#c7cb2d] mt-0.5 block">
                      ₦{Number(sl.net_pay || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Disbursement Bank Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)] pt-1">
                  <span>
                    Disbursement Account: <strong className="text-[var(--text-primary)]">{sl.bank_account_name || sl.staff_name}</strong> ({sl.bank_name} • {sl.bank_account_no})
                  </span>
                  <span>Status: <strong className="text-[#c7cb2d]">Approved</strong></span>
                </div>
              </div>
            ))}
            {filteredPayslips.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                No approved payslips found for the selected year/month filter.
              </p>
            )}
          </div>
        </div>
      )}

      {printSlip && (
        <OfficialDocumentModal type="payslip" data={printSlip} onClose={() => setPrintSlip(null)} />
      )}
      {/* PORTAL PASSWORD RESET SECTION */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4 mt-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
            Account Security
          </span>
          <h3 className="font-display text-base font-bold">Update Portal Password</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Change your temporary onboarding password or update your personal sign-in credentials.
          </p>
        </div>

        {pwMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border ${
              pwMessage.type === "success"
                ? "bg-[#c7cb2d]/10 border-[#c7cb2d]/40 text-[#c7cb2d]"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {pwMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="py-2.5 px-5 rounded-xl bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {pwLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
      {/* HERO SHOWREEL VIDEO MANAGER (WITH REAL-TIME PROGRESS & ETA COUNTDOWN) */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
              Homepage Showreel Media
            </span>
            <h3 className="font-display text-base font-bold">Hero Showreel Video</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Upload an MP4/WebM showreel video (with live progress & time remaining) or paste a direct video URL.
            </p>
          </div>
          <label className="px-4 py-2.5 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition">
            {heroVideoUploadState.active ? `Uploading (${heroVideoUploadState.percent}%)...` : "Upload Video File"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              disabled={heroVideoUploadState.active}
              onChange={handleHeroVideoFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* REAL-TIME UPLOAD PROGRESS BAR & TIME REMAINING */}
        {heroVideoUploadState.active && (
          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-primary)]">{heroVideoUploadState.statusText}</span>
              <span className="font-mono font-bold text-[#c7cb2d]">
                {heroVideoUploadState.percent}% • ~{heroVideoUploadState.etaSeconds}s remaining
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
              <div
                className="h-full bg-[#c7cb2d] transition-all duration-300 rounded-full"
                style={{ width: `${heroVideoUploadState.percent}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[var(--text-dim)]">{heroVideoUploadState.fileName}</p>
          </div>
        )}

        {heroVideoUploadState.statusText && !heroVideoUploadState.active && (
          <p className="text-xs font-mono text-[#c7cb2d]">{heroVideoUploadState.statusText}</p>
        )}

        {/* DIRECT VIDEO URL OPTION */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            value={heroVideoInputUrl}
            onChange={(e) => setHeroVideoInputUrl(e.target.value)}
            placeholder="Or paste direct MP4 / WebM video URL..."
            className="flex-1 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => saveHeroVideoUrlToDb(heroVideoInputUrl)}
            className="px-5 py-2.5 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black border border-[#c7cb2d]/50 text-[#c7cb2d] text-xs font-bold uppercase cursor-pointer transition"
          >
            Save Video URL
          </button>
        </div>

        {heroVideoUrl && (
          <div className="rounded-2xl overflow-hidden bg-black border border-[var(--border-subtle)]/50 max-h-60">
            <video
              key={heroVideoUrl}
              src={heroVideoUrl}
              controls
              muted
              playsInline
              className="w-full max-h-60 object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
