export interface PushPayload {
  title: string;
  message: string;
  url?: string;
  targetType: "public" | "staff_codes" | "clearance" | "department" | "all_staff";
  staffCodes?: string[];
  clearance?: "inquiries" | "hr" | "finance" | "portfolio" | "executive";
  department?: string;
}

export async function triggerPushNotification(payload: PushPayload) {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (_) {}
}
