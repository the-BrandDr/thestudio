import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

async function getDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    return createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return await createServerClient();
}

export async function GET() {
  try {
    const supabase = await getDbClient();
    const { data, error } = await supabase
      .from("expense_vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, data: [] }, { status: 400 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch vouchers", data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await getDbClient();

    let payload: Record<string, any> = { ...body };

    // Validate UUID for staff_id; if not a strict UUID, remove staff_id so FK/UUID never fails
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payload.staff_id || !uuidRegex.test(String(payload.staff_id))) {
      delete payload.staff_id;
    }

    // Attempt insert with adaptive column stripping (up to 8 retries if any column is missing in DB)
    let lastError: any = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data, error } = await supabase
        .from("expense_vouchers")
        .insert(payload)
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({ data });
      }

      lastError = error;
      const msg = String(error?.message || "");

      // Check if PostgREST complained about a missing column: Could not find the 'xyz' column
      const colMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation "expense_vouchers" does not exist/i);

      if (colMatch && colMatch[1] && colMatch[1] in payload) {
        delete payload[colMatch[1]];
        continue;
      }

      // If foreign key violation on staff_id, strip staff_id and retry
      if (msg.toLowerCase().includes("staff_id") || error?.code === "23503" || error?.code === "23502") {
        delete payload.staff_id;
        continue;
      }

      break;
    }

    return NextResponse.json(
      { error: lastError?.message || "Database rejected insert", details: lastError },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing voucher id" }, { status: 400 });
    }
    const supabase = await getDbClient();
    const { data, error } = await supabase
      .from("expense_vouchers")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
