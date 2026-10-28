"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
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
} from "lucide-react";
import FormattedDate from "@/components/admin/formatted-date";
import { resolveAuthenticatedStaff, VOUCHER_CATEGORIES } from "@/utils/resolve-current-staff";

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
  "Finance, HR & Administration",
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
  const [activeTab, setActiveTab] = React.useState<"chat" | "leave" | "vouchers" | "promotion">("chat");
  const [me, setMe] = React.useState<any | null>(null);
  const [staffColleagues, setStaffColleagues] = React.useState<any[]>([]);
  const [myLeaves, setMyLeaves] = React.useState<any[]>([]);
  const [myVouchers, setMyVouchers] = React.useState<any[]>([]);
  const [myPromotions, setMyPromotions] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Leave form
  const [leaveForm, setLeaveForm] = React.useState({
    leave_type: "Annual Leave",
    start_date: "",
    end_date: "",
    handover_staff: "",
    reason: "",
  });

  // Voucher form (16 categories)
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
    ] = await Promise.all([
      supabase
        .from("staff_profiles")
        .select("id, staff_id, first_name, last_name, email, role, hierarchy_level, step_level, permissions, department, job_title, employment_type, status, bank_name, bank_account_name, bank_account_no, passport_url")
        .order("staff_id", { ascending: true }),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("studio_messages").select("*").order("created_at", { ascending: true }).limit(200),
    ]);

    const resolved = resolveAuthenticatedStaff(authData?.user, staffData || []);
    setMe(resolved);
    setStaffColleagues(staffData || []);

    if (resolved) {
      const myCode = String(resolved.staff_id || "").toUpperCase();
      const myId = resolved.id;

      setMyLeaves(
        (leaveData || []).filter(
          (l) => (myId && l.staff_id === myId) || (myCode && String(l.staff_code || "").toUpperCase() === myCode)
        )
      );
      setMyVouchers(
        (voucherData || []).filter(
          (v) => (myId && v.staff_id === myId) || (myCode && String(v.staff_code || "").toUpperCase() === myCode)
        )
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
    }

    if (msgData) setMessages(msgData);
  }, [supabase]);

  React.useEffect(() => {
    loadOpenSpace();
  }, [loadOpenSpace]);

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

  // Leave logic
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

    await supabase.from("expense_vouchers").insert({
      voucher_no: vNo,
      staff_id: me.id,
      staff_name: authorName,
      staff_code: me.staff_id || "STAFF",
      department: me.department || "Operations",
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
      comments: initialComments,
      status: "pending",
      ops_status: "pending",
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
      initial_comment: "",
    }));
    setVoucherItems([{ item: "", qty: 1, unitPrice: 0 }]);
    setSaving(false);
    loadOpenSpace();
  };

  const handleAddVoucherComment = async (v: any) => {
    const text = (voucherCommentInputs[v.id] || "").trim();
    if (!text) return;
    const author = me ? `${me.first_name || "Staff"} (${me.staff_id || "STAFF"})` : "Team Member";
    const updated = [...(Array.isArray(v.comments) ? v.comments : []), { author, text, at: new Date().toISOString() }];
    setVoucherCommentInputs((prev) => ({ ...prev, [v.id]: "" }));
    await supabase.from("expense_vouchers").update({ comments: updated }).eq("id", v.id);
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

  return (
    <div className="space-y-5">
      {/* CLEAN WELCOME HEADER WITH INTEGRATED OPEN-SPACE TOOL TABS */}
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
            Welcome Back, {me?.first_name || "Team Member"}
          </h1>
        </div>

        {/* OPEN STAFF TOOLS SWITCHER (CHAT, LEAVE, VOUCHERS, PROMOTION REQUEST) */}
        <div className="flex flex-wrap gap-1.5">
          {[
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
          OPEN SPACE TAB 1: STUDIO CHAT
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
          OPEN SPACE TAB 2: MY LEAVE APPLICATIONS
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
            {myLeaves.map((lv) => (
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
          </div>
        </div>
      )}

      {/* =====================================================================
          OPEN SPACE TAB 3: MY EXPENSE VOUCHERS (16 CATEGORIES)
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
            {myVouchers.map((v) => {
              const vComments = Array.isArray(v.comments) ? v.comments : [];
              return (
                <div key={v.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-[#c7cb2d]">
                        {v.voucher_no} • {v.category}
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
                        placeholder="Add comment..."
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
          </div>
        </div>
      )}

      {/* =====================================================================
          OPEN SPACE TAB 4: REQUEST PROMOTION
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
    </div>
  );
}
