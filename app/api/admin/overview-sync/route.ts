import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function safeSelect(supabase: any, table: string) {
  try {
    const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (_) {
    return [];
  }
}

function dedupeRows(...lists: any[][]) {
  const map = new Map<string, any>();
  for (const list of lists) {
    for (const r of list || []) {
      if (!r) continue;
      const key = String(
        r.id ||
          r.project_code ||
          r.invoice_no ||
          r.invoice_code ||
          r.receipt_no ||
          r.receipt_code ||
          r.voucher_code ||
          r.voucher_no ||
          JSON.stringify(r)
      );
      if (!map.has(key)) map.set(key, r);
    }
  }
  return Array.from(map.values());
}

export async function GET() {
  try {
    const supabase = getDb();

    // Query every table used in Finance Desk + HR Desk
    const discovered = ["staff_profiles","studio_projects","client_invoices","payment_receipts","expense_vouchers","payroll_runs","tax_records","staff_tax_reliefs"];
    const tableResults: Record<string, any[]> = {};

    await Promise.all(
      Array.from(
        new Set([
          ...discovered,
          "finance_projects",
          "projects",
          "sales_records",
          "client_projects",
          "finance_invoices",
          "client_invoices",
          "invoices",
          "finance_receipts",
          "client_receipts",
          "receipts",
          "expense_vouchers",
          "payroll_records",
          "leave_requests",
          "contact_inquiries",
          "contact_messages",
          "client_quotes",
        ])
      ).map(async (tbl) => {
        tableResults[tbl] = await safeSelect(supabase, tbl);
      })
    );

    // Bucket rows into projects, invoices, receipts, vouchers, payroll, leaves, inquiries
    const projectArrays: any[][] = [];
    const invoiceArrays: any[][] = [];
    const receiptArrays: any[][] = [];
    const voucherArrays: any[][] = [];
    const payrollArrays: any[][] = [];

    for (const [tbl, rows] of Object.entries(tableResults)) {
      if (!rows || rows.length === 0) continue;
      const name = tbl.toLowerCase();
      if (name.includes("project") || name.includes("sale") || name === "clients" || name === "client_quotes") {
        projectArrays.push(rows);
      } else if (name.includes("invoice") && !name.includes("item")) {
        invoiceArrays.push(rows);
      } else if (name.includes("receipt")) {
        receiptArrays.push(rows);
      } else if (name.includes("voucher") || name.includes("expense")) {
        voucherArrays.push(rows);
      } else if (name.includes("payroll") || name.includes("salary")) {
        payrollArrays.push(rows);
      }
    }

    return NextResponse.json({
      projects: dedupeRows(...projectArrays),
      invoices: dedupeRows(...invoiceArrays),
      receipts: dedupeRows(...receiptArrays),
      allVouchers: dedupeRows(...voucherArrays),
      payroll: dedupeRows(...payrollArrays),
      allLeaves: dedupeRows(tableResults["leave_requests"] || []),
      inquiries: dedupeRows(
        tableResults["contact_inquiries"] || [],
        tableResults["contact_messages"] || [],
        tableResults["client_quotes"] || []
      ),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Sync error" }, { status: 500 });
  }
}
