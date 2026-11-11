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
  ArrowLeft,
  FolderPlus,
  UserPlus,
  Shield,
  Edit3,
  Archive,
  Trash2,
  RotateCcw,
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

export interface CustomChatGroup {
  id: string;
  name: string;
  description?: string;
  memberCodes: string[];
  adminCodes?: string[];
  archived?: boolean;
  createdBy: string;
  createdAt: string;
}

const CUSTOM_GROUPS_STORAGE_KEY = "lavie_custom_chat_groups_v1";

export function getSavedCustomGroups(): CustomChatGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_GROUPS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function computeTotalUnreadChatCount(messages: any[], currentUser: any): number {
  if (typeof window === "undefined" || !currentUser?.staff_id || !Array.isArray(messages)) {
    return 0;
  }
  const myCode = String(currentUser.staff_id || "").toUpperCase().trim();
  const myFirst = String(currentUser.first_name || "").toLowerCase().trim();
  const myDept = String(currentUser.department || "").trim();
  if (!myCode) return 0;

  let readMap: Record<string, number> = {};
  try {
    readMap = JSON.parse(window.localStorage.getItem(`lavie_wa_read_${myCode}`) || "{}");
  } catch (_) {}

  const customGroups = getSavedCustomGroups().filter(
    (g) => !g.archived && (g.memberCodes || []).map((c) => c.toUpperCase()).includes(myCode)
  );

  let totalUnread = 0;

  for (const m of messages) {
    if (!m) continue;
    const senderCode = String(m.sender_code || "").toUpperCase().trim();
    if (!senderCode || senderCode === myCode) continue;

    const msgTime = m.created_at ? new Date(m.created_at).getTime() : 0;
    const recip = String(m.recipient_code || "").trim();
    const content = String(m.content || "");

    let threadId: string | null = null;

    if (m.channel_type === "direct" && recip.toUpperCase() === myCode) {
      threadId = `DM:${senderCode}`;
    } else if (recip.startsWith("CUSTOM_GRP:")) {
      const parts = recip.replace("CUSTOM_GRP:", "").split("|");
      const gid = parts[0];
      const memberStr = (parts[2] || "").toUpperCase();
      const inCustom =
        memberStr.includes(myCode) || customGroups.some((g) => g.id === gid);
      if (inCustom) threadId = `CUSTOM:${gid}`;
    } else if (recip.startsWith("DEPT:")) {
      if (myDept && recip.includes(myDept)) {
        threadId = `DEPT:${myDept}`;
      }
    } else if (m.channel_type === "group" && (recip === "All Staff" || !recip)) {
      threadId = "GROUP:ALL";
    }

    const isMentioned =
      content.toUpperCase().includes(myCode) ||
      (myFirst && content.toLowerCase().includes(`@${myFirst}`));

    if (threadId) {
      const lastRead = readMap[threadId] || 0;
      if (msgTime > lastRead) {
        totalUnread += 1;
        continue;
      }
    }

    if (isMentioned) {
      const lastReadMentions = readMap["MENTIONS:ME"] || 0;
      if (msgTime > lastReadMentions) {
        totalUnread += 1;
      }
    }
  }

  return totalUnread;
}

interface WhatsAppWorkplaceChatProps {
  currentUser: any;
  staffList: any[];
  messages: any[];
  onRefreshMessages?: () => void;
  onPreviewImage?: (url: string) => void;
}

