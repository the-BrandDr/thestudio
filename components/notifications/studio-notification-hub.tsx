"use client";

import * as React from "react";
import Script from "next/script";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Bell, BellRing, X, Volume2, VolumeX, ArrowUpRight } from "lucide-react";
import {
  checkModuleAccess,
  getStaffApprovalLevel,
  getVoucherStageMeta,
} from "@/utils/resolve-current-staff";
import { playChatSound } from "@/utils/chat-sound-effects";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
    __lavieOneSignalInitialized?: boolean;
  }
}

function isProductionOneSignalAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "studioslavie.com" || host === "www.studioslavie.com";
}

export function PublicPushInitializer() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  React.useEffect(() => {
    if (typeof window === "undefined" || !appId) return;
    if (!isProductionOneSignalAllowed()) return;
    if (window.__lavieOneSignalInitialized) return;

    window.__lavieOneSignalInitialized = true;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: true },
        });
        await OneSignal.User.addTag("user_type", "public");
      } catch (_) {}
    });
  }, [appId]);

  if (!appId) return null;
  return (
    <Script
      id="onesignal-sdk"
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}

export interface ActionNotificationItem {
  id: string;
  title: string;
  body: string;
  href: string;
  time: string;
  unread: boolean;
  category?: "voucher" | "chat" | "leave" | "inquiry";
}

