import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      url = "https://studioslavie.com",
      targetType = "public", // "public" | "staff_codes" | "clearance" | "department" | "all_staff"
      staffCodes = [],       // e.g. ["LS-01", "LS-02"]
      clearance = "",        // e.g. "inquiries" | "hr" | "finance" | "executive"
      department = "",
    } = body;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        info: "OneSignal env keys not configured yet; realtime browser notification fallback active.",
      });
    }

    const payload: Record<string, any> = {
      app_id: appId,
      headings: { en: title || "Lavie Studios" },
      contents: { en: message || "You have a new update on Lavie Studios." },
      url,
    };

    if (targetType === "public") {
      // Broadcast to all public website subscribers + everyone subscribed
      payload.included_segments = ["Total Subscriptions"];
    } else if (targetType === "staff_codes" && Array.isArray(staffCodes) && staffCodes.length > 0) {
      // Target specific staff members by their external_id (e.g. "LS-01") or tag
      const cleanCodes = staffCodes.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean);
      payload.include_aliases = { external_id: cleanCodes };
      payload.target_channel = "push";
    } else if (targetType === "clearance" && clearance) {
      // Target staff who have that specific module access tag OR are executives
      payload.filters = [
        { field: "tag", key: `access_${clearance.toLowerCase()}`, relation: "=", value: "true" },
        { operator: "OR" },
        { field: "tag", key: "access_executive", relation: "=", value: "true" },
      ];
    } else if (targetType === "department" && department) {
      payload.filters = [
        { field: "tag", key: "department", relation: "=", value: department },
        { operator: "OR" },
        { field: "tag", key: "access_executive", relation: "=", value: "true" },
      ];
    } else if (targetType === "all_staff") {
      payload.filters = [
        { field: "tag", key: "user_type", relation: "=", value: "staff" },
      ];
    } else {
      payload.included_segments = ["Total Subscriptions"];
    }

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json({ ok: res.ok, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Push error" }, { status: 500 });
  }
}