type ThreadItem = {
  id: string;
  type: "group" | "dept" | "custom_group" | "direct" | "mentions";
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  initials: string;
  targetCode: string;
  memberCodes?: string[];
  adminCodes?: string[];
  createdBy?: string;
  archived?: boolean;
  departmentName?: string;
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

  const [activeThreadId, setActiveThreadId] = React.useState<string>("GROUP:ALL");
  const [mobilePane, setMobilePane] = React.useState<"list" | "chat">("list");

  const [sidebarFilter, setSidebarFilter] = React.useState<
    "all" | "unread" | "groups" | "direct" | "mentions" | "archived"
  >("all");
  const [sidebarSearch, setSidebarSearch] = React.useState("");
  const [inChatSearch, setInChatSearch] = React.useState("");
  const [showInChatSearch, setShowInChatSearch] = React.useState(false);

  // Group Members & Admin Controls Drawer state
  const [showMembersDrawer, setShowMembersDrawer] = React.useState(false);
  const [editingGroupMeta, setEditingGroupMeta] = React.useState(false);
  const [editGroupNameVal, setEditGroupNameVal] = React.useState("");
  const [editGroupDescVal, setEditGroupDescVal] = React.useState("");

  // "+" Action Modal: "custom_group" (Create Project Group) or "broadcast" (Multi-DM)
  const [showPlusModal, setShowPlusModal] = React.useState(false);
  const [plusModalTab, setPlusModalTab] = React.useState<"custom_group" | "broadcast">("custom_group");
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupDesc, setNewGroupDesc] = React.useState("");
  const [newGroupMembers, setNewGroupMembers] = React.useState<string[]>([]);
  const [broadcastCodes, setBroadcastCodes] = React.useState<string[]>([]);

  // Custom Project Groups state
  const [customGroups, setCustomGroups] = React.useState<CustomChatGroup[]>(() =>
    getSavedCustomGroups()
  );

  const persistCustomGroupsList = React.useCallback(
    async (nextGroups: CustomChatGroup[]) => {
      setCustomGroups(nextGroups);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(nextGroups));
        } catch (_) {}
      }
      try {
        await supabase.from("site_settings").upsert(
          {
            key: "studio_custom_chat_groups",
            value: JSON.stringify(nextGroups),
          },
          { onConflict: "key" }
        );
      } catch (_) {}
    },
    [supabase]
  );

  // Load Custom Groups from Supabase site_settings on mount
  React.useEffect(() => {
    let mounted = true;
    async function loadCustomGroupsFromDb() {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "studio_custom_chat_groups")
          .maybeSingle();
        if (data?.value && mounted) {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed)) {
            setCustomGroups((prev) => {
              const map = new Map<string, CustomChatGroup>();
              for (const g of [...prev, ...parsed]) {
                if (g && g.id) map.set(g.id, g);
              }
              const merged = Array.from(map.values());
              try {
                window.localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(merged));
              } catch (_) {}
              return merged;
            });
          }
        }
      } catch (_) {}
    }
    loadCustomGroupsFromDb();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Auto-discover custom groups embedded in incoming messages
  React.useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;
    let discoveredNew = false;
    const map = new Map<string, CustomChatGroup>();
    for (const g of customGroups) {
      if (g?.id) map.set(g.id, g);
    }
    for (const m of messages) {
      const r = String(m?.recipient_code || "");
      if (r.startsWith("CUSTOM_GRP:")) {
        const parts = r.replace("CUSTOM_GRP:", "").split("|");
        const gid = parts[0];
        const gName = parts[1] || "Project Group";
        const gCodes = (parts[2] || "")
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean);
        if (gid && !map.has(gid)) {
          discoveredNew = true;
          map.set(gid, {
            id: gid,
            name: gName,
            description: "Custom Project Group",
            memberCodes: gCodes,
            adminCodes: [String(m.sender_code || "LS-01").toUpperCase()],
            createdBy: String(m.sender_code || "LS-01").toUpperCase(),
            createdAt: m.created_at || new Date().toISOString(),
          });
        }
      }
    }
    if (discoveredNew) {
      const next = Array.from(map.values());
      setCustomGroups(next);
      try {
        window.localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
    }
  }, [messages, customGroups]);

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

  const [lastReadMap, setLastReadMap] = React.useState<Record<string, number>>(() => {
    if (typeof window !== "undefined" && myCode) {
      try {
        return JSON.parse(window.localStorage.getItem(`lavie_wa_read_${myCode}`) || "{}");
      } catch (_) {}
    }
    return {};
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || !myCode) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(`lavie_wa_read_${myCode}`) || "{}");
      setLastReadMap(saved);
    } catch (_) {}
  }, [myCode]);

  const markThreadAsRead = React.useCallback(
    (threadId: string) => {
      if (!myCode) return;
      setLastReadMap((prev) => {
        const next = { ...prev, [threadId]: Date.now() };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(`lavie_wa_read_${myCode}`, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("lavie:chat-read-updated"));
          } catch (_) {}
        }
        return next;
      });
    },
    [myCode]
  );

  React.useEffect(() => {
    if (activeThreadId) {
      markThreadAsRead(activeThreadId);
    }
  }, [activeThreadId, messages.length, markThreadAsRead]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const applyDeepLink = (searchStr: string) => {
      const params = new URLSearchParams(searchStr);
      const mode = params.get("mode");
      const target = params.get("target");
      if (mode === "direct" && target) {
        const tid = `DM:${target.toUpperCase()}`;
        setActiveThreadId(tid);
        setMobilePane("chat");
        markThreadAsRead(tid);
      } else if (mode === "mentions") {
        setActiveThreadId("MENTIONS:ME");
        setMobilePane("chat");
        markThreadAsRead("MENTIONS:ME");
      } else if (mode === "group") {
        setActiveThreadId("GROUP:ALL");
        setMobilePane("chat");
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
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const threads: ThreadItem[] = React.useMemo(() => {
    const list: ThreadItem[] = [];

    const summarizeThread = (
      id: string,
      predicate: (m: any) => boolean
    ): { lastMessage?: any; lastTimeMs: number; lastTimeLabel: string; unreadCount: number } => {
      const matching = (messages || [])
        .filter(predicate)
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
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

    const allStaffCodes = (staffList || []).map((s) => String(s.staff_id || "").toUpperCase()).filter(Boolean);
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
      memberCodes: allStaffCodes,
      adminCodes: ["LS-01", "LS-03"],
      pinned: true,
      ...allStaffStats,
    });

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
      memberCodes: allStaffCodes,
      pinned: true,
      ...mentionStats,
    });

    for (const cg of customGroups) {
      const normMembers = Array.from(
        new Set((cg.memberCodes || []).map((c) => String(c).toUpperCase().trim()).filter(Boolean))
      );
      const normAdmins = Array.from(
        new Set(
          [cg.createdBy || "LS-01", "LS-01", ...(cg.adminCodes || [])].map((c) =>
            String(c).toUpperCase().trim()
          )
        )
      );
      const isMember = normMembers.includes(myCode) || normAdmins.includes(myCode) || myCode === "LS-01";
      if (!isMember) continue;

      const id = `CUSTOM:${cg.id}`;
      const cgStats = summarizeThread(id, (m) =>
        String(m.recipient_code || "").startsWith(`CUSTOM_GRP:${cg.id}|`) ||
        String(m.recipient_code || "") === `CUSTOM_GRP:${cg.id}`
      );
      const encodedRecipient = `CUSTOM_GRP:${cg.id}|${cg.name}|${normMembers.join(",")}`;
      list.push({
        id,
        type: "custom_group",
        title: cg.name,
        subtitle: `${cg.description || "Project Group"} • ${normMembers.length} members`,
        initials:
          cg.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0] || "")
            .join("")
            .toUpperCase() || "PG",
        targetCode: encodedRecipient,
        memberCodes: normMembers,
        adminCodes: normAdmins,
        createdBy: cg.createdBy,
        archived: !!cg.archived,
        pinned: !cg.archived,
        ...cgStats,
      });
    }

    for (const dept of STUDIO_DEPARTMENTS) {
      const id = `DEPT:${dept}`;
      const deptMembers = (staffList || [])
        .filter((s) => String(s.department || "").toLowerCase() === dept.toLowerCase())
        .map((s) => String(s.staff_id || "").toUpperCase());

      const deptStats = summarizeThread(id, (m) => String(m.recipient_code || "").includes(dept));
      if (
        dept === currentUser?.department ||
        deptStats.lastMessage ||
        sidebarFilter === "groups" ||
        myCode === "LS-01"
      ) {
        list.push({
          id,
          type: "dept",
          title: dept,
          subtitle: `Department Group • ${deptMembers.length} members`,
          initials: dept
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join(""),
          targetCode: `DEPT: ${dept}`,
          departmentName: dept,
          memberCodes: deptMembers,
          adminCodes: ["LS-01", "LS-03"],
          ...deptStats,
        });
      }
    }

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
        memberCodes: [myCode, code],
        ...dmStats,
      });
    }

    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (b.lastTimeMs !== a.lastTimeMs) return b.lastTimeMs - a.lastTimeMs;
      return a.title.localeCompare(b.title);
    });
  }, [
    messages,
    staffList,
    customGroups,
    myCode,
    myFirst,
    currentUser,
    lastReadMap,
    activeThreadId,
    sidebarFilter,
  ]);

  const totalUnreadAcrossThreads = React.useMemo(
    () => threads.filter((t) => !t.archived).reduce((sum, t) => sum + (t.unreadCount || 0), 0),
    [threads]
  );

  const visibleThreads = threads.filter((t) => {
    if (sidebarFilter === "archived") return !!t.archived;
    if (t.archived) return false;
    if (sidebarFilter === "unread" && t.unreadCount <= 0) return false;
    if (
      sidebarFilter === "groups" &&
      t.type !== "group" &&
      t.type !== "dept" &&
      t.type !== "custom_group"
    )
      return false;
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

  // Check if currentUser is an Admin of the active thread
  const isCurrentUserGroupAdmin = React.useMemo(() => {
    if (!activeThread) return false;
    if (
      myCode === "LS-01" ||
      currentUser?.role === "super_admin" ||
      currentUser?.role === "executive" ||
      String(currentUser?.hierarchy_level || "").startsWith("L7")
    ) {
      return true;
    }
    if (activeThread.type === "custom_group") {
      return (
        String(activeThread.createdBy || "").toUpperCase() === myCode ||
        (activeThread.adminCodes || []).includes(myCode)
      );
    }
    return false;
  }, [activeThread, myCode, currentUser]);

  // Compute the exact list of Staff Member objects belonging to the currently active thread
  const activeThreadMemberProfiles = React.useMemo(() => {
    if (!activeThread) return staffList || [];
    if (activeThread.type === "dept" && activeThread.departmentName) {
      return (staffList || []).filter(
        (s) =>
          String(s.department || "").trim().toLowerCase() ===
          activeThread.departmentName!.trim().toLowerCase()
      );
    }
    if (activeThread.type === "custom_group" && Array.isArray(activeThread.memberCodes)) {
      const allowed = new Set(activeThread.memberCodes.map((c) => c.toUpperCase()));
      return (staffList || []).filter((s) =>
        allowed.has(String(s.staff_id || "").toUpperCase().trim())
      );
    }
    if (activeThread.type === "direct") {
      return (staffList || []).filter((s) => {
        const c = String(s.staff_id || "").toUpperCase().trim();
        return c === activeThread.targetCode.toUpperCase() || c === myCode;
      });
    }
    return staffList || [];
  }, [activeThread, staffList, myCode]);

  // Strictly scope @mention autocomplete to members of the active department or group
  const taggableStaffForActiveThread = React.useMemo(() => {
    return activeThreadMemberProfiles.filter((s) => {
      if (!mentionQuery.trim()) return true;
      return `${s.first_name || ""} ${s.last_name || ""} ${s.staff_id || ""} ${s.job_title || ""}`
        .toLowerCase()
        .includes(mentionQuery.toLowerCase());
    });
  }, [activeThreadMemberProfiles, mentionQuery]);

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
      if (activeThread.type === "custom_group") {
        const gid = activeThread.id.replace("CUSTOM:", "");
        return (
          String(m.recipient_code || "").startsWith(`CUSTOM_GRP:${gid}|`) ||
          String(m.recipient_code || "") === `CUSTOM_GRP:${gid}`
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

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, activeMessages.length]);

  const handleSelectThread = (t: ThreadItem) => {
    setActiveThreadId(t.id);
    setMobilePane("chat");
    setShowMembersDrawer(false);
    setEditingGroupMeta(false);
    markThreadAsRead(t.id);
    setReplyingTo(null);
  };

  // Create a new Custom Project Group
  const handleCreateCustomGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const uniqueMembers = Array.from(
      new Set([myCode, ...newGroupMembers.map((c) => c.toUpperCase().trim())])
    ).filter(Boolean);

    const newGrp: CustomChatGroup = {
      id: "grp-" + Date.now().toString(36),
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || "Project Collaboration Group",
      memberCodes: uniqueMembers,
      adminCodes: [myCode],
      archived: false,
      createdBy: myCode,
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [newGrp, ...customGroups];
    await persistCustomGroupsList(updatedGroups);

    const encodedTarget = `CUSTOM_GRP:${newGrp.id}|${newGrp.name}|${uniqueMembers.join(",")}`;
    try {
      await supabase.from("studio_messages").insert({
        sender_id: currentUser?.id || null,
        sender_name: myFullName,
        sender_code: myCode,
        sender_role: currentUser?.job_title || "Staff",
        channel_type: "group",
        recipient_code: encodedTarget,
        content: `📌 Created project group "${newGrp.name}" with ${uniqueMembers.length} members (${uniqueMembers.join(", ")}).`,
      });

      const otherMembers = uniqueMembers.filter((c) => c !== myCode);
      if (otherMembers.length > 0) {
        triggerPushNotification({
          title: `👥 Added to project group "${newGrp.name}"`,
          message: `${myFullName} added you to "${newGrp.name}"`,
          url: "https://studioslavie.com/admin?tab=chat",
          targetType: "staff_codes",
          staffCodes: otherMembers,
        });
      }
    } catch (_) {}

    setNewGroupName("");
    setNewGroupDesc("");
    setNewGroupMembers([]);
    setShowPlusModal(false);
    setActiveThreadId(`CUSTOM:${newGrp.id}`);
    setMobilePane("chat");
    if (onRefreshMessages) onRefreshMessages();
  };

  // GROUP ADMIN ACTION 1: Rename / Update Custom Group Description
  const handleSaveCustomGroupMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || activeThread.type !== "custom_group" || !editGroupNameVal.trim()) return;
    const gid = activeThread.id.replace("CUSTOM:", "");
    const updated = customGroups.map((g) =>
      g.id === gid
        ? { ...g, name: editGroupNameVal.trim(), description: editGroupDescVal.trim() }
        : g
    );
    await persistCustomGroupsList(updated);
    setEditingGroupMeta(false);
  };

  // GROUP ADMIN ACTION 2: Add or Remove Member in Custom Group
  const handleToggleMemberInActiveCustomGroup = async (staffCode: string) => {
    if (!activeThread || activeThread.type !== "custom_group" || !isCurrentUserGroupAdmin) return;
    const gid = activeThread.id.replace("CUSTOM:", "");
    const targetCode = staffCode.toUpperCase().trim();

    const updatedGroups = customGroups.map((g) => {
      if (g.id !== gid) return g;
      const exists = g.memberCodes.includes(targetCode);
      const nextCodes = exists
        ? g.memberCodes.filter((c) => c !== targetCode)
        : [...g.memberCodes, targetCode];
      return { ...g, memberCodes: nextCodes };
    });

    await persistCustomGroupsList(updatedGroups);
  };

  // GROUP ADMIN ACTION 3: Promote or Demote Co-Admin in Custom Group
  const handleToggleGroupAdminRole = async (staffCode: string) => {
    if (!activeThread || activeThread.type !== "custom_group" || !isCurrentUserGroupAdmin) return;
    const gid = activeThread.id.replace("CUSTOM:", "");
    const targetCode = staffCode.toUpperCase().trim();

    const updatedGroups = customGroups.map((g) => {
      if (g.id !== gid) return g;
      const currAdmins = Array.isArray(g.adminCodes) ? g.adminCodes : [g.createdBy || "LS-01"];
      const isAlreadyAdmin = currAdmins.includes(targetCode);
      const nextAdmins = isAlreadyAdmin
        ? currAdmins.filter((c) => c !== targetCode)
        : [...currAdmins, targetCode];
      return { ...g, adminCodes: nextAdmins };
    });

    await persistCustomGroupsList(updatedGroups);
  };

  // GROUP ADMIN ACTION 4: Archive / Unarchive Custom Project Group
  const handleToggleArchiveCustomGroup = async () => {
    if (!activeThread || activeThread.type !== "custom_group" || !isCurrentUserGroupAdmin) return;
    const gid = activeThread.id.replace("CUSTOM:", "");
    const nextArchivedState = !activeThread.archived;
    const updatedGroups = customGroups.map((g) =>
      g.id === gid ? { ...g, archived: nextArchivedState } : g
    );
    await persistCustomGroupsList(updatedGroups);
    setShowMembersDrawer(false);
    if (nextArchivedState) {
      setActiveThreadId("GROUP:ALL");
    }
  };

  // GROUP ADMIN ACTION 5: Delete Custom Project Group
  const handleDeleteCustomGroup = async () => {
    if (!activeThread || activeThread.type !== "custom_group" || !isCurrentUserGroupAdmin) return;
    const gid = activeThread.id.replace("CUSTOM:", "");
    const updatedGroups = customGroups.filter((g) => g.id !== gid);
    await persistCustomGroupsList(updatedGroups);
    setShowMembersDrawer(false);
    setActiveThreadId("GROUP:ALL");
  };

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
      if (showPlusModal && plusModalTab === "broadcast" && broadcastCodes.length > 0) {
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
        setShowPlusModal(false);
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
      } else if (activeThread.type === "custom_group") {
        await supabase.from("studio_messages").insert({
          ...baseMsg,
          channel_type: "group",
          recipient_code: activeThread.targetCode,
        });
        const otherMembers = (activeThread.memberCodes || []).filter((c) => c !== myCode);
        if (otherMembers.length > 0) {
          triggerPushNotification({
            title: `👥 ${myFullName} → ${activeThread.title}`,
            message: contentText.slice(0, 90),
            url: "https://studioslavie.com/admin?tab=chat",
            targetType: "staff_codes",
            staffCodes: otherMembers,
          });
        }
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

  const archivedCount = threads.filter((t) => t.archived).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#111315] border border-[var(--border-subtle)]/70 shadow-2xl h-[540px] sm:h-[610px] lg:h-[660px] relative">
      {/* =======================================================================
          LEFT PANE: WHATSAPP-STYLE UNIFIED CONVERSATION LIST
      ======================================================================= */}
      <div
        className={`${
          mobilePane === "chat" ? "hidden lg:flex" : "flex"
        } lg:col-span-4 flex-col bg-[#161717] border-r border-white/10 h-full overflow-hidden`}
      >
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm sm:text-base font-bold text-white tracking-tight">
              Chats
            </h2>
            {totalUnreadAcrossThreads > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-[#25d366] text-black font-mono text-[10px] font-bold">
                {totalUnreadAcrossThreads} unread
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 font-mono text-[10px]">
                0 unread
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPlusModal((p) => !p);
              setPlusModalTab("custom_group");
            }}
            title="Create Custom Project Group or Broadcast Message"
            className="px-2.5 py-1 rounded-full bg-[#c7cb2d] text-black text-[10px] font-bold flex items-center gap-1 hover:brightness-110 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Group</span>
          </button>
        </div>

        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search chats, groups, or colleagues..."
              className="w-full bg-[#242626] text-white placeholder:text-zinc-400 rounded-full pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#c7cb2d]"
            />
          </div>
        </div>

        <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border-b border-white/5">
          {[
            { id: "all", label: "All" },
            {
              id: "unread",
              label: totalUnreadAcrossThreads > 0 ? `Unread (${totalUnreadAcrossThreads})` : "Unread",
            },
            { id: "groups", label: "Groups" },
            { id: "direct", label: "Direct" },
            { id: "mentions", label: "@Tagged" },
            ...(archivedCount > 0 ? [{ id: "archived", label: `Archived (${archivedCount})` }] : []),
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSidebarFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                sidebarFilter === f.id
                  ? "bg-[#c7cb2d] text-black font-bold"
                  : "bg-[#242626] text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {visibleThreads.map((t) => {
            const isSelected = activeThread?.id === t.id;
            const lastMsg = t.lastMessage;
            const isSentByMe =
              lastMsg && String(lastMsg.sender_code || "").toUpperCase() === myCode;

            let previewText = t.subtitle;
            if (lastMsg) {
              const rawContent = lastMsg.content || "📎 Attachment";
              if (
                t.type === "group" ||
                t.type === "dept" ||
                t.type === "custom_group" ||
                t.type === "mentions"
              ) {
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
                className={`w-full px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 text-left transition cursor-pointer ${
                  isSelected ? "bg-[#2a2c2c]" : "hover:bg-[#202222]"
                }`}
              >
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#242626] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {t.avatarUrl ? (
                    <img
                      src={t.avatarUrl}
                      alt={t.title}
                      className={`w-full h-full ${
                        t.id === "GROUP:ALL" ? "object-contain p-1.5 bg-black" : "object-cover"
                      }`}
                    />
                  ) : (
                    <span
                      className={`text-xs font-mono font-bold ${
                        t.type === "mentions"
                          ? "text-[#c7cb2d] text-sm"
                          : t.type === "custom_group"
                          ? "text-amber-300"
                          : t.type === "dept"
                          ? "text-emerald-400"
                          : "text-[#c7cb2d]"
                      }`}
                    >
                      {t.initials}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-[13px] font-bold text-white truncate">
                        {t.title}
                      </span>
                      {t.type === "custom_group" && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[8px] uppercase shrink-0">
                          Project
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        t.unreadCount > 0 ? "text-[#25d366] font-bold" : "text-zinc-400"
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
                        className={`text-[11px] sm:text-xs truncate ${
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
          RIGHT PANE: WHATSAPP CONVERSATION VIEW, GROUP ADMIN DRAWER & COMPOSER
      ======================================================================= */}
      <div
        className={`${
          mobilePane === "list" ? "hidden lg:flex" : "flex"
        } lg:col-span-8 flex-col bg-[#0b141a] h-full overflow-hidden relative`}
      >
        {showPlusModal && (
          <div className="absolute inset-x-3 top-12 sm:inset-x-6 sm:top-14 z-40 p-4 rounded-2xl bg-[#1c2226] border border-[#c7cb2d]/60 shadow-2xl space-y-3 max-h-[82%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlusModalTab("custom_group")}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                    plusModalTab === "custom_group"
                      ? "bg-[#c7cb2d] text-black"
                      : "bg-[#2a2f33] text-zinc-300"
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Create Project Group
                </button>
                <button
                  type="button"
                  onClick={() => setPlusModalTab("broadcast")}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                    plusModalTab === "broadcast"
                      ? "bg-[#c7cb2d] text-black"
                      : "bg-[#2a2f33] text-zinc-300"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Multi-User DM
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowPlusModal(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {plusModalTab === "custom_group" ? (
              <form onSubmit={handleCreateCustomGroup} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                      Custom Group / Project Name *
                    </label>
                    <input
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. OCH 5.0 Production Squad"
                      className="w-full bg-[#111315] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c7cb2d]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                      Project Brief / Purpose
                    </label>
                    <input
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      placeholder="e.g. Stage fabrication & LED screen sync"
                      className="w-full bg-[#111315] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c7cb2d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5">
                    Select Project Group Members ({newGroupMembers.length + 1} including you)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-[#111315] border border-white/5">
                    {staffList
                      .filter((s) => String(s.staff_id || "").toUpperCase() !== myCode)
                      .map((s) => {
                        const code = String(s.staff_id || "").toUpperCase();
                        const selected = newGroupMembers.includes(code);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setNewGroupMembers((prev) =>
                                prev.includes(code)
                                  ? prev.filter((c) => c !== code)
                                  : [...prev, code]
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition ${
                              selected
                                ? "bg-[#c7cb2d] text-black font-bold"
                                : "bg-[#242626] text-zinc-300 hover:text-white"
                            }`}
                          >
                            {selected && <Check className="w-3 h-3" />}
                            <span>
                              {s.first_name} {s.last_name}
                            </span>
                            <span className="font-mono text-[9px] opacity-75">({code})</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPlusModal(false)}
                    className="px-3.5 py-1.5 rounded-full bg-white/5 text-xs text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer"
                  >
                    Create Project Group
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-zinc-300">
                  Select multiple colleagues below, then type and send your message in the bottom bar:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
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
          </div>
        )}

        {activeThread ? (
          <>
            {/* Active Conversation Top Bar */}
            <div className="px-3 sm:px-4 py-2.5 bg-[#161717] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobilePane("list")}
                  className="lg:hidden p-1.5 rounded-full bg-[#242626] text-zinc-200 hover:text-[#c7cb2d] cursor-pointer shrink-0 flex items-center gap-1"
                  title="Back to Chats"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {totalUnreadAcrossThreads > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#25d366] text-black font-mono text-[9px] font-bold">
                      {totalUnreadAcrossThreads}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMembersDrawer((p) => !p)}
                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
                  title="Click to view group members & admin controls"
                >
                  <div className="w-9 h-9 rounded-full bg-[#242626] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {activeThread.avatarUrl ? (
                      <img
                        src={activeThread.avatarUrl}
                        alt={activeThread.title}
                        className={`w-full h-full ${
                          activeThread.id === "GROUP:ALL"
                            ? "object-contain p-1 bg-black"
                            : "object-cover"
                        }`}
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold text-[#c7cb2d]">
                        {activeThread.initials}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#c7cb2d] transition truncate">
                        {activeThread.title}
                      </h3>
                      {isCurrentUserGroupAdmin && activeThread.type === "custom_group" && (
                        <span className="px-1.5 py-0.2 rounded bg-[#c7cb2d]/15 text-[#c7cb2d] font-mono text-[8px] font-bold uppercase shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                      {activeThread.type === "dept" ||
                      activeThread.type === "custom_group" ||
                      activeThread.type === "group"
                        ? `${activeThreadMemberProfiles.length} members • Tap for group info & controls`
                        : activeThread.subtitle}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {showInChatSearch && (
                  <input
                    value={inChatSearch}
                    onChange={(e) => setInChatSearch(e.target.value)}
                    placeholder="Find message..."
                    className="bg-[#242626] text-white rounded-full px-3 py-1 text-xs focus:outline-none border border-white/10 w-32 sm:w-44"
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

                {activeThread.type !== "direct" && (
                  <button
                    type="button"
                    onClick={() => setShowMembersDrawer((p) => !p)}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      showMembersDrawer
                        ? "bg-[#c7cb2d] text-black font-bold"
                        : "bg-[#242626] text-zinc-200 hover:text-[#c7cb2d]"
                    }`}
                    title="View Members & Group Admin Controls"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      Members ({activeThreadMemberProfiles.length})
                    </span>
                    <span className="sm:hidden">{activeThreadMemberProfiles.length}</span>
                  </button>
                )}
              </div>
            </div>

            {/* SLIDE-OVER GROUP MEMBERS & ADMIN CONTROLS DRAWER */}
            {showMembersDrawer && (
              <div className="absolute right-0 top-14 bottom-0 w-72 sm:w-80 bg-[#161717] border-l border-white/10 z-30 flex flex-col shadow-2xl animate-in slide-in-from-right-4">
                <div className="p-3.5 border-b border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {activeThread.title} ({activeThreadMemberProfiles.length})
                      </h4>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {activeThread.type === "dept"
                          ? "Only members of this department can be @tagged here."
                          : activeThread.type === "custom_group"
                          ? activeThread.subtitle
                          : "All active studio members"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {activeThread.type === "custom_group" && isCurrentUserGroupAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupMeta((p) => !p);
                            setEditGroupNameVal(activeThread.title);
                            setEditGroupDescVal(
                              (activeThread.subtitle || "").split(" • ")[0] || ""
                            );
                          }}
                          title="Edit Group Name & Brief"
                          className="p-1.5 rounded-lg bg-[#242626] text-[#c7cb2d] hover:bg-[#c7cb2d] hover:text-black cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowMembersDrawer(false)}
                        className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* INLINE GROUP ADMIN EDIT FORM (Rename / Update Brief) */}
                  {editingGroupMeta && activeThread.type === "custom_group" && (
                    <form onSubmit={handleSaveCustomGroupMeta} className="pt-1 space-y-2">
                      <input
                        required
                        value={editGroupNameVal}
                        onChange={(e) => setEditGroupNameVal(e.target.value)}
                        placeholder="Group Name"
                        className="w-full bg-[#111315] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        value={editGroupDescVal}
                        onChange={(e) => setEditGroupDescVal(e.target.value)}
                        placeholder="Project Brief / Description"
                        className="w-full bg-[#111315] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingGroupMeta(false)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-zinc-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black text-[10px] font-bold cursor-pointer"
                        >
                          Save Info
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Member Roster with Admin Badges & Role Controls */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
                  {activeThreadMemberProfiles.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-8 text-center">
                      No staff members assigned to this group yet.
                    </p>
                  ) : (
                    activeThreadMemberProfiles.map((member) => {
                      const mCode = String(member.staff_id || "").toUpperCase();
                      const isMeMember = mCode === myCode;
                      const isMemberAdmin =
                        mCode === "LS-01" ||
                        (activeThread.adminCodes || []).includes(mCode) ||
                        String(activeThread.createdBy || "").toUpperCase() === mCode;

                      return (
                        <div
                          key={member.id || mCode}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-white/[0.03] rounded-xl"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#242626] overflow-hidden flex items-center justify-center text-[10px] font-mono font-bold text-[#c7cb2d] shrink-0">
                              {member.passport_url ? (
                                <img
                                  src={member.passport_url}
                                  alt={member.first_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                `${member.first_name?.[0] || "S"}${member.last_name?.[0] || ""}`
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold text-white truncate">
                                  {member.first_name} {member.last_name}
                                </p>
                                {isMeMember && (
                                  <span className="text-[9px] font-mono text-[#c7cb2d]">(You)</span>
                                )}
                                {isMemberAdmin && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#c7cb2d]/20 text-[#c7cb2d] font-mono text-[8px] font-bold uppercase shrink-0">
                                    ★ Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-400 truncate">
                                {member.job_title || member.department} •{" "}
                                <span className="font-mono text-[#c7cb2d]">{mCode}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isMeMember && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    insertStaffMention(member);
                                    setShowMembersDrawer(false);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#242626] hover:bg-[#c7cb2d] hover:text-black text-[10px] font-mono font-bold text-[#c7cb2d] cursor-pointer"
                                  title="Tag in this chat"
                                >
                                  @Tag
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowMembersDrawer(false);
                                    setActiveThreadId(`DM:${mCode}`);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 cursor-pointer"
                                  title="Open 1:1 Direct Chat"
                                >
                                  DM
                                </button>
                              </>
                            )}
                            {activeThread.type === "custom_group" &&
                              isCurrentUserGroupAdmin &&
                              !isMeMember &&
                              mCode !== "LS-01" && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleGroupAdminRole(mCode)}
                                  title={
                                    isMemberAdmin ? "Remove Group Admin Role" : "Make Group Admin"
                                  }
                                  className={`p-1 rounded-lg cursor-pointer ${
                                    isMemberAdmin
                                      ? "bg-[#c7cb2d] text-black"
                                      : "bg-white/5 text-zinc-400 hover:text-[#c7cb2d]"
                                  }`}
                                >
                                  <Shield className="w-3 h-3" />
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* GROUP ADMIN PANEL FOR CUSTOM PROJECT GROUPS */}
                {activeThread.type === "custom_group" && isCurrentUserGroupAdmin && (
                  <div className="p-3 border-t border-white/10 bg-[#111315] space-y-2.5">
                    <p className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Group Admin Controls
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {staffList.map((s) => {
                        const code = String(s.staff_id || "").toUpperCase();
                        const inGroup = (activeThread.memberCodes || []).includes(code);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleToggleMemberInActiveCustomGroup(code)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer ${
                              inGroup
                                ? "bg-[#c7cb2d] text-black font-bold"
                                : "bg-[#242626] text-zinc-400 hover:text-white"
                            }`}
                          >
                            {inGroup ? "✓ " : "+ "}
                            {s.first_name} ({code})
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleToggleArchiveCustomGroup}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {activeThread.archived ? (
                          <>
                            <RotateCcw className="w-3 h-3" /> Unarchive Group
                          </>
                        ) : (
                          <>
                            <Archive className="w-3 h-3" /> Archive Group
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteCustomGroup}
                        className="py-1.5 px-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                        title="Delete Project Group"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Message Bubbles Timeline */}
            <div
              className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2.5"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            >
              <div className="flex justify-center my-1">
                <div className="px-3 py-1 rounded-xl bg-[#182229] border border-white/5 text-[10px] text-amber-200/80 flex items-center gap-1.5 text-center">
                  <Lock className="w-3 h-3 text-[#c7cb2d] shrink-0" />
                  <span>
                    {activeThread.type === "dept"
                      ? `${activeThread.title} Channel — @tagging is scoped to ${activeThreadMemberProfiles.length} department members.`
                      : activeThread.type === "custom_group"
                      ? `Project Group — @tagging is scoped to ${activeThreadMemberProfiles.length} group members.`
                      : "Messages and voice notes are internal to Lavie Studios workspace."}
                  </span>
                </div>
              </div>

              {activeMessages.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center px-6 space-y-2">
                  <div className="w-11 h-11 rounded-full bg-[#1f2c34] flex items-center justify-center text-[#c7cb2d]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-white">
                    No messages in {activeThread.title} yet
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    Send a message, type <strong className="text-[#c7cb2d]">@</strong> to tag a member of this chat, or click the microphone to record a voice note.
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
                      /\.(png|jpe?g|webp|gif)$/i.test(
                        String(m.attachment_name || m.attachment_url)
                      ));

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`group relative max-w-[86%] sm:max-w-[72%] rounded-2xl px-3 sm:px-3.5 py-2 shadow-md text-xs ${
                          isMine
                            ? "bg-[#005c4b] text-white rounded-tr-none"
                            : "bg-[#202c33] text-zinc-100 rounded-tl-none"
                        }`}
                      >
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

                        {m.reply_preview && (
                          <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-black/25 border-l-2 border-[#c7cb2d] text-[10px] text-zinc-300 truncate">
                            {m.reply_preview}
                          </div>
                        )}

                        {isVoiceNote && m.attachment_url && (
                          <div className="my-1">
                            <audio controls src={m.attachment_url} className="h-8 w-52 max-w-full" />
                          </div>
                        )}

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

                        <div className="flex items-end justify-between gap-3">
                          <p className="leading-relaxed whitespace-pre-wrap break-words">
                            {renderFormattedChatText(m.content)}
                          </p>
                          <span className="flex items-center gap-1 text-[9px] font-mono text-zinc-300/80 shrink-0 select-none translate-y-0.5">
                            {timeStr}
                            {isMine && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                          </span>
                        </div>

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

            {/* DEPARTMENT / GROUP-SCOPED @MENTION AUTOCOMPLETE POPUP */}
            {showMentionList && (
              <div className="mx-3 sm:mx-4 mb-1 p-2 rounded-2xl bg-[#202c33] border border-[#c7cb2d]/40 max-h-36 overflow-y-auto space-y-1.5 shrink-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono text-[#c7cb2d] uppercase">
                    Tag Member in {activeThread.title} ({taggableStaffForActiveThread.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMentionList(false)}
                    className="text-zinc-400 hover:text-white text-[10px]"
                  >
                    Close
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {taggableStaffForActiveThread.length === 0 ? (
                    <span className="text-[11px] text-zinc-400 px-1">
                      No matching members in this group.
                    </span>
                  ) : (
                    taggableStaffForActiveThread.map((s) => (
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
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Reply / Attachment / Voice Recording Preview Strip */}
            {(replyingTo || chatAttachment || voiceNoteDraft || isRecordingVoice) && (
              <div className="mx-3 sm:mx-4 mb-1 px-3 py-1.5 rounded-xl bg-[#202c33] border-l-4 border-[#c7cb2d] flex items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2 truncate">
                  {isRecordingVoice && (
                    <span className="text-red-400 font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      ● Recording ({recordingSeconds}s)...
                    </span>
                  )}
                  {voiceNoteDraft && !isRecordingVoice && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#c7cb2d] font-bold">
                        🎤 ({voiceNoteDraft.duration}s)
                      </span>
                      <audio controls src={voiceNoteDraft.url} className="h-7 w-36" />
                    </div>
                  )}
                  {replyingTo && (
                    <span className="text-zinc-300 truncate">
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
                  className="text-zinc-400 hover:text-red-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div className="mx-3 sm:mx-4 mb-1 p-2 rounded-xl bg-[#202c33] flex flex-wrap gap-2 shrink-0">
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
              className="px-2.5 sm:px-3 py-2 bg-[#161717] border-t border-white/10 flex items-center gap-1 sm:gap-1.5 shrink-0"
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
                className="p-1.5 sm:p-2 rounded-full text-zinc-400 hover:text-[#c7cb2d] hover:bg-white/5 cursor-pointer"
                title="Emojis"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => chatFileRef.current?.click()}
                className="p-1.5 sm:p-2 rounded-full text-zinc-400 hover:text-[#c7cb2d] hover:bg-white/5 cursor-pointer"
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
                className="p-1.5 sm:p-2 rounded-full text-zinc-400 hover:text-[#c7cb2d] hover:bg-white/5 cursor-pointer"
                title="Tag Group Member (@)"
              >
                <AtSign className="w-4 h-4" />
              </button>

              <input
                value={chatInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Message ${activeThread.title}...`}
                className="flex-1 min-w-0 bg-[#242626] text-white placeholder:text-zinc-400 rounded-full px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#c7cb2d]"
              />

              {!chatInput.trim() && !chatAttachment && !voiceNoteDraft ? (
                !isRecordingVoice ? (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-2 rounded-full bg-[#242626] text-zinc-300 hover:text-[#c7cb2d] cursor-pointer shrink-0"
                    title="Record Voice Note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="p-2 rounded-full bg-red-500 text-white animate-pulse cursor-pointer shrink-0"
                    title="Stop Recording"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  disabled={sending}
                  className="p-2 rounded-full bg-[#c7cb2d] text-black font-bold hover:brightness-110 transition cursor-pointer shrink-0"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