export function StaffNotificationBell({ staff }: { staff: any }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  const [open, setOpen] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [permission, setPermission] = React.useState<NotificationPermission>("default");
  const [feed, setFeed] = React.useState<ActionNotificationItem[]>([]);
  const [liveToast, setLiveToast] = React.useState<ActionNotificationItem | null>(null);
  const bellRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    try {
      const savedMute = window.localStorage.getItem("lavie_sound_muted");
      if (savedMute === "true") setSoundEnabled(false);
    } catch (_) {}
  }, []);

  // Close popover on click outside
  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Sync Staff Identity with OneSignal
  React.useEffect(() => {
    if (typeof window === "undefined" || !staff?.staff_id || !appId) return;
    if (!isProductionOneSignalAllowed()) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        if (!window.__lavieOneSignalInitialized) {
          window.__lavieOneSignalInitialized = true;
          await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
          });
        }
        await OneSignal.login(String(staff.staff_id).toUpperCase());
        await OneSignal.User.addTags({
          user_type: "staff",
          staff_id: String(staff.staff_id).toUpperCase(),
          department: staff.department || "Studio",
          access_hr: checkModuleAccess(staff, "hr") ? "true" : "false",
          access_finance: checkModuleAccess(staff, "finance") ? "true" : "false",
          access_inquiries: checkModuleAccess(staff, "inquiries") ? "true" : "false",
          access_portfolio: checkModuleAccess(staff, "portfolio") ? "true" : "false",
          access_executive:
            staff.staff_id === "LS-01" ||
            staff.role === "super_admin" ||
            staff.role === "executive" ||
            String(staff.hierarchy_level || "").startsWith("L7")
              ? "true"
              : "false",
        });
      } catch (_) {}
    });
  }, [staff, appId]);

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
    }
    if (isProductionOneSignalAllowed() && window.OneSignal?.Slidedown) {
      try {
        await window.OneSignal.Slidedown.promptPush();
      } catch (_) {}
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("lavie_sound_muted", next ? "false" : "true");
      } catch (_) {}
      if (next) playChatSound("sent");
      return next;
    });
  };

  const navigateToTarget = React.useCallback(
    (href: string) => {
      setOpen(false);
      setLiveToast(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lavie:deep-link", { detail: { href } }));
      }
      router.push(href);
    },
    [router]
  );

  const pushLocalAlert = React.useCallback(
    (
      title: string,
      body: string,
      href = "/admin",
      tone: "received" | "mention" = "received",
      customId?: string
    ) => {
      const id = customId || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: ActionNotificationItem = {
        id,
        title,
        body,
        href,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unread: true,
      };

      setFeed((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        return [newItem, ...filtered].slice(0, 20);
      });
      setLiveToast(newItem);
      setTimeout(() => setLiveToast((curr) => (curr?.id === id ? null : curr)), 4500);

      if (soundEnabled) {
        playChatSound(tone);
      }

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification(title, {
            body,
            icon: "/logo-light.png",
          });
          n.onclick = () => {
            window.focus();
            navigateToTarget(href);
          };
        } catch (_) {}
      }
    },
    [soundEnabled, navigateToTarget]
  );

  // Hydrate ONLY notifications that require THIS specific user's attention or action!
  const loadMyActionableFeed = React.useCallback(async () => {
    if (!staff?.staff_id || typeof window === "undefined") return;
    const myCode = String(staff.staff_id).toUpperCase().trim();
    const myFirst = String(staff.first_name || "").toLowerCase().trim();
    const myDept = String(staff.department || "").trim();
    const myTier = getStaffApprovalLevel(staff);
    const canHR = checkModuleAccess(staff, "hr");
    const canFin = checkModuleAccess(staff, "finance");

    const readIdsRaw = window.localStorage.getItem("lavie_read_notif_ids_v2");
    const readIds = new Set<string>(readIdsRaw ? JSON.parse(readIdsRaw) : []);
    const items: ActionNotificationItem[] = [];

    try {
      // 1. VOUCHERS REQUIRING MY EXACT EXECUTIVE SIGN-OFF OR MY OWN VOUCHER UPDATES
      const vRes = await fetch("/api/admin/vouchers", { cache: "no-store" }).catch(() => null);
      const vJson = vRes ? await vRes.json().catch(() => ({})) : {};
      const allVouchers: any[] = Array.isArray(vJson?.data) ? vJson.data : [];

      for (const v of allVouchers) {
        const meta = getVoucherStageMeta(v);
        if (meta.isDirectExpense) continue; // Never notify on direct expenses

        const vCode = v.voucher_no || v.voucher_code || "LV-VCH";
        const vOwner = String(v.staff_code || "").toUpperCase().trim();
        const amt = "₦" + Number(v.amount || 0).toLocaleString();
        const targetHref = canFin || myTier !== "staff"
          ? `/admin/finance?tab=vouchers&voucher=${encodeURIComponent(vCode)}`
          : `/admin?tab=vouchers&voucher=${encodeURIComponent(vCode)}`;

        // Case A: It is currently MY exact turn to approve or disburse this voucher
        const needsMyApproval =
          (meta.stage === "pending" && meta.requiredApproverTier === myTier) ||
          (meta.stage === "approved_waiting" && meta.canDisburse && myTier === "level3_finance");

        if (needsMyApproval) {
          const notifId = `vch-action-${v.id}-L${meta.currentLevel}-${meta.stage}`;
          items.push({
            id: notifId,
            title:
              meta.stage === "approved_waiting"
                ? `💸 Ready to Disburse • ${vCode}`
                : `🧾 Action Required (L${meta.currentLevel}/3) • ${vCode}`,
            body: `${v.staff_name || "Staff"} raised "${v.title}" (${amt}) — awaiting your action.`,
            href: targetHref,
            time: v.created_at
              ? new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Pending",
            unread: !readIds.has(notifId),
            category: "voucher",
          });
        }

        // Case B: I raised this voucher and its status changed or someone commented on it
        if (vOwner === myCode && meta.stage !== "pending") {
          const notifId = `vch-mine-${v.id}-${meta.stage}`;
          items.push({
            id: notifId,
            title: `🧾 Your Voucher ${vCode} • ${meta.stage.toUpperCase()}`,
            body: `"${v.title}" (${amt}) is now ${meta.label}.`,
            href: targetHref,
            time: v.created_at
              ? new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Updated",
            unread: !readIds.has(notifId),
            category: "voucher",
          });
        }
      }

      // 2. RECENT MESSAGES DIRECTED AT ME, TAGGING ME, OR IN MY GROUP
      const { data: recentMsgs } = await supabase
        .from("studio_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      for (const m of recentMsgs || []) {
        const senderCode = String(m.sender_code || "").toUpperCase().trim();
        if (!m || senderCode === myCode) continue; // Never notify me of my own sent messages

        const recip = String(m.recipient_code || "").trim();
        const content = String(m.content || "").trim();
        const isDirectToMe = recip.toUpperCase() === myCode;
        const isTaggedMe =
          content.toUpperCase().includes(myCode) ||
          (myFirst && content.toLowerCase().includes(`@${myFirst}`));
        const isMyDeptGroup = recip.startsWith("DEPT:") && myDept && recip.includes(myDept);
        const isAllStaffGroup = recip === "All Staff";

        if (!isDirectToMe && !isTaggedMe && !isMyDeptGroup && !isAllStaffGroup) {
          continue; // Strictly ignore messages not meant for me!
        }

        const notifId = `msg-${m.id}`;
        let title = "";
        let href = "/admin?tab=chat";

        if (isTaggedMe) {
          title = `🏷️ You were tagged by ${m.sender_name}`;
          href = `/admin?tab=chat&mode=mentions&msg=${m.id}`;
        } else if (isDirectToMe) {
          title = `💬 New message from ${m.sender_name}`;
          href = `/admin?tab=chat&mode=direct&target=${encodeURIComponent(senderCode)}&msg=${m.id}`;
        } else if (isMyDeptGroup) {
          title = `👥 ${m.sender_name} → ${myDept} Group`;
          href = `/admin?tab=chat&mode=multi_dept&msg=${m.id}`;
        } else {
          title = `📢 ${m.sender_name} → All Staff Group`;
          href = `/admin?tab=chat&mode=group&msg=${m.id}`;
        }

        items.push({
          id: notifId,
          title,
          body: content || "Sent a voice note or file attachment",
          href,
          time: m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Recent",
          unread: !readIds.has(notifId),
          category: "chat",
        });
      }

      // 3. PENDING LEAVE APPROVALS (for HR / Execs)
      if (canHR) {
        const { data: leaves } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        for (const lv of leaves || []) {
          if (String(lv.staff_code || "").toUpperCase() === myCode) continue;
          const notifId = `leave-pending-${lv.id}`;
          items.push({
            id: notifId,
            title: `📅 Leave Approval Needed • ${lv.staff_name}`,
            body: `${lv.leave_type} (${lv.start_date} → ${lv.end_date})`,
            href: "/admin/hr?tab=leave",
            time: "Pending",
            unread: !readIds.has(notifId),
            category: "leave",
          });
        }
      }

      setFeed(items.slice(0, 18));
    } catch (_) {}
  }, [staff, supabase]);

  React.useEffect(() => {
    loadMyActionableFeed();
  }, [loadMyActionableFeed, pathname]);

  // Realtime listeners strictly scoped to THIS user's actions and messages
  React.useEffect(() => {
    if (!staff?.staff_id) return;
    const myCode = String(staff.staff_id).toUpperCase().trim();
    const myFirst = String(staff.first_name || "").toLowerCase().trim();
    const myDept = String(staff.department || "").trim();
    const myTier = getStaffApprovalLevel(staff);
    const canInq = checkModuleAccess(staff, "inquiries");
    const canHR = checkModuleAccess(staff, "hr");
    const canFin = checkModuleAccess(staff, "finance");

    const channel = supabase
      .channel(`lavie-live-notifications-${myCode}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "studio_messages" },
        (payload) => {
          const m: any = payload.new;
          const senderCode = String(m?.sender_code || "").toUpperCase().trim();
          if (!m || senderCode === myCode) return;

          const recip = String(m.recipient_code || "").trim();
          const content = String(m.content || "").trim();
          const isDirectToMe = recip.toUpperCase() === myCode;
          const isTaggedMe =
            content.toUpperCase().includes(myCode) ||
            (myFirst && content.toLowerCase().includes(`@${myFirst}`));
          const isMyDept = recip.startsWith("DEPT:") && myDept && recip.includes(myDept);
          const isAllStaff = recip === "All Staff";

          if (isTaggedMe) {
            pushLocalAlert(
              `🏷️ You were tagged by ${m.sender_name}`,
              content || "Tagged you in a message",
              `/admin?tab=chat&mode=mentions&msg=${m.id}`,
              "mention",
              `msg-${m.id}`
            );
          } else if (isDirectToMe) {
            pushLocalAlert(
              `💬 You have a new message from ${m.sender_name}`,
              content || "Sent a voice note or attachment",
              `/admin?tab=chat&mode=direct&target=${encodeURIComponent(senderCode)}&msg=${m.id}`,
              "received",
              `msg-${m.id}`
            );
          } else if (isMyDept) {
            pushLocalAlert(
              `👥 ${m.sender_name} sent a message to ${myDept} group`,
              content || "New attachment in department group",
              `/admin?tab=chat&mode=multi_dept&msg=${m.id}`,
              "received",
              `msg-${m.id}`
            );
          } else if (isAllStaff) {
            pushLocalAlert(
              `📢 ${m.sender_name} sent a message to All Staff group`,
              content || "New message in All Staff group",
              `/admin?tab=chat&mode=group&msg=${m.id}`,
              "received",
              `msg-${m.id}`
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_vouchers" },
        (payload) => {
          const v: any = payload.new;
          if (!v) return;
          const meta = getVoucherStageMeta(v);
          if (meta.isDirectExpense) return;

          const vCode = v.voucher_no || v.voucher_code || "LV-VCH";
          const vOwner = String(v.staff_code || "").toUpperCase().trim();
          const amt = "₦" + Number(v.amount || 0).toLocaleString();
          const href =
            canFin || myTier !== "staff"
              ? `/admin/finance?tab=vouchers&voucher=${encodeURIComponent(vCode)}`
              : `/admin?tab=vouchers&voucher=${encodeURIComponent(vCode)}`;

          // 1. Does this voucher now require MY executive approval or disbursement?
          const needsMyTurn =
            (meta.stage === "pending" && meta.requiredApproverTier === myTier) ||
            (meta.stage === "approved_waiting" && meta.canDisburse && myTier === "level3_finance");

          if (needsMyTurn) {
            pushLocalAlert(
              meta.stage === "approved_waiting"
                ? `💸 Voucher Ready for Disbursement • ${vCode}`
                : `🧾 Voucher Awaiting Your Approval (L${meta.currentLevel}/3)`,
              `${v.staff_name || "Staff"}: "${v.title}" (${amt})`,
              href,
              "mention",
              `vch-action-${v.id}-L${meta.currentLevel}-${meta.stage}`
            );
            return;
          }

          // 2. Is this MY own raised voucher that just got updated?
          if (payload.eventType === "UPDATE" && vOwner === myCode) {
            pushLocalAlert(
              `🧾 Your Voucher ${vCode} Updated`,
              `"${v.title}" (${amt}) — ${meta.label}`,
              href,
              "received",
              `vch-mine-${v.id}-${meta.stage}`
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_inquiries" },
        (payload) => {
          if (!canInq) return;
          const inq: any = payload.new;
          pushLocalAlert(
            "📩 New Client Inquiry",
            `${inq?.name || "A client"} inquired about ${inq?.service || inq?.subject || "a project"}`,
            "/admin/inquiries",
            "received"
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leave_requests" },
        (payload) => {
          const lv: any = payload.new;
          if (!lv) return;
          if (payload.eventType === "UPDATE" && String(lv.staff_code || "").toUpperCase() === myCode) {
            pushLocalAlert(
              `📅 Leave Application ${String(lv.status || "").toUpperCase()}`,
              `Your ${lv.leave_type} request is now ${lv.status}.`,
              "/admin",
              "received"
            );
          } else if (payload.eventType === "INSERT" && canHR && String(lv.staff_code || "").toUpperCase() !== myCode) {
            pushLocalAlert(
              "📅 New Staff Leave Request",
              `${lv.staff_name} applied for ${lv.leave_type}`,
              "/admin/hr?tab=leave",
              "mention"
            );
          }
        }
      )
      .subscribe();

    const handleRefreshEvent = () => loadMyActionableFeed();
    window.addEventListener("lavie-activity-logged", handleRefreshEvent);
    window.addEventListener("lavie:activity-updated", handleRefreshEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("lavie-activity-logged", handleRefreshEvent);
      window.removeEventListener("lavie:activity-updated", handleRefreshEvent);
    };
  }, [supabase, staff, pushLocalAlert, loadMyActionableFeed]);

  const unreadCount = feed.filter((f) => f.unread).length;

  const markAllRead = () => {
    setFeed((prev) => {
      const next = prev.map((item) => ({ ...item, unread: false }));
      try {
        const existingRaw = window.localStorage.getItem("lavie_read_notif_ids_v2");
        const existingIds = existingRaw ? JSON.parse(existingRaw) : [];
        const mergedIds = Array.from(new Set([...existingIds, ...next.map((i) => i.id)]));
        window.localStorage.setItem("lavie_read_notif_ids_v2", JSON.stringify(mergedIds));
      } catch (_) {}
      return next;
    });
  };

  const handleItemClick = (item: ActionNotificationItem) => {
    try {
      const existingRaw = window.localStorage.getItem("lavie_read_notif_ids_v2");
      const existingIds = existingRaw ? JSON.parse(existingRaw) : [];
      if (!existingIds.includes(item.id)) {
        window.localStorage.setItem("lavie_read_notif_ids_v2", JSON.stringify([...existingIds, item.id]));
      }
    } catch (_) {}
    setFeed((prev) => prev.map((f) => (f.id === item.id ? { ...f, unread: false } : f)));
    navigateToTarget(item.href);
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer transition"
        title="Actionable Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-[#c7cb2d] animate-bounce" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#c7cb2d] text-black text-[9px] font-mono font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* COMPACT ACTION-FOCUSED NOTIFICATION POPOVER */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#141414] border border-[var(--border-subtle)] shadow-2xl p-2.5 z-50 space-y-2">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/50 pb-2 px-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-[11px] font-bold text-[var(--text-primary)]">
                Action & Inbox ({unreadCount})
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? "Sound Tones On (Click to Mute)" : "Sound Tones Muted"}
                className="p-1 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#c7cb2d]" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer"
                >
                  Mark read
                </button>
              )}
              {permission !== "granted" && (
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-2 py-0.5 rounded-full bg-[#c7cb2d] text-black text-[9px] font-bold cursor-pointer"
                >
                  Push
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {feed.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] py-4 text-center">
              All caught up! Only items requiring your approval or direct messages/tags appear here.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
              {feed.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl border transition flex items-start justify-between gap-2 cursor-pointer ${
                    item.unread
                      ? "bg-[#1c1c1c] border-[#c7cb2d]/40 hover:border-[#c7cb2d]"
                      : "bg-[var(--bg-main)]/60 border-[var(--border-subtle)]/30 hover:border-[var(--border-subtle)] opacity-75"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#c7cb2d] truncate">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-dim)] shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-primary)] truncate">
                      {item.body}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-[#c7cb2d] shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPACT CLICKABLE LIVE TOAST */}
      {liveToast && (
        <button
          type="button"
          onClick={() => navigateToTarget(liveToast.href)}
          className="fixed bottom-4 right-4 z-50 w-72 p-3 rounded-2xl bg-[#141414] border border-[#c7cb2d] shadow-2xl text-left space-y-0.5 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-[#c7cb2d] truncate">
              {liveToast.title}
            </span>
            <span className="text-[9px] font-mono uppercase text-[var(--text-dim)]">Open ↗</span>
          </div>
          <p className="text-[11px] text-[var(--text-primary)] truncate">{liveToast.body}</p>
        </button>
      )}
    </div>
  );
}
