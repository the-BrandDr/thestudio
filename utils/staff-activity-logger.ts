import { createClient } from "@/utils/supabase/client";
import { triggerPushNotification } from "@/utils/push-notifications";

export interface StaffActivityPayload {
  staff_id?: string | null;
  staff_name: string;
  staff_code: string;
  department?: string;
  action_type: string;
  module: string;
  description: string;
  reference_code?: string;
  metadata?: Record<string, any>;
  notifyTarget?: {
    title: string;
    message: string;
    url?: string;
    targetType?: "all_staff" | "clearance" | "staff_codes";
    clearance?: string;
    staffCodes?: string[];
  };
}

const KEY_V1 = "lavie_staff_activity_logs_v1";
const KEY_LEGACY = "lavie_staff_activity_logs";
const NOTIF_KEY = "lavie_inapp_notifications_v1";

export function getCachedStaffActivities(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const a = JSON.parse(window.localStorage.getItem(KEY_V1) || "[]");
    const b = JSON.parse(window.localStorage.getItem(KEY_LEGACY) || "[]");
    const combined = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    const seen = new Map<string, any>();
    for (const item of combined) {
      if (!item) continue;
      const k = String(item.id || (item.staff_code + "-" + item.action_type + "-" + (item.created_at || "").slice(0, 16)));
      if (!seen.has(k)) seen.set(k, item);
    }
    return Array.from(seen.values());
  } catch (_) {
    return [];
  }
}

export async function fetchMergedStaffActivities(limit = 150): Promise<any[]> {
  let apiRows: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/admin/activity", { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        apiRows = json.data;
      }
    } catch (_) {}
  }

  const localRows = getCachedStaffActivities();
  const seen = new Map<string, any>();
  for (const r of [...localRows, ...apiRows]) {
    if (!r) continue;
    const key = String(
      r.id ||
        (r.staff_code || "") +
          "-" +
          (r.action_type || r.action || "") +
          "-" +
          (r.reference_code || "") +
          "-" +
          String(r.created_at || "").slice(0, 16)
    );
    if (!seen.has(key)) seen.set(key, r);
  }

  return Array.from(seen.values())
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, limit);
}

export async function logStaffActivity(payload: StaffActivityPayload) {
  const nowIso = new Date().toISOString();
  const entry = {
    id: "act-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    staff_id: payload.staff_id || null,
    staff_name: payload.staff_name || "Studio Staff",
    staff_code: payload.staff_code || "LS-STAFF",
    department: payload.department || "Studio Operations",
    action_type: payload.action_type,
    action: payload.action_type,
    module: payload.module,
    description: payload.description,
    details: payload.description,
    reference_code: payload.reference_code || "",
    metadata: payload.metadata || {},
    created_at: nowIso,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getCachedStaffActivities();
      const updated = [entry, ...existing].slice(0, 250);
      window.localStorage.setItem(KEY_V1, JSON.stringify(updated));
      window.localStorage.setItem(KEY_LEGACY, JSON.stringify(updated));

      const rawNotifs = window.localStorage.getItem(NOTIF_KEY);
      const existingNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      const newNotif = {
        id: "ntf-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
        title:
          payload.notifyTarget?.title ||
          `${payload.module}: ${payload.action_type.replace(/_/g, " ")}`,
        body: payload.notifyTarget?.message || payload.description,
        href: payload.notifyTarget?.url
          ? payload.notifyTarget.url.replace("https://studioslavie.com", "")
          : "/admin/finance?tab=vouchers",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        created_at: nowIso,
        actor_name: payload.staff_name,
        actor_code: payload.staff_code,
        unread: true,
      };
      window.localStorage.setItem(
        NOTIF_KEY,
        JSON.stringify([newNotif, ...(Array.isArray(existingNotifs) ? existingNotifs : [])].slice(0, 80))
      );

      window.dispatchEvent(new CustomEvent("lavie-activity-logged", { detail: entry }));
      window.dispatchEvent(new CustomEvent("lavie:activity-updated", { detail: entry }));
      window.dispatchEvent(new CustomEvent("lavie:notification-updated", { detail: newNotif }));
    } catch (_) {}

    // Persist via server-side API route (/api/admin/activity)
    fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }

  if (payload.notifyTarget) {
    try {
      await triggerPushNotification({
        title: payload.notifyTarget.title,
        message: payload.notifyTarget.message,
        url: payload.notifyTarget.url || "https://studioslavie.com/admin/finance?tab=vouchers",
        targetType: payload.notifyTarget.targetType || "all_staff",
        clearance: payload.notifyTarget.clearance as any,
        staffCodes: payload.notifyTarget.staffCodes,
      });
    } catch (_) {}
  }

  return entry;
}
