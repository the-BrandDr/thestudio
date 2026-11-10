export interface StaffActivityPayload {
  staff_name?: string;
  staff_code?: string;
  department?: string;
  action_type: string;
  module: string;
  description: string;
  reference_code?: string;
}

export async function logStaffActivity(payload: StaffActivityPayload) {
  try {
    if (typeof window !== "undefined") {
      const localLogs = JSON.parse(window.localStorage.getItem("lavie_staff_activity_logs") || "[]");
      const newEntry = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        staff_name: payload.staff_name || "Studio Staff",
        staff_code: payload.staff_code || "LS-STAFF",
        department: payload.department || "Operations",
        action_type: payload.action_type,
        module: payload.module,
        description: payload.description,
        reference_code: payload.reference_code || "",
        created_at: new Date().toISOString(),
      };
      window.localStorage.setItem(
        "lavie_staff_activity_logs",
        JSON.stringify([newEntry, ...localLogs].slice(0, 200))
      );
      window.dispatchEvent(new CustomEvent("lavie-activity-logged", { detail: newEntry }));
    }

    await fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (_) {}
}
