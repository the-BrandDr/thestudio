"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { triggerPushNotification } from "@/utils/push-notifications";
import { playChatSound } from "@/utils/chat-sound-effects";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Reply,
  Plus,
  Mic,
  Square,
  AtSign,
  Check,
  CheckCheck,
  Users,
  Lock,
  X,
  MessageSquare,
  FileText,
  Pin,
} from "lucide-react";

const QUICK_EMOJIS = ["👍", "🔥", "✅", "👏", "❤️", "🎯", "🚀", "🙏", "🎉", "⚡", "💡", "📌"];

const STUDIO_DEPARTMENTS = [
  "Executive & Board Governance",
  "Creative Direction & Brand Strategy",
  "Visual Design & Motion Graphics",
  "Event Branding, Spatial & Production",
  "Operations, Logistics & Procurement",
  "Finance, Accounting & Legal",
  "Client Relations, Sales & PR",
  "Engineering, Web & Digital Systems",
];

interface WhatsAppWorkplaceChatProps {
  currentUser: any;
  staffList: any[];
  messages: any[];
  onRefreshMessages?: () => void;
  onPreviewImage?: (url: string) => void;
}

type ThreadItem = {
  id: string;
  type: "group" | "dept" | "direct" | "mentions";
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  initials: string;
  targetCode: string;
  lastMessage?: any;
  lastTimeMs: number;
  lastTimeLabel: string;
  unreadCount: number;
  pinned?: boolean;
};

export default function WhatsAppWorkplaceChat({
  currentUser,
  staffList,
  messages,
  onRefreshMessages,
  onPreviewImage,
}: WhatsAppWorkplaceChatProps) {
  const supabase = createClient();

  const myCode = String(currentUser?.staff_id || "LS-01").toUpperCase().trim();
  const myFirst = String(currentUser?.first_name || "").toLowerCase().trim();
  const myFullName = currentUser
    ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
    : "Studio Staff";

  // Active thread key: e.g. "GROUP:ALL", "MENTIONS:ME", "DEPT:Operations...", "DM:LS-03"
  const [activeThreadId, setActiveThreadId] = React.useState<string>("GROUP:ALL");
  const [sidebarFilter, setSidebarFilter] = React.useState<"all" | "unread" | "groups" | "direct" | "mentions">("all");
  const [sidebarSearch, setSidebarSearch] = React.useState("");
  const [inChatSearch, setInChatSearch] = React.useState("");
  const [showInChatSearch, setShowInChatSearch] = React.useState(false);

  // Multi-recipient broadcast modal state ("+" button like WhatsApp New Chat / Broadcast)
  const [showBroadcastModal, setShowBroadcastModal] = React.useState(false);
  const [broadcastCodes, setBroadcastCodes] = React.useState<string[]>([]);

  // Composer state
  const [chatInput, setChatInput] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<any | null>(null);
  const [chatAttachment, setChatAttachment] = React.useState<{
    url: string;
    name: string;
    type: "image" | "file";
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showMentionList, setShowMentionList] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionedCodes, setMentionedCodes] = React.useState<string[]>([]);
  const [sending, setSending] = React.useState(false);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [voiceNoteDraft, setVoiceNoteDraft] = React.useState<{
    blob?: Blob;
    url: string;
    duration: number;
  } | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<any>(null);

  const chatFileRef = React.useRef<HTMLInputElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Track last-read timestamp per thread in localStorage so unread badges work accurately
  const [lastReadMap, setLastReadMap] = React.useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(window.localStorage.getItem(`lavie_wa_read_${myCode}`) || "{}");
      } catch (_) {}
    }
    return {};
  });

  const markThreadAsRead = React.useCallback(
    (threadId: string) => {
      setLastReadMap((prev) => {
        const next = { ...prev, [threadId]: Date.now() };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(`lavie_wa_read_${myCode}`, JSON.stringify(next));
          } catch (_) {}
        }
        return next;
      });
    },
    [myCode]
  );

  // Support URL deep-linking (?tab=chat&mode=direct&target=LS-03 or ?mode=mentions)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const applyDeepLink = (searchStr: string) => {
      const params = new URLSearchParams(searchStr);
      const mode = params.get("mode");
      const target = params.get("target");
      if (mode === "direct" && target) {
        const tid = `DM:${target.toUpperCase()}`;
        setActiveThreadId(tid);
        markThreadAsRead(tid);
      } else if (mode === "mentions") {
        setActiveThreadId("MENTIONS:ME");
        markThreadAsRead("MENTIONS:ME");
      } else if (mode === "group") {
        setActiveThreadId("GROUP:ALL");
        markThreadAsRead("GROUP:ALL");
      }
    };
    applyDeepLink(window.location.search);
    const onDeepLink = (ev: Event) => {
      const href = (ev as CustomEvent)?.detail?.href || "";
      const qIdx = href.indexOf("?");
      if (qIdx !== -1) applyDeepLink(href.slice(qIdx));
    };
    window.addEventListener("lavie:deep-link", onDeepLink);
    return () => window.removeEventListener("lavie:deep-link", onDeepLink);
  }, [markThreadAsRead]);

  // Format WhatsApp-style compact timestamp (e.g. "07:11", "Yesterday", or "26/09/2026")
  const formatWaTimestamp = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Build unified WhatsApp conversation list (Pinned All-Staff Group + @Mentions + Department Channels + 1:1 Direct Staff Chats)
  const threads: ThreadItem[] = React.useMemo(() => {
    const list: ThreadItem[] = [];

    // Helper to compute last message & unread count for a given predicate
    const summarizeThread = (
      id: string,
      predicate: (m: any) => boolean
    ): { lastMessage?: any; lastTimeMs: number; lastTimeLabel: string; unreadCount: number } => {
      const matching = (messages || []).filter(predicate).sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      const lastMsg = matching[matching.length - 1];
      const lastTimeMs = lastMsg?.created_at ? new Date(lastMsg.created_at).getTime() : 0;
      const lastRead = lastReadMap[id] || 0;
      const unreadCount = matching.filter(
        (m) =>
          String(m.sender_code || "").toUpperCase() !== myCode &&
          new Date(m.created_at || 0).getTime() > lastRead
      ).length;

      return {
        lastMessage: lastMsg,
        lastTimeMs,
        lastTimeLabel: lastMsg ? formatWaTimestamp(lastMsg.created_at) : "",
        unreadCount: activeThreadId === id ? 0 : unreadCount,
      };
    };

    // 1. Official Lavie Studios Working Space (All Staff Group) - Pinned at top
    const allStaffStats = summarizeThread(
      "GROUP:ALL",
      (m) => m.channel_type === "group" && (m.recipient_code === "All Staff" || !m.recipient_code)
    );
    list.push({
      id: "GROUP:ALL",
      type: "group",
      title: "Lavie Studios Working Space",
      subtitle: `Official Workplace Group • ${staffList.length || 1} members`,
      avatarUrl: "/logo-light.svg",
      initials: "LS",
      targetCode: "All Staff",
      pinned: true,
      ...allStaffStats,
    });

    // 2. @Tagged You (@Mentions Feed)
    const mentionStats = summarizeThread("MENTIONS:ME", (m) => {
      const c = String(m.content || "");
      return (
        (myCode && c.toUpperCase().includes(myCode)) ||
        (myFirst && c.toLowerCase().includes(`@${myFirst}`))
      );
    });
    list.push({
      id: "MENTIONS:ME",
      type: "mentions",
      title: "@Mentions & Tagged",
      subtitle: `Messages tagging @${myCode}`,
      initials: "@",
      targetCode: "Mentions",
      pinned: true,
      ...mentionStats,
    });

    // 3. Department Groups
    for (const dept of STUDIO_DEPARTMENTS) {
      const id = `DEPT:${dept}`;
      const deptStats = summarizeThread(id, (m) =>
        String(m.recipient_code || "").includes(dept)
      );
      // Show the user's own department always, plus any department that has messages
      if (dept === currentUser?.department || deptStats.lastMessage || sidebarFilter === "groups") {
        list.push({
          id,
          type: "dept",
          title: dept,
          subtitle: "Department Channel",
          initials: dept
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join(""),
          targetCode: `DEPT: ${dept}`,
          ...deptStats,
        });
      }
    }

    // 4. 1:1 Direct Staff Conversations
    for (const st of staffList || []) {
      const code = String(st.staff_id || "").toUpperCase().trim();
      if (!code || code === myCode) continue;
      const id = `DM:${code}`;
      const dmStats = summarizeThread(
        id,
        (m) =>
          m.channel_type === "direct" &&
          ((String(m.sender_code || "").toUpperCase() === myCode &&
            String(m.recipient_code || "").toUpperCase() === code) ||
            (String(m.sender_code || "").toUpperCase() === code &&
              String(m.recipient_code || "").toUpperCase() === myCode))
      );

      const fullName = `${st.first_name || ""} ${st.last_name || ""}`.trim() || code;
      list.push({
        id,
        type: "direct",
        title: fullName,
        subtitle: `${st.job_title || st.department || "Staff"} • ${code}`,
        avatarUrl: st.passport_url || null,
        initials: `${st.first_name?.[0] || "S"}${st.last_name?.[0] || ""}`.toUpperCase(),
        targetCode: code,
        ...dmStats,
      });
    }

    // Sort: Pinned first, then by latest message timestamp (just like WhatsApp!), then alphabetically
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (b.lastTimeMs !== a.lastTimeMs) return b.lastTimeMs - a.lastTimeMs;
      return a.title.localeCompare(b.title);
    });
  }, [messages, staffList, myCode, myFirst, currentUser, lastReadMap, activeThreadId, sidebarFilter]);

  const visibleThreads = threads.filter((t) => {
    if (sidebarFilter === "unread" && t.unreadCount <= 0) return false;
    if (sidebarFilter === "groups" && t.type !== "group" && t.type !== "dept") return false;
    if (sidebarFilter === "direct" && t.type !== "direct") return false;
    if (sidebarFilter === "mentions" && t.type !== "mentions") return false;
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      const hay = `${t.title} ${t.subtitle} ${t.targetCode} ${t.lastMessage?.content || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0] || null;

  // Messages belonging to the currently selected thread
  const activeMessages = React.useMemo(() => {
    if (!activeThread) return [];
    const filtered = (messages || []).filter((m) => {
      if (activeThread.id === "GROUP:ALL") {
        return m.channel_type === "group" && (m.recipient_code === "All Staff" || !m.recipient_code);
      }
      if (activeThread.id === "MENTIONS:ME") {
        const c = String(m.content || "");
        return (
          (myCode && c.toUpperCase().includes(myCode)) ||
          (myFirst && c.toLowerCase().includes(`@${myFirst}`))
        );
      }
      if (activeThread.type === "dept") {
        return String(m.recipient_code || "").includes(activeThread.title);
      }
      if (activeThread.type === "direct") {
        const target = activeThread.targetCode.toUpperCase();
        const sCode = String(m.sender_code || "").toUpperCase();
        const rCode = String(m.recipient_code || "").toUpperCase();
        return (
          m.channel_type === "direct" &&
          ((sCode === myCode && rCode === target) || (sCode === target && rCode === myCode))
        );
      }
      return false;
    });

    const searched = inChatSearch.trim()
      ? filtered.filter((m) =>
          `${m.content || ""} ${m.sender_name || ""}`
            .toLowerCase()
            .includes(inChatSearch.toLowerCase())
        )
      : filtered;

    return [...searched].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
  }, [messages, activeThread, myCode, myFirst, inChatSearch]);

  // Scroll to bottom when switching threads or new message arrives
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, activeMessages.length]);

  const handleSelectThread = (t: ThreadItem) => {
    setActiveThreadId(t.id);
    markThreadAsRead(t.id);
    setReplyingTo(null);
  };

  // Handle @mention detection inside composer input
  const handleInputChange = (val: string) => {
    setChatInput(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt >= val.length - 18) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query);
        setShowMentionList(true);
        return;
      }
    }
    setShowMentionList(false);
  };

  const insertStaffMention = (s: any) => {
    const tag = `@${s.first_name}(${s.staff_id}) `;
    const lastAt = chatInput.lastIndexOf("@");
    const nextVal = lastAt !== -1 ? chatInput.slice(0, lastAt) + tag : chatInput + " " + tag;
    setChatInput(nextVal);
    setMentionedCodes((prev) => Array.from(new Set([...prev, String(s.staff_id).toUpperCase()])));
    setShowMentionList(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordingChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNoteDraft({
            blob,
            url: (reader.result as string) || "",
            duration: Math.max(1, recordingSeconds),
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (_) {}
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatAttachment && !voiceNoteDraft) || !activeThread) return;
    setSending(true);

    const regexTags = Array.from(chatInput.matchAll(/\((LS-[0-9A-Z]+)\)/gi)).map((m) =>
      m[1].toUpperCase()
    );
    const allMentions = Array.from(new Set([...mentionedCodes, ...regexTags]));

    const contentText =
      chatInput.trim() ||
      (voiceNoteDraft ? `🎤 Voice Note (${voiceNoteDraft.duration}s)` : "") ||
      (chatAttachment ? `📎 ${chatAttachment.name}` : "");

    const baseMsg: Record<string, any> = {
      sender_id: currentUser?.id || null,
      sender_name: myFullName,
      sender_code: myCode,
      sender_role: currentUser?.job_title || "Staff",
      content: contentText,
      reply_to_id: replyingTo?.id || null,
      reply_preview: replyingTo
        ? `${replyingTo.sender_name}: ${String(replyingTo.content || "").slice(0, 60)}`
        : null,
      attachment_url: voiceNoteDraft ? voiceNoteDraft.url : chatAttachment?.url || null,
      attachment_name: voiceNoteDraft
        ? `VOICE_NOTE_${voiceNoteDraft.duration}s.webm`
        : chatAttachment?.name || null,
    };

    try {
      if (showBroadcastModal && broadcastCodes.length > 0) {
        const rows = broadcastCodes.map((code) => ({
          ...baseMsg,
          channel_type: "direct",
          recipient_code: code,
        }));
        await supabase.from("studio_messages").insert(rows);
        triggerPushNotification({
          title: `💬 You have a new message from ${myFullName}`,
          message: contentText.slice(0, 90),
          url: `https://studioslavie.com/admin?tab=chat&mode=direct&target=${encodeURIComponent(myCode)}`,
          targetType: "staff_codes",
          staffCodes: broadcastCodes,
        });
        setShowBroadcastModal(false);
        setBroadcastCodes([]);
      } else if (activeThread.type === "direct") {
        await supabase.from("studio_messages").insert({
          ...baseMsg,
          channel_type: "direct",
          recipient_code: activeThread.targetCode,
        });
        triggerPushNotification({
          title: `💬 You have a new message from ${myFullName}`,
          message: contentText.slice(0, 90),
          url: `https://studioslavie.com/admin?tab=chat&mode=direct&target=${encodeURIComponent(myCode)}`,
          targetType: "staff_codes",
          staffCodes: [activeThread.targetCode],
        });
      } else if (activeThread.type === "dept") {
        await supabase.from("studio_messages").insert({
          ...baseMsg,
          channel_type: "group",
          recipient_code: activeThread.targetCode,
        });
        triggerPushNotification({
          title: `👥 ${myFullName} sent a message to ${activeThread.title} group`,
          message: contentText.slice(0, 90),
          url: "https://studioslavie.com/admin?tab=chat",
          targetType: "department",
          department: activeThread.title,
        });
      } else {
        await supabase.from("studio_messages").insert({
          ...baseMsg,
          channel_type: "group",
          recipient_code: "All Staff",
        });
        triggerPushNotification({
          title: `📢 ${myFullName} sent a message to Lavie Working Space`,
          message: contentText.slice(0, 90),
          url: "https://studioslavie.com/admin?tab=chat&mode=group",
          targetType: "all_staff",
        });
      }

      if (allMentions.length > 0) {
        triggerPushNotification({
          title: `🏷️ You were tagged in a message by ${myFullName}`,
          message: contentText.slice(0, 90),
          url: "https://studioslavie.com/admin?tab=chat&mode=mentions",
          targetType: "staff_codes",
          staffCodes: allMentions,
        });
      }

      // Play WhatsApp/Telegram outgoing sound click
      playChatSound("sent");

      setChatInput("");
      setReplyingTo(null);
      setChatAttachment(null);
      setVoiceNoteDraft(null);
      setMentionedCodes([]);
      setShowEmojiPicker(false);
      setShowMentionList(false);
      markThreadAsRead(activeThread.id);
      if (onRefreshMessages) onRefreshMessages();
    } finally {
      setSending(false);
    }
  };

  // Highlight @mentions inside chat bubbles
  const renderFormattedChatText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_]+\(LS-[0-9A-Za-z]+\)|@[A-Za-z0-9_-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const isMe = myCode && part.toUpperCase().includes(myCode);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden bg-[#111315] border border-[var(--border-subtle)]/70 shadow-2xl h-[650px]">
      {/* =======================================================================
          LEFT PANE: WHATSAPP-STYLE UNIFIED CONVERSATION LIST (4 COLS)
      ======================================================================= */}
      <div className="lg:col-span-4 flex flex-col bg-[#161717] border-r border-white/10 h-full overflow-hidden">
        {/* Top Header Bar: Title + Broadcast (+) Button */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-white tracking-tight">Chats</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#c7cb2d]/15 text-[#c7cb2d] font-mono text-[10px] font-bold">
              {threads.reduce((acc, t) => acc + t.unreadCount, 0) || threads.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBroadcastModal((p) => !p)}
            title="Broadcast Message to Multiple Colleagues"
            className="w-7 h-7 rounded-full bg-[#c7cb2d] text-black flex items-center justify-center hover:brightness-110 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* WhatsApp Pill Search Bar */}
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search chats, staff, or messages..."
              className="w-full bg-[#242626] text-white placeholder:text-zinc-400 rounded-full pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#c7cb2d]"
            />
          </div>
        </div>

        {/* Filter Pills (All, Unread, Groups, Direct, @Tagged) */}
        <div className="px-3 pb-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border-b border-white/5">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "groups", label: "Groups" },
            { id: "direct", label: "Direct" },
            { id: "mentions", label: "@Tagged" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSidebarFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                sidebarFilter === f.id
                  ? "bg-[#c7cb2d] text-black font-bold"
                  : "bg-[#242626] text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Scrollable WhatsApp Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {visibleThreads.map((t) => {
            const isSelected = activeThread?.id === t.id;
            const lastMsg = t.lastMessage;
            const isSentByMe =
              lastMsg && String(lastMsg.sender_code || "").toUpperCase() === myCode;

            let previewText = t.subtitle;
            if (lastMsg) {
              const rawContent = lastMsg.content || "📎 Attachment";
              if (t.type === "group" || t.type === "dept" || t.type === "mentions") {
                const senderShort = isSentByMe
                  ? "You"
                  : String(lastMsg.sender_name || "Staff").split(" ")[0];
                previewText = `${senderShort}: ${rawContent}`;
              } else {
                previewText = rawContent;
              }
            }

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectThread(t)}
                className={`w-full px-3.5 py-3 flex items-center gap-3 text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-[#2a2c2c]"
                    : "hover:bg-[#202222]"
                }`}
              >
                {/* Circular Avatar */}
                <div className="relative w-11 h-11 rounded-full bg-[#242626] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {t.avatarUrl ? (
                    <img
                      src={t.avatarUrl}
                      alt={t.title}
                      className={`w-full h-full ${t.id === "GROUP:ALL" ? "object-contain p-1.5 bg-black" : "object-cover"}`}
                    />
                  ) : (
                    <span
                      className={`text-xs font-mono font-bold ${
                        t.type === "mentions"
                          ? "text-[#c7cb2d] text-sm"
                          : t.type === "dept"
                          ? "text-emerald-400"
                          : "text-[#c7cb2d]"
                      }`}
                    >
                      {t.initials}
                    </span>
                  )}
                </div>

                {/* Top Row: Name + Time | Bottom Row: Last Message Preview + Unread Pill */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-white truncate">
                      {t.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        t.unreadCount > 0 ? "text-[#c7cb2d] font-bold" : "text-zinc-400"
                      }`}
                    >
                      {t.lastTimeLabel || (t.pinned ? "Pinned" : "")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {isSentByMe && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                      )}
                      <p
                        className={`text-xs truncate ${
                          t.unreadCount > 0 ? "text-white font-semibold" : "text-zinc-400"
                        }`}
                      >
                        {previewText}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.pinned && <Pin className="w-3 h-3 text-zinc-500 rotate-45" />}
                      {t.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#25d366] text-black font-mono text-[10px] font-bold flex items-center justify-center">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =======================================================================
          RIGHT PANE: WHATSAPP CONVERSATION VIEW & COMPOSER (8 COLS)
      ======================================================================= */}
      <div className="lg:col-span-8 flex flex-col bg-[#0b141a] h-full overflow-hidden relative">
        {/* Multi-User Broadcast Drawer */}
        {showBroadcastModal && (
          <div className="absolute inset-x-4 top-14 z-30 p-4 rounded-2xl bg-[#1f2428] border border-[#c7cb2d]/50 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#c7cb2d]">
                Broadcast Direct Message ({broadcastCodes.length} selected)
              </span>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {staffList
                .filter((s) => String(s.staff_id || "").toUpperCase() !== myCode)
                .map((s) => {
                  const selected = broadcastCodes.includes(s.staff_id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setBroadcastCodes((prev) =>
                          prev.includes(s.staff_id)
                            ? prev.filter((c) => c !== s.staff_id)
                            : [...prev, s.staff_id]
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer flex items-center gap-1 ${
                        selected
                          ? "bg-[#c7cb2d] text-black font-bold"
                          : "bg-[#2a2f33] text-zinc-300"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {s.first_name} ({s.staff_id})
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {activeThread ? (
          <>
            {/* Active Conversation Top Bar */}
            <div className="px-4 py-2.5 bg-[#161717] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#242626] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {activeThread.avatarUrl ? (
                    <img
                      src={activeThread.avatarUrl}
                      alt={activeThread.title}
                      className={`w-full h-full ${activeThread.id === "GROUP:ALL" ? "object-contain p-1 bg-black" : "object-cover"}`}
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-[#c7cb2d]">
                      {activeThread.initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeThread.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {activeThread.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showInChatSearch && (
                  <input
                    value={inChatSearch}
                    onChange={(e) => setInChatSearch(e.target.value)}
                    placeholder="Find in conversation..."
                    className="bg-[#242626] text-white rounded-full px-3 py-1 text-xs focus:outline-none border border-white/10 w-44"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowInChatSearch((p) => !p);
                    setInChatSearch("");
                  }}
                  className="p-2 rounded-full hover:bg-white/5 text-zinc-300 cursor-pointer"
                  title="Search in conversation"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Message Bubbles Timeline */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            >
              {/* Encryption Banner */}
              <div className="flex justify-center my-1">
                <div className="px-3 py-1 rounded-xl bg-[#182229] border border-white/5 text-[10px] text-amber-200/80 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#c7cb2d]" />
                  <span>Messages and voice notes are internal to Lavie Studios workspace.</span>
                </div>
              </div>

              {activeMessages.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-center px-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#1f2c34] flex items-center justify-center text-[#c7cb2d]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-white">
                    No messages in {activeThread.title} yet
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    Send a message, type <strong className="text-[#c7cb2d]">@</strong> to tag a colleague, or click the microphone to record a voice note.
                  </p>
                </div>
              ) : (
                activeMessages.map((m, idx) => {
                  const isMine = String(m.sender_code || "").toUpperCase() === myCode;
                  const timeStr = m.created_at
                    ? new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "";

                  const isVoiceNote =
                    String(m.attachment_name || "").startsWith("VOICE_NOTE") ||
                    String(m.attachment_url || "").startsWith("data:audio");
                  const isImage =
                    m.attachment_url &&
                    !isVoiceNote &&
                    (String(m.attachment_url).startsWith("data:image") ||
                      /\.(png|jpe?g|webp|gif)$/i.test(String(m.attachment_name || m.attachment_url)));

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`group relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md text-xs ${
                          isMine
                            ? "bg-[#005c4b] text-white rounded-tr-none"
                            : "bg-[#202c33] text-zinc-100 rounded-tl-none"
                        }`}
                      >
                        {/* Sender Name Header (in Group / Dept chats) */}
                        {!isMine && (
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[11px] font-bold text-[#c7cb2d]">
                              {m.sender_name || "Staff"}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400">
                              {m.sender_code} • {m.sender_role}
                            </span>
                          </div>
                        )}

                        {/* Quoted Reply Preview */}
                        {m.reply_preview && (
                          <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-black/25 border-l-2 border-[#c7cb2d] text-[10px] text-zinc-300 truncate">
                            {m.reply_preview}
                          </div>
                        )}

                        {/* Voice Note Player */}
                        {isVoiceNote && m.attachment_url && (
                          <div className="my-1">
                            <audio controls src={m.attachment_url} className="h-8 w-56 max-w-full" />
                          </div>
                        )}

                        {/* Image Attachment */}
                        {isImage && m.attachment_url && (
                          <div className="my-1.5">
                            <img
                              src={m.attachment_url}
                              alt={m.attachment_name || "Attachment"}
                              onClick={() => onPreviewImage && onPreviewImage(m.attachment_url)}
                              className="max-h-52 rounded-xl object-cover cursor-pointer border border-white/10"
                            />
                          </div>
                        )}

                        {/* Document Attachment */}
                        {m.attachment_url && !isVoiceNote && !isImage && (
                          <a
                            href={m.attachment_url}
                            download={m.attachment_name || "attachment"}
                            target="_blank"
                            rel="noreferrer"
                            className="my-1 p-2 rounded-xl bg-black/25 flex items-center gap-2 text-[11px] text-[#c7cb2d] hover:underline"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">{m.attachment_name || "Download File"}</span>
                          </a>
                        )}

                        {/* Message Body + Inline Timestamp & Double Ticks */}
                        <div className="flex items-end justify-between gap-3">
                          <p className="leading-relaxed whitespace-pre-wrap break-words">
                            {renderFormattedChatText(m.content)}
                          </p>
                          <span className="flex items-center gap-1 text-[9px] font-mono text-zinc-300/80 shrink-0 select-none translate-y-0.5">
                            {timeStr}
                            {isMine && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                          </span>
                        </div>

                        {/* Quick Hover Reply Action */}
                        <button
                          type="button"
                          onClick={() => setReplyingTo(m)}
                          title="Reply"
                          className="opacity-0 group-hover:opacity-100 transition absolute -top-2 right-2 p-1 rounded-full bg-[#161717] border border-white/10 text-zinc-300 hover:text-[#c7cb2d] cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* @Mention Autocomplete Popup */}
            {showMentionList && (
              <div className="mx-4 mb-1 p-2 rounded-2xl bg-[#202c33] border border-[#c7cb2d]/40 max-h-36 overflow-y-auto flex flex-wrap gap-1.5 shrink-0">
                {staffList
                  .filter((s) =>
                    `${s.first_name} ${s.last_name} ${s.staff_id}`
                      .toLowerCase()
                      .includes(mentionQuery.toLowerCase())
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => insertStaffMention(s)}
                      className="px-2.5 py-1 rounded-xl bg-[#111b21] hover:bg-[#c7cb2d] hover:text-black text-xs flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <span className="font-semibold">
                        {s.first_name} {s.last_name}
                      </span>
                      <span className="font-mono text-[10px] opacity-75">@{s.staff_id}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Reply / Attachment / Voice Recording Preview Strip */}
            {(replyingTo || chatAttachment || voiceNoteDraft || isRecordingVoice) && (
              <div className="mx-4 mb-1 px-3.5 py-2 rounded-xl bg-[#202c33] border-l-4 border-[#c7cb2d] flex items-center justify-between gap-2 text-xs shrink-0">
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
                    <span className="text-zinc-300 truncate">
                      Replying to <strong className="text-[#c7cb2d]">{replyingTo.sender_name}</strong>:{" "}
                      {replyingTo.content}
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
                  className="text-zinc-400 hover:text-red-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Emoji Picker Bar */}
            {showEmojiPicker && (
              <div className="mx-4 mb-1 p-2 rounded-xl bg-[#202c33] flex flex-wrap gap-2 shrink-0">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setChatInput((prev) => prev + em)}
                    className="text-base hover:scale-125 transition cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom WhatsApp Message Composer Bar */}
            <form
              onSubmit={handleSend}
              className="px-3 py-2.5 bg-[#161717] border-t border-white/10 flex items-center gap-1.5 shrink-0"
            >
              <input
                ref={chatFileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xlsx,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker((p) => !p)}
                className="p-2 rounded-full text-zinc-400 hover:text-[#c7cb2d] hover:bg-white/5 cursor-pointer"
                title="Emojis"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => chatFileRef.current?.click()}
                className="p-2 rounded-full text-zinc-400 hover:text-[#c7cb2d] hover:bg-white/5 cursor-pointer"
                title="Attach Image or Document"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMentionList((p) => !p);
                  setMentionQuery("");
                }}
                className="p-2 rounded-full text-zinc-400 hover:text-[#c7cb2d] hover:bg-white/5 cursor-pointer"
                title="Tag Staff (@)"
              >
                <AtSign className="w-4 h-4" />
              </button>

              <input
                value={chatInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Message ${activeThread.title} (type @ to tag)...`}
                className="flex-1 bg-[#242626] text-white placeholder:text-zinc-400 rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#c7cb2d]"
              />

              {!chatInput.trim() && !chatAttachment && !voiceNoteDraft ? (
                !isRecordingVoice ? (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-2.5 rounded-full bg-[#242626] text-zinc-300 hover:text-[#c7cb2d] cursor-pointer"
                    title="Record Voice Note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="p-2.5 rounded-full bg-red-500 text-white animate-pulse cursor-pointer"
                    title="Stop Recording"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  disabled={sending}
                  className="p-2.5 rounded-full bg-[#c7cb2d] text-black font-bold hover:brightness-110 transition cursor-pointer"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <img src="/logo-light.svg" alt="Lavie Studios" className="h-10 opacity-40 mb-4" />
            <h3 className="font-display text-lg font-bold text-white/80">
              Lavie Studios Messenger
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select a conversation on the left to start messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
