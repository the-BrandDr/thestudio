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

const LOCAL_STORAGE_KEY = "lavie_staff_activity_logs_v1";
const LOCAL_NOTIF_KEY = "lavie_inapp_notifications_v1";

export function getCachedStaffActivities(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export async function fetchMergedStaffActivities(limit = 150): Promise<any[]> {
  const supabase = createClient();
  let dbRows: any[] = [];
  for (const table of ["staff_activity_logs", "activity_logs", "audit_logs"]) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data) && data.length > 0) {
        dbRows = data;
        break;
      }
    } catch (_) {}
  }
  const localRows = getCachedStaffActivities();
  const seen = new Map<string, any>();
  for (const r of [...dbRows, ...localRows]) {
    if (!r) continue;
    const key = String(r.id || (r.staff_code + "-" + r.action_type + "-" + (r.reference_code || "") + "-" + (r.created_at || "").slice(0, 16)));
    if (!seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
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
    module: payload.module,
    description: payload.description,
    reference_code: payload.reference_code || "",
    metadata: payload.metadata || {},
    created_at: nowIso,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getCachedStaffActivities();
      const updated = [entry, ...existing].slice(0, 250);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("lavie:activity-updated", { detail: entry }));

      // Also push to in-app notifications cache so the top navbar bell icon updates immediately
      const rawNotifs = window.localStorage.getItem(LOCAL_NOTIF_KEY);
      const existingNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      const newNotif = {
        id: "ntf-" + Date.now(),
        title: payload.notifyTarget?.title || (payload.module + ": " + payload.action_type.replace(/_/g, " ")),
        message: payload.notifyTarget?.message || payload.description,
        url: payload.notifyTarget?.url || "/admin/finance?tab=vouchers",
        actor_name: payload.staff_name,
        actor_code: payload.staff_code,
        is_read: false,
        created_at: nowIso,
      };
      window.localStorage.setItem(LOCAL_NOTIF_KEY, JSON.stringify([newNotif, ...(Array.isArray(existingNotifs) ? existingNotifs : [])].slice(0, 100)));
      window.dispatchEvent(new CustomEvent("lavie:notification-updated", { detail: newNotif }));
    } catch (_) {}
  }

  try {
    const supabase = createClient();
    let dbPayload: Record<string, any> = { ...entry };
    delete dbPayload.id;

    for (const table of ["staff_activity_logs", "activity_logs"]) {
      let attemptPayload = { ...dbPayload };
      for (let attempt = 0; attempt < 6; attempt++) {
        const { error } = await supabase.from(table).insert(attemptPayload);
        if (!error) break;
        const msg = String(error.message || "");
        const colMatch =
          msg.match(/Could not find the '([^']+)' column/i) ||
          msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
        if (colMatch && colMatch[1] && colMatch[1] in attemptPayload) {
          delete attemptPayload[colMatch[1]];
          continue;
        }
        break;
      }
    }

    // Also insert into in-app notifications table if present
    for (const nTable of ["notifications", "staff_notifications", "studio_notifications"]) {
      try {
        const { error } = await supabase.from(nTable).insert({
          title: payload.notifyTarget?.title || (payload.module + " Update"),
          message: payload.notifyTarget?.message || payload.description,
          link: payload.notifyTarget?.url || "/admin/finance?tab=vouchers",
          sender_name: payload.staff_name,
          sender_code: payload.staff_code,
          is_read: false,
        });
        if (!error) break;
      } catch (_) {}
    }
  } catch (_) {}

  if (payload.notifyTarget) {
    try {
      await triggerPushNotification({
        title: payload.notifyTarget.title,
        message: payload.notifyTarget.message,
        url: payload.notifyTarget.url || "https://studioslavie.com/admin/finance?tab=vouchers",
        targetType: payload.notifyTarget.targetType || "all_staff",
        clearance: payload.notifyTarget.clearance,
        staffCodes: payload.notifyTarget.staffCodes,
      });
    } catch (_) {}
  }

  return entry;
}