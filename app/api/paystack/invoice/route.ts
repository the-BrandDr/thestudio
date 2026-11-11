import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

async function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false } });
  }
  return await createServerClient();
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
    }
    const db = await getDb();
    let { data: invoice } = await db
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!invoice) {
      const { data: byNo } = await db
        .from("invoices")
        .select("*")
        .eq("invoice_no", id)
        .maybeSingle();
      invoice = byNo;
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: invoice,
      paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
