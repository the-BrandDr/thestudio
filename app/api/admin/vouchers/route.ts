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

function unpackVoucherRow(row: any) {
  if (!row) return row;
  const rawText = String(row.description || row.notes || "");
  let unpacked = { ...row };

  // Extract embedded VCH_META if present
  const metaMatch = rawText.match(/<!--VCH_META:([\s\S]*?)-->/);
  if (metaMatch && metaMatch[1]) {
    try {
      const parsedMeta = JSON.parse(metaMatch[1]);
      unpacked = {
        ...unpacked,
        strategist_status:
          parsedMeta.strategist_status || unpacked.strategist_status || "pending",
        ops_status:
          parsedMeta.ops_status || unpacked.ops_status || "pending",
        finance_status:
          parsedMeta.finance_status || unpacked.finance_status || "pending",
        status: parsedMeta.status || unpacked.status || "pending",
      };
    } catch (_) {}
  }

  // Extract embedded VCH_COMMENTS if present
  const cmtMatch = rawText.match(/<!--VCH_COMMENTS:([\s\S]*?)-->/);
  if (cmtMatch && cmtMatch[1]) {
    try {
      const parsedCmts = JSON.parse(cmtMatch[1]);
      if (
        Array.isArray(parsedCmts) &&
        (!Array.isArray(unpacked.comments) || parsedCmts.length >= unpacked.comments.length)
      ) {
        unpacked.comments = parsedCmts;
      }
    } catch (_) {}
  }

  return unpacked;
}

function buildSerializedDescription(existingRow: any, updates: Record<string, any>, nextComments?: any[]) {
  const rawText = String(
    updates.notes !== undefined
      ? updates.notes
      : updates.description !== undefined
      ? updates.description
      : existingRow?.description || existingRow?.notes || ""
  );

  // Strip old markers to get clean base notes
  const cleanBase = rawText
    .split("<!--VCH_META:")[0]
    .split("<!--VCH_COMMENTS:")[0]
    .trim();

  const currentUnpacked = unpackVoucherRow(existingRow || {});

  const metaObj = {
    strategist_status:
      updates.strategist_status || currentUnpacked.strategist_status || "pending",
    ops_status:
      updates.ops_status || currentUnpacked.ops_status || "pending",
    finance_status:
      updates.finance_status || currentUnpacked.finance_status || "pending",
    status: updates.status || currentUnpacked.status || "pending",
  };

  const finalComments =
    nextComments !== undefined
      ? nextComments
      : Array.isArray(updates.comments)
      ? updates.comments
      : Array.isArray(currentUnpacked.comments)
      ? currentUnpacked.comments
      : [];

  return (
    cleanBase +
    "\n<!--VCH_META:" +
    JSON.stringify(metaObj) +
    "-->" +
    "\n<!--VCH_COMMENTS:" +
    JSON.stringify(finalComments) +
    "-->"
  );
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
    const unpackedList = (data || []).map(unpackVoucherRow);
    return NextResponse.json({ data: unpackedList });
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
    const serialized = buildSerializedDescription(body, body, body.comments);

    let payload: Record<string, any> = {
      ...body,
      voucher_code: body.voucher_code || body.voucher_no || codeFallback,
      voucher_no: body.voucher_no || body.voucher_code || codeFallback,
      description: serialized,
      notes: serialized,
    };

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payload.staff_id || !uuidRegex.test(String(payload.staff_id))) {
      delete payload.staff_id;
    }

    let lastError: any = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const { data, error } = await supabase
        .from("expense_vouchers")
        .insert(payload)
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({ data: unpackVoucherRow(data) });
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
    const { id, action, comment, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing voucher id" }, { status: 400 });
    }

    const supabase = getDbClient();

    // Fetch existing row first so we can merge comments and approval statuses safely
    const { data: existingRaw } = await supabase
      .from("expense_vouchers")
      .select("*")
      .eq("id", id)
      .single();

    const existing = unpackVoucherRow(existingRaw || { id });

    let nextComments = Array.isArray(existing?.comments) ? [...existing.comments] : [];
    if (action === "add_comment" && comment) {
      nextComments.push(comment);
    } else if (Array.isArray(updates.comments)) {
      nextComments = updates.comments;
    }

    const serialized = buildSerializedDescription(existing, updates, nextComments);

    let payload: Record<string, any> = {
      ...updates,
      comments: nextComments,
      description: serialized,
      notes: serialized,
    };

    let lastErr: any = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const { data, error } = await supabase
        .from("expense_vouchers")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({ data: unpackVoucherRow(data) });
      }

      lastErr = error;
      const msg = String(error?.message || "");
      const colMatch =
        msg.match(/Could not find the '([^']+)' column/i) ||
        msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
      if (colMatch && colMatch[1] && colMatch[1] in payload) {
        delete payload[colMatch[1]];
        continue;
      }
      break;
    }

    return NextResponse.json(
      { error: lastErr?.message || "Could not update voucher" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
