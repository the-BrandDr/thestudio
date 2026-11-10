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

async function safeFetch(supabase: any, table: string) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (_) {
    return [];
  }
}

export async function GET() {
  try {
    const supabase = getDb();

    const [
      explicitLogs,
      explicitActivities,
      projectsSales,
      financeProjects,
      invoices,
      clientInvoices,
      receipts,
      clientReceipts,
      vouchers,
      quotes,
      leaves,
      portfolio,
    ] = await Promise.all([
      safeFetch(supabase, "staff_activity_logs"),
      safeFetch(supabase, "staff_activities"),
      safeFetch(supabase, "projects_sales"),
      safeFetch(supabase, "finance_projects"),
      safeFetch(supabase, "invoices"),
      safeFetch(supabase, "client_invoices"),
      safeFetch(supabase, "receipts"),
      safeFetch(supabase, "client_receipts"),
      safeFetch(supabase, "expense_vouchers"),
      safeFetch(supabase, "client_quotes"),
      safeFetch(supabase, "leave_requests"),
      safeFetch(supabase, "portfolio_projects"),
    ]);

    const unifiedFeed: any[] = [];
    const seenIds = new Set<string>();

    const pushItem = (item: any) => {
      if (!item || !item.id) return;
      const key = String(item.id);
      if (seenIds.has(key)) return;
      seenIds.add(key);
      unifiedFeed.push(item);
    };

    // 1. Explicit activity log rows
    for (const row of [...explicitLogs, ...explicitActivities]) {
      pushItem({
        id: `log-${row.id}`,
        staff_name: row.staff_name || row.actor_name || row.user_name || "Studio Staff",
        staff_code: row.staff_code || row.staff_id || "LS-STAFF",
        department: row.department || "Operations",
        action_type: row.action_type || row.action || "PORTAL_ACTION",
        module: row.module || row.category || "Workspace",
        description: row.description || row.details || row.title || "Performed portal activity",
        reference_code: row.reference_code || row.ref_code || "",
        created_at: row.created_at || new Date().toISOString(),
      });
    }

    // 2. Recorded Projects & Sales
    for (const p of [...projectsSales, ...financeProjects]) {
      const code = p.project_code || p.code || "";
      pushItem({
        id: `sale-${p.id || code}`,
        staff_name: p.recorded_by_name || p.staff_name || p.created_by || "Commercial / Finance Desk",
        staff_code: p.recorded_by_code || p.staff_code || "LS-FIN",
        department: "Projects & Sales",
        action_type: "RECORDED_SALE",
        module: "Projects & Sales",
        description: `Recorded project sale "${p.project_title || p.title || "Studio Project"}" for ${p.client_name || p.organization || "Client"} (₦${Number(p.contract_value || p.project_value || p.amount_paid || 0).toLocaleString()})`,
        reference_code: code,
        created_at: p.created_at || p.date || new Date().toISOString(),
      });
    }

    // 3. Generated Invoices
    for (const inv of [...invoices, ...clientInvoices]) {
      const code = inv.invoice_no || inv.invoice_code || "";
      pushItem({
        id: `inv-${inv.id || code}`,
        staff_name: inv.issued_by_name || inv.staff_name || inv.created_by || "Billing Desk",
        staff_code: inv.issued_by_code || inv.staff_code || "LS-BIL",
        department: "Billing & Invoices",
        action_type: "GENERATED_INVOICE",
        module: "Billing",
        description: `Generated official invoice ${code} for ${inv.client_name || inv.organization || "Client"} — Total: ₦${Number(inv.total_amount || inv.amount || 0).toLocaleString()} (${String(inv.status || "unpaid").toUpperCase()})`,
        reference_code: code,
        created_at: inv.created_at || inv.issue_date || new Date().toISOString(),
      });
    }

    // 4. Issued Receipts
    for (const r of [...receipts, ...clientReceipts]) {
      const code = r.receipt_no || r.receipt_code || "";
      pushItem({
        id: `rct-${r.id || code}`,
        staff_name: r.issued_by || r.staff_name || "Treasury Desk",
        staff_code: r.staff_code || "LS-FIN",
        department: "Treasury & Receipts",
        action_type: "ISSUED_RECEIPT",
        module: "Receipts",
        description: `Issued official payment receipt ${code} to ${r.organization || r.client_name || "Client"} — Received: ₦${Number(r.amount_received || r.amount || 0).toLocaleString()}`,
        reference_code: code,
        created_at: r.created_at || new Date().toISOString(),
      });
    }

    // 5. Client Commercial Quotes
    for (const q of quotes) {
      const code = q.quote_no || q.quote_code || "";
      pushItem({
        id: `quo-${q.id || code}`,
        staff_name: q.prepared_by || q.staff_name || "Client Relations Desk",
        staff_code: q.staff_code || "LS-CRM",
        department: "Inquiries & Quotes",
        action_type: "GENERATED_QUOTE",
        module: "Quotes",
        description: `Generated commercial quote ${code} for ${q.client_name || q.organization || "Client"} (₦${Number(q.total_amount || q.amount || 0).toLocaleString()})`,
        reference_code: code,
        created_at: q.created_at || new Date().toISOString(),
      });
    }

    // 6. Expense Vouchers & Direct Expenses
    for (const v of vouchers) {
      const code = v.voucher_no || v.voucher_code || "";
      const isDirect = String(v.staff_code || "") === "FIN-DIRECT" || String(code).startsWith("LV-EXP");
      pushItem({
        id: `vch-${v.id || code}`,
        staff_name: String(v.staff_name || "Staff Member").replace(/^\[DIRECT\]\s*/, ""),
        staff_code: v.staff_code === "FIN-DIRECT" ? "LS-FIN" : v.staff_code || "LS-STAFF",
        department: v.department || (isDirect ? "Finance & Treasury" : "Operations"),
        action_type: isDirect ? "RECORDED_EXPENSE" : `VOUCHER_${String(v.status || "SUBMITTED").toUpperCase()}`,
        module: "Expenses & Vouchers",
        description: isDirect
          ? `Recorded direct studio expense "${v.title}" (₦${Number(v.amount || 0).toLocaleString()}) under ${v.category}`
          : `Submitted expense voucher "${v.title}" (₦${Number(v.amount || 0).toLocaleString()}) — Status: ${String(v.status || "pending").toUpperCase()}`,
        reference_code: code,
        created_at: v.created_at || new Date().toISOString(),
      });
    }

    // 7. Staff Leave Requests
    for (const lv of leaves) {
      pushItem({
        id: `leave-${lv.id}`,
        staff_name: lv.staff_name || "Staff Member",
        staff_code: lv.staff_code || "LS-STAFF",
        department: lv.department || "HR & People Ops",
        action_type: `LEAVE_${String(lv.status || "REQUESTED").toUpperCase()}`,
        module: "HR Desk",
        description: `${lv.leave_type || "Leave"} request (${lv.start_date || ""} to ${lv.end_date || ""}) — Status: ${String(lv.status || "pending").toUpperCase()}`,
        reference_code: "",
        created_at: lv.created_at || new Date().toISOString(),
      });
    }

    // 8. Portfolio Projects Published
    for (const pf of portfolio) {
      pushItem({
        id: `port-${pf.id}`,
        staff_name: pf.created_by || "Brand & Media Team",
        staff_code: "LS-CMS",
        department: "Portfolio CMS",
        action_type: "PUBLISHED_PORTFOLIO",
        module: "Portfolio",
        description: `Published portfolio case study "${pf.title || "Project"}" (${pf.category || "Branding"})`,
        reference_code: pf.slug || "",
        created_at: pf.created_at || new Date().toISOString(),
      });
    }

    unifiedFeed.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return NextResponse.json({ data: unifiedFeed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load activity", data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getDb();

    const payload: Record<string, any> = {
      staff_name: body.staff_name || "Studio Staff",
      staff_code: body.staff_code || "LS-STAFF",
      department: body.department || "Operations",
      action_type: body.action_type || body.action || "PORTAL_ACTION",
      module: body.module || "Workspace",
      description: body.description || body.details || "",
      reference_code: body.reference_code || "",
    };

    const candidateTables = ["staff_activity_logs", "staff_activities", "activity_logs"];
    for (const tbl of candidateTables) {
      try {
        const { data, error } = await supabase.from(tbl).insert(payload).select("*").single();
        if (!error && data) {
          return NextResponse.json({ data });
        }
      } catch (_) {}
    }

    return NextResponse.json({ data: { id: `local-${Date.now()}`, ...payload, created_at: new Date().toISOString() } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to log activity" }, { status: 500 });
  }
}
