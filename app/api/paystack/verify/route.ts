import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, reference, amountNaira, paymentOption } = body;

    if (!invoiceId || !reference) {
      return NextResponse.json({ error: "Missing invoiceId or reference" }, { status: 400 });
    }

    const db = getDb();
    const { data: inv } = await db
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Prevent double-crediting the exact same Paystack reference
    const { data: existingReceipt } = await db
      .from("payment_receipts")
      .select("*")
      .eq("invoice_id", inv.id)
      .ilike("payment_method", `%${reference}%`)
      .maybeSingle();

    if (existingReceipt) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        invoice: inv,
        receipt: existingReceipt,
      });
    }

    let verifiedAmountNaira = Number(amountNaira || 0);
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    // Verify with Paystack API when PAYSTACK_SECRET_KEY is configured and reference is a live Paystack reference
    if (secretKey && !String(reference).startsWith("PS-MANUAL-")) {
      try {
        const psRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        const psJson = await psRes.json();
        if (psRes.ok && psJson?.data?.status === "success") {
          verifiedAmountNaira = Number(psJson.data.amount || 0) / 100;
        }
      } catch (_) {}
    }

    if (verifiedAmountNaira <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const totalAmt = Number(inv.total_amount || 0);
    const prevPaid = Number(inv.amount_paid || (inv.status === "paid" ? totalAmt : 0));
    const newPaid = prevPaid + verifiedAmountNaira;
    const balanceRemaining = Math.max(0, totalAmt - newPaid);
    const nextStatus = balanceRemaining <= 0 ? "paid" : "partially_paid";

    const { data: updatedInvoice } = await db
      .from("invoices")
      .update({
        amount_paid: newPaid,
        status: nextStatus,
      })
      .eq("id", inv.id)
      .select()
      .maybeSingle();

    if (inv.project_id) {
      await db
        .from("studio_projects")
        .update({
          amount_paid: newPaid,
          status: balanceRemaining <= 0 ? "completed" : "in_progress",
        })
        .eq("id", inv.project_id);
    }

    const rctNo = `LS/RCT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    const optionLabel =
      paymentOption === "deposit_70"
        ? "Paystack (70% Deposit"
        : paymentOption === "balance"
        ? "Paystack (Balance Settlement"
        : "Paystack (100% Full Payment";

    const { data: newReceipt } = await db
      .from("payment_receipts")
      .insert({
        receipt_no: rctNo,
        invoice_id: inv.id,
        project_id: inv.project_id || null,
        reference_code: inv.invoice_no,
        client_name: inv.client_name,
        client_company: inv.client_company,
        client_email: inv.client_email,
        through_person: inv.through_person || inv.client_name,
        project_title: inv.project_title,
        total_contract_amount: totalAmt,
        previous_paid: prevPaid,
        amount_received: verifiedAmountNaira,
        balance_remaining: balanceRemaining,
        payment_method: `${optionLabel} • Ref: ${reference})`,
        issued_by: "Paystack Checkout",
      })
      .select()
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      invoice: updatedInvoice || { ...inv, amount_paid: newPaid, status: nextStatus },
      receipt: newReceipt,
      balanceRemaining,
      newPaid,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Verification error" }, { status: 500 });
  }
}
