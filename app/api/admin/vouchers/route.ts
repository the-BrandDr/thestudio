import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const supabase = getDbClient();
    const { data, error } = await supabase
      .from("expense_vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, data: [] }, { status: 400 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch vouchers", data: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getDbClient();

    const codeFallback = `LV-VCH-${Date.now().toString().slice(-5)}`;
    let payload: Record<string, any> = {
      ...body,
      voucher_code: body.voucher_code || body.voucher_no || codeFallback,
      voucher_no: body.voucher_no || body.voucher_code || codeFallback,
    };

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payload.staff_id || !uuidRegex.test(String(payload.staff_id))) {
      delete payload.staff_id;
    }

    let lastError: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
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

      const colMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation "expense_vouchers" does not exist/i);

      if (colMatch && colMatch[1] && colMatch[1] in payload) {
        delete payload[colMatch[1]];
        continue;
      }

      if (
        msg.toLowerCase().includes("staff_id") ||
        error?.code === "23503" ||
        error?.code === "23502"
      ) {
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
    const supabase = getDbClient();
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
