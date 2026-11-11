"use client";

import * as React from "react";
import Script from "next/script";
import { createClient } from "@/utils/supabase/client";
import { Bell, BellRing, X } from "lucide-react";
import { checkModuleAccess } from "@/utils/resolve-current-staff";

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
      } catch (_) {
        // Ignore domain mismatch or duplicate init in dev
      }
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

export function StaffNotificationBell({ staff }: { staff: any }) {
  const supabase = createClient();
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const [open, setOpen] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission>("default");
  const [feed, setFeed] = React.useState<
    Array<{ id: string; title: string; body: string; href: string; time: string; unread: boolean }>
  >([]);
  const [liveToast, setLiveToast] = React.useState<{ title: string; body: string; href: string } | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Sync Staff Identity & Role Clearance Tags with OneSignal (without re-calling OneSignal.init!)
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
      } catch (_) {
        // Safely ignore if domain isn't studioslavie.com or already initialized
      }
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

  const pushLocalAlert = React.useCallback((title: string, body: string, href = "/admin") => {
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      href,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      unread: true,
    };
    setFeed((prev) => [newItem, ...prev.slice(0, 24)]);
    setLiveToast({ title, body, href });
    setTimeout(() => setLiveToast(null), 5000);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification(title, {
          body,
          icon: "/logo-light.png",
        });
        n.onclick = () => {
          window.focus();
          window.location.href = href;
        };
      } catch (_) {}
    }
  }, [])

  // Hydrate notification feed from localStorage & /api/admin/activity on mount + listen to live events
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const loadInitialFeed = async () => {
      try {
        const rawLocal = window.localStorage.getItem("lavie_inapp_notifications_v1");
        const localNotifs = rawLocal ? JSON.parse(rawLocal) : [];
        const readIdsRaw = window.localStorage.getItem("lavie_read_notif_ids_v1");
        const readIds = new Set<string>(readIdsRaw ? JSON.parse(readIdsRaw) : []);

        const res = await fetch("/api/admin/activity", { cache: "no-store" }).catch(() => null);
        const json = res ? await res.json().catch(() => ({})) : {};
        const apiActs = Array.isArray(json?.data) ? json.data.slice(0, 20) : [];

        const mappedActs = apiActs.map((a: any) => {
          const id = String(a.id || (a.staff_code + "-" + a.created_at));
          return {
            id,
            title: `${a.module || "Studio"}: ${String(a.action_type || a.action || "Update").replace(/_/g, " ")}`,
            body: `${a.staff_name || "Staff"} — ${a.description || a.details || ""}`,
            href:
              String(a.module || "").toLowerCase().includes("voucher") ||
              String(a.action_type || "").toLowerCase().includes("voucher")
                ? "/admin/finance?tab=vouchers"
                : "/admin/inquiries",
            time: a.created_at
              ? new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Recent",
            unread: !readIds.has(id),
          };
        });

        const mergedMap = new Map<string, any>();
        for (const item of [...(Array.isArray(localNotifs) ? localNotifs : []), ...mappedActs]) {
          if (!item || !item.id) continue;
          if (!mergedMap.has(item.id)) {
            mergedMap.set(item.id, {
              ...item,
              unread: readIds.has(item.id) ? false : item.unread ?? true,
            });
          }
        }
        setFeed(Array.from(mergedMap.values()).slice(0, 30));
      } catch (_) {}
    };

    loadInitialFeed();

    const handleNewInAppNotif = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && detail.title) {
        pushLocalAlert(detail.title, detail.body || detail.message || "", detail.href || "/admin/finance?tab=vouchers");
      } else {
        loadInitialFeed();
      }
    };

    window.addEventListener("lavie:notification-updated", handleNewInAppNotif);
    window.addEventListener("lavie-activity-logged", loadInitialFeed);
    return () => {
      window.removeEventListener("lavie:notification-updated", handleNewInAppNotif);
      window.removeEventListener("lavie-activity-logged", loadInitialFeed);
    };
  }, [pushLocalAlert]);;

  // Supabase Realtime Listeners (Works on both localhost and production!)
  React.useEffect(() => {
    if (!staff?.staff_id) return;
    const myCode = String(staff.staff_id).toUpperCase();
    const myFirst = String(staff.first_name || "").toLowerCase();
    const myDept = String(staff.department || "");
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
          if (!m || String(m.sender_code || "").toUpperCase() === myCode) return;

          const recip = String(m.recipient_code || "");
          const content = String(m.content || "");
          const isDirectToMe = recip.toUpperCase() === myCode;
          const isTaggedMe =
            content.toUpperCase().includes(myCode) ||
            (myFirst && content.toLowerCase().includes(`@${myFirst}`));
          const isMyDept = recip.startsWith("DEPT:") && myDept && recip.includes(myDept);
          const isAllStaff = recip === "All Staff";

          if (isDirectToMe || isTaggedMe) {
            pushLocalAlert(
              `💬 Direct Message from ${m.sender_name}`,
              content || "Sent a voice note or attachment",
              "/admin"
            );
          } else if (isMyDept || isAllStaff) {
            pushLocalAlert(
              `📢 Studio Chat (${m.sender_name})`,
              content || "New attachment in channel",
              "/admin"
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
            "/admin/inquiries"
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
              "/admin"
            );
          } else if (payload.eventType === "INSERT" && canHR && String(lv.staff_code || "").toUpperCase() !== myCode) {
            pushLocalAlert(
              "📅 New Staff Leave Request",
              `${lv.staff_name} applied for ${lv.leave_type}`,
              "/admin/hr"
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
          const vCode = v.voucher_no || v.voucher_code || "LV-VCH";
          if (payload.eventType === "UPDATE") {
            pushLocalAlert(
              `🧾 Voucher Updated — ${vCode}`,
              `"${v.title}" was updated (Status: ${String(v.status || "pending").toUpperCase()}).`,
              "/admin/finance?tab=vouchers"
            );
          } else if (payload.eventType === "INSERT" && String(v.staff_code || "").toUpperCase() !== myCode) {
            pushLocalAlert(
              "🧾 New Expense Voucher Raised",
              `${v.staff_name} submitted ${v.title} (₦${Number(v.amount || 0).toLocaleString()})`,
              "/admin/finance?tab=vouchers"
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_promotions" },
        (payload) => {
          const p: any = payload.new;
          if (!p) return;
          if (String(p.staff_code || "").toUpperCase() === myCode && p.request_status === "approved") {
            pushLocalAlert(
              "🎉 Congratulations! Promotion Approved",
              `You have been promoted to ${p.new_level} (${p.new_title}).`,
              "/admin/settings"
            );
          } else if (payload.eventType === "INSERT" && canHR && p.requested_by_staff) {
            pushLocalAlert(
              "🏆 Staff Promotion Request",
              `${p.staff_name} requested an upgrade to ${p.new_level}.`,
              "/admin/hr"
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_studies" },
        (payload) => {
          const cs: any = payload.new;
          pushLocalAlert(
            "🚀 New Case Study Published",
            `"${cs?.title || "New project"}" is now live on the portfolio!`,
            "/portfolio"
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, staff, pushLocalAlert]);

  const unreadCount = feed.filter((f) => f.unread).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((p) => !p);
          setFeed((prev) => {
            const next = prev.map((item) => ({ ...item, unread: false }));
            try {
              const ids = next.map((i) => i.id);
              window.localStorage.setItem("lavie_read_notif_ids_v1", JSON.stringify(ids));
            } catch (_) {}
            return next;
          });
        }}
        className="relative p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[var(--text-muted)] hover:text-[#c7cb2d] cursor-pointer transition"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-[#c7cb2d] animate-bounce" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c7cb2d] text-black text-[9px] font-mono font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-4 z-50 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/50 pb-2.5">
            <div>
              <h3 className="font-display text-xs font-bold">Live Activity Notifications</h3>
              
            </div>
            <div className="flex items-center gap-1.5">
              {permission !== "granted" && (
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-2.5 py-1 rounded-full bg-[#c7cb2d] text-black text-[10px] font-bold cursor-pointer"
                >
                  Enable Push
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {feed.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">
              No new notifications right now. You will be alerted immediately when a chat, inquiry, or personal staff update arrives.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {feed.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block p-3 rounded-2xl bg-[var(--bg-main)] hover:border-[#c7cb2d]/50 border border-[var(--border-subtle)]/40 transition space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#c7cb2d]">
                    <span className="font-bold truncate">{item.title}</span>
                    <span className="text-[var(--text-dim)] shrink-0">{item.time}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.body}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {liveToast && (
        <a
          href={liveToast.href}
          className="fixed bottom-5 right-5 z-50 w-80 p-4 rounded-2xl bg-[var(--bg-card)] border-2 border-[#c7cb2d] shadow-2xl space-y-1 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#c7cb2d]">{liveToast.title}</span>
            <span className="text-[9px] font-mono uppercase text-[var(--text-dim)]">Now</span>
          </div>
          <p className="text-xs text-[var(--text-primary)] line-clamp-2">{liveToast.body}</p>
        </a>
      )}
    </div>
  );
}
