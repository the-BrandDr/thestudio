"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import TaxComplianceSuite from "@/components/admin/tax-compliance-suite";
import OfficialDocumentModal from "@/components/admin/official-document-modal";
import { 
  Landmark, Briefcase, FileSpreadsheet, Users, ShieldAlert, Plus, Trash2, 
  ArrowUpRight, ArrowDownRight, Calculator, RefreshCw, Printer, Receipt, Link2, FileCheck
} from "lucide-react";

const STUDIO_SERVICES = [
  "Brand Strategy & Positioning",
  "Visual Identity & Logo Systems",
  "Event Branding & Experiential",
  "Out-of-Home (OOH) & Advertising",
  "Digital Product & UI/UX Design",
  "Web & Software Engineering",
  "Motion Graphics & Video Production",
  "Print Media & Packaging",
  "Design Training & Consultancy",
];

function computePayeWithRelief(monthlyGross: number, monthlyRelief: number = 0): { paye: number; net: number } {
  if (monthlyGross <= 0) return { paye: 0, net: 0 };
  const taxableMonthly = Math.max(0, monthlyGross - monthlyRelief);
  const annualTaxable = taxableMonthly * 12;

  let annualTax = 0;
  let rem = annualTaxable;

  const b1 = Math.min(rem, 800000);
  rem -= b1;
  if (rem > 0) { const b2 = Math.min(rem, 2200000); annualTax += b2 * 0.15; rem -= b2; }
  if (rem > 0) { const b3 = Math.min(rem, 9000000); annualTax += b3 * 0.18; rem -= b3; }
  if (rem > 0) { const b4 = Math.min(rem, 13000000); annualTax += b4 * 0.21; rem -= b4; }
  if (rem > 0) { const b5 = Math.min(rem, 25000000); annualTax += b5 * 0.23; rem -= b5; }
  if (rem > 0) { annualTax += rem * 0.25; }

  const paye = Math.round(annualTax / 12);
  const net = Math.max(0, monthlyGross - paye);
  return { paye, net };
}

export default function EnterpriseFinanceSuite() {
  const supabase = createClient();
  const [execViewOnly, setExecViewOnly] = React.useState(false);
  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data?.user?.email?.toLowerCase();
      if (!email || email === "hipheholluhayegboyin@gmail.com") return;
      const { data: prof } = await supabase.from("staff_profiles").select("*").eq("email", email).maybeSingle();
      if (prof) {
        const perms: string[] = prof.permissions || [prof.role];
        const hasFinanceWrite =
          prof.staff_id === "LS-01" ||
          prof.role === "super_admin" ||
          prof.role === "finance" ||
          perms.includes("super_admin") ||
          perms.includes("chief_strategist") ||
          perms.includes("head_of_finance") ||
          perms.includes("finance");
        if (!hasFinanceWrite) setExecViewOnly(true);
      }
    });
  }, [supabase]);
  const [activeTab, setActiveTab] = React.useState<"overview" | "sales" | "billing" | "receipts" | "payroll" | "tax">("overview");
  const [projectFilter, setProjectFilter] = React.useState<"all" | "ongoing" | "pending" | "completed">("all");
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [projectsSales, setProjectsSales] = React.useState<any[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [receipts, setReceipts] = React.useState<any[]>([]);
  const [vouchers, setVouchers] = React.useState<any[]>([]);
  const [payrollList, setPayrollList] = React.useState<any[]>([]);
  const [taxList, setTaxList] = React.useState<any[]>([]);
  const [reliefList, setReliefList] = React.useState<any[]>([]);
  const [staffList, setStaffList] = React.useState<any[]>([]);

  const [printDoc, setPrintDoc] = React.useState<{ type: "invoice" | "receipt" | "payslip"; data: any } | null>(null);

  const [receiptModal, setReceiptModal] = React.useState<{
    sourceType: "invoice" | "sale";
    record: any;
    amountToReceive: number;
    paymentMethod: string;
  } | null>(null);

  // Manual Receipt Form (From Receipts Panel)
  const [manualRct, setManualRct] = React.useState({
    linked_invoice_id: "",
    client_name: "",
    client_company: "",
    client_email: "",
    through_person: "",
    project_title: "",
    total_contract_amount: "",
    amount_received: "",
    payment_method: "Bank Transfer",
  });

  const [saleForm, setSaleForm] = React.useState({
    project_name: "",
    client_name: "",
    client_company: "",
    client_email: "",
    service_category: STUDIO_SERVICES[0],
    sale_type: "Project Contract",
    contract_value: "",
    amount_paid: "",
    vat_applicable: true,
    delivery_date: "",
    status: "in_progress",
  });

  const [invForm, setInvForm] = React.useState({
    project_id: "",
    client_name: "",
    client_email: "",
    client_company: "",
    through_person: "",
    project_title: "",
    due_date: "",
    discount_percent: 0,
    vat_rate: 7.5,
    payment_link: "",
    notes: "",
  });
  const [invItems, setInvItems] = React.useState<Array<{ service: string; description: string; qty: number; unitPrice: number }>>([
    { service: "", description: "", qty: 1, unitPrice: 0 },
  ]);

  const [payPeriod, setPayPeriod] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [taxPeriod, setTaxPeriod] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [companyTier, setCompanyTier] = React.useState<"small" | "standard">("small");
  const [reliefForm, setReliefForm] = React.useState({
    relief_type: "Annual Rent Relief",
    annual_expense_declared: "",
    proof_document: "",
    proof_name: "",
  });

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3200);
  };

  const loadFinanceData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const [
      { data: staffData },
      { data: salesData },
      { data: invData },
      { data: recData },
      { data: vcData },
      { data: payData },
      { data: txData },
      { data: relData }
    ] = await Promise.all([
      supabase.from("staff_profiles").select("*").order("staff_id", { ascending: true }),
      supabase.from("studio_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("client_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_receipts").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("payroll_runs").select("*").neq("status", "disbursed").order("created_at", { ascending: false }),
      supabase.from("tax_records").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_tax_reliefs").select("*").order("created_at", { ascending: false }),
    ]);

    if (staffData) {
      setStaffList(staffData);
      const me = staffData.find((s) => s.id === user?.id) || staffData[0];
      setCurrentUser(me);
    }
    if (salesData) setProjectsSales(salesData);
    if (invData) setInvoices(invData);
    if (recData) setReceipts(recData);
    if (vcData) setVouchers(vcData);
    if (payData) setPayrollList(payData);
    if (txData) setTaxList(txData);
    if (relData) setReliefList(relData);
  }, [supabase]);

  React.useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // STRICT ROLE ISOLATION (Super Admin cannot approve on behalf of HR or Finance unless they hold that specific role/designation)
  const myPerms: string[] = currentUser?.permissions || [];
  const isStrictlyHR = currentUser?.role === "hr" || (myPerms.includes("hr") && currentUser?.staff_id !== "LS-01");
  const isStrictlyChiefStrategist =
    currentUser?.staff_id === "LS-01" ||
    currentUser?.job_title?.toLowerCase().includes("chief strategist") ||
    currentUser?.role === "chief_strategist";
  const isStrictlyFinance =
    currentUser?.role === "finance" ||
    currentUser?.job_title?.toLowerCase().includes("finance") ||
    myPerms.includes("head_of_finance");

  // ============================================================================
  // UNIFIED PROJECTS & PAID INVOICES LIST + ZERO-DUPLICATION FINANCIAL MATH
  // ============================================================================
  // Any invoice not already linked to a studio_project is merged into the unified Projects view
  const unifiedProjects = React.useMemo(() => {
    const list = [...projectsSales];
    const existingCodes = new Set(list.map((p) => p.project_code));
    const existingIds = new Set(list.map((p) => p.id));

    invoices.forEach((inv) => {
      if (!inv.project_id || !existingIds.has(inv.project_id)) {
        if (!existingCodes.has(inv.invoice_no)) {
          const paidAmt = Number(inv.amount_paid || (inv.status === "paid" ? inv.total_amount : 0));
          const totalAmt = Number(inv.total_amount || 0);
          list.push({
            id: inv.id,
            isFromInvoice: true,
            project_code: inv.invoice_no,
            project_name: inv.project_title,
            client_name: inv.client_name,
            client_company: inv.client_company,
            client_email: inv.client_email,
            service_category: "Invoiced Project",
            sale_type: "Invoice",
            contract_value: totalAmt,
            amount_paid: paidAmt,
            status: paidAmt >= totalAmt && totalAmt > 0 ? "completed" : paidAmt > 0 ? "in_progress" : "lead",
            created_at: inv.created_at,
          });
        }
      }
    });

    // Also include standalone manual receipts (that had no project_id and no invoice_id)
    receipts.forEach((rct) => {
      if (!rct.project_id && !rct.invoice_id && !existingCodes.has(rct.receipt_no)) {
        list.push({
          id: rct.id,
          isFromReceipt: true,
          project_code: rct.receipt_no,
          project_name: rct.project_title,
          client_name: rct.client_name,
          client_company: rct.client_company,
          client_email: rct.client_email,
          service_category: "Direct Receipt",
          sale_type: "Manual Receipt",
          contract_value: Number(rct.total_contract_amount || rct.amount_received || 0),
          amount_paid: Number(rct.amount_received || 0),
          status: Number(rct.balance_remaining || 0) <= 0 ? "completed" : "in_progress",
          created_at: rct.created_at,
        });
      }
    });

    return list;
  }, [projectsSales, invoices, receipts]);

  const filteredProjects = unifiedProjects.filter((p) => {
    if (projectFilter === "all") return true;
    const bal = Math.max(0, Number(p.contract_value || 0) - Number(p.amount_paid || 0));
    if (projectFilter === "completed") return p.status === "completed" || (bal <= 0 && Number(p.contract_value) > 0);
    if (projectFilter === "pending") return p.status === "lead" || Number(p.amount_paid || 0) === 0;
    if (projectFilter === "ongoing") return p.status === "in_progress" || p.status === "review" || (Number(p.amount_paid) > 0 && bal > 0);
    return true;
  });

  // Non-duplicated Total Inflow, Sales Pipeline, and Unpaid Balance:
  const totalInflow = unifiedProjects.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const salesPipelineTotal = unifiedProjects.reduce((sum, p) => sum + Number(p.contract_value || 0), 0);
  const unpaidProjectBalance = Math.max(0, salesPipelineTotal - totalInflow);
  const paidVouchersTotal = vouchers.filter((v) => v.status === "paid").reduce((a, b) => a + Number(b.amount || 0), 0);

  // --- RECORD PROJECT / SALE ---
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const code = "LS/PRJ/" + Math.floor(1000 + Math.random() * 9000);
    const paidAmt = Number(saleForm.amount_paid || 0);
    const contractVal = Number(saleForm.contract_value || 0);

    const { data: inserted, error } = await supabase.from("studio_projects").insert({
      project_code: code,
      project_name: saleForm.project_name,
      client_name: saleForm.client_name,
      client_company: saleForm.client_company,
      client_email: saleForm.client_email,
      service_category: saleForm.service_category,
      sale_type: saleForm.sale_type,
      contract_value: contractVal,
      amount_paid: paidAmt,
      vat_applicable: saleForm.vat_applicable,
      lead_staff: currentUser ? `${currentUser.first_name} (${currentUser.staff_id})` : "LS-01",
      delivery_date: saleForm.delivery_date || null,
      status: paidAmt >= contractVal && contractVal > 0 ? "completed" : saleForm.status,
    }).select().single();

    if (!error && inserted && paidAmt > 0) {
      await supabase.from("payment_receipts").insert({
        receipt_no: "LS/RCT/" + Math.floor(1000 + Math.random() * 9000),
        project_id: inserted.id,
        reference_code: code,
        client_name: saleForm.client_name,
        client_company: saleForm.client_company,
        client_email: saleForm.client_email,
        project_title: saleForm.project_name,
        total_contract_amount: contractVal,
        previous_paid: 0,
        amount_received: paidAmt,
        balance_remaining: Math.max(0, contractVal - paidAmt),
        payment_method: "Bank Transfer",
        issued_by: currentUser ? `${currentUser.first_name} (${currentUser.staff_id})` : "Finance",
      });
    }

    setSaving(false);
    showToast("Project saved");
    setSaleForm({ ...saleForm, project_name: "", client_name: "", client_company: "", client_email: "", contract_value: "", amount_paid: "" });
    loadFinanceData();
  };

  const raiseBalanceInvoice = (sale: any) => {
    const remaining = Math.max(0, Number(sale.contract_value || 0) - Number(sale.amount_paid || 0));
    setInvForm({
      ...invForm,
      project_id: sale.isFromInvoice ? "" : sale.id,
      client_name: sale.client_name,
      client_company: sale.client_company || "",
      client_email: sale.client_email || "",
      through_person: sale.client_name,
      project_title: sale.project_name,
      discount_percent: 0,
      vat_rate: 7.5,
    });
    setInvItems([
      {
        service: sale.service_category?.split(" ")[0]?.toUpperCase() || "SERVICE",
        description: `Balance settlement for ${sale.project_name} (Contract: ₦${Number(sale.contract_value).toLocaleString()} | Paid: ₦${Number(sale.amount_paid).toLocaleString()})`,
        qty: 1,
        unitPrice: remaining > 0 ? remaining : Number(sale.contract_value || 0),
      },
    ]);
    setActiveTab("billing");
  };

  // --- BILLING & INVOICE CREATION ---
  const invSubtotal = invItems.reduce((acc, r) => acc + Number(r.qty || 0) * Number(r.unitPrice || 0), 0);
  const discountPct = Math.min(100, Math.max(0, Number(invForm.discount_percent || 0)));
  const computedDiscountAmount = Math.round((invSubtotal * discountPct) / 100);
  const netAfterDiscount = Math.max(0, invSubtotal - computedDiscountAmount);
  const computedVat = Math.round((netAfterDiscount * Number(invForm.vat_rate || 0)) / 100);
  const computedInvoiceTotal = netAfterDiscount + computedVat;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invSubtotal <= 0) return;
    setSaving(true);
    const d = new Date();
    const mmYY = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
    const seq = String(invoices.length + 1).padStart(2, "0");
    const invNo = `LS/BRANDS/${mmYY}/${seq}`;
    const payUrl = invForm.payment_link.trim() || `https://paystack.com/pay/laviestudios-${Date.now().toString().slice(-5)}`;

    const { error } = await supabase.from("client_invoices").insert({
      invoice_no: invNo,
      project_id: invForm.project_id || null,
      client_name: invForm.client_name,
      client_email: invForm.client_email,
      client_company: invForm.client_company,
      through_person: invForm.through_person || invForm.client_name,
      project_title: invForm.project_title,
      due_date: invForm.due_date || null,
      line_items: invItems,
      subtotal: invSubtotal,
      discount_percent: discountPct,
      discount_amount: computedDiscountAmount,
      vat_rate: Number(invForm.vat_rate),
      vat_amount: computedVat,
      total_amount: computedInvoiceTotal,
      amount_paid: 0,
      payment_link: payUrl,
      status: "unpaid",
      bank_name: "United Bank for Africa (UBA)",
      bank_account_name: "Lavie Studios",
      bank_account_no: "1028396685",
      notes: invForm.notes,
      created_by: currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Finance Desk",
    });

    setSaving(false);
    if (!error) {
      showToast(`Invoice ${invNo} created`);
      setInvForm({ ...invForm, project_id: "", client_name: "", client_email: "", client_company: "", through_person: "", project_title: "", discount_percent: 0, payment_link: "", notes: "" });
      setInvItems([{ service: "", description: "", qty: 1, unitPrice: 0 }]);
      loadFinanceData();
    }
  };

  // --- GENERATE RECEIPT FROM INVOICE OR PROJECT (NON-DUPLICATING) ---
  const handleConfirmPaymentAndReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModal) return;
    setSaving(true);

    const { sourceType, record, amountToReceive, paymentMethod } = receiptModal;
    const rctNo = `LS/RCT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    const actor = currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Finance Desk";

    if (sourceType === "invoice") {
      const totalAmt = Number(record.total_amount || 0);
      const prevPaid = Number(record.amount_paid || 0);
      const newPaid = prevPaid + Number(amountToReceive || 0);
      const bal = Math.max(0, totalAmt - newPaid);
      const nextStatus = bal <= 0 ? "paid" : "partial";

      await supabase.from("client_invoices").update({
        amount_paid: newPaid,
        status: nextStatus,
      }).eq("id", record.id);

      // Sync with linked studio_project (or create/update matching project row without double counting)
      if (record.project_id) {
        const linkedSale = projectsSales.find((p) => p.id === record.project_id);
        if (linkedSale) {
          const updatedSalePaid = Number(linkedSale.amount_paid || 0) + Number(amountToReceive || 0);
          await supabase.from("studio_projects").update({
            amount_paid: updatedSalePaid,
            status: updatedSalePaid >= Number(linkedSale.contract_value) ? "completed" : "in_progress",
          }).eq("id", linkedSale.id);
        }
      } else {
        const existingByCode = projectsSales.find((p) => p.project_code === record.invoice_no);
        if (existingByCode) {
          await supabase.from("studio_projects").update({
            amount_paid: newPaid,
            status: bal <= 0 ? "completed" : "in_progress",
          }).eq("id", existingByCode.id);
        } else {
          const { data: createdPrj } = await supabase.from("studio_projects").insert({
            project_code: record.invoice_no,
            project_name: record.project_title,
            client_name: record.client_name,
            client_company: record.client_company,
            client_email: record.client_email,
            service_category: "Invoiced Project",
            sale_type: "Invoice",
            contract_value: totalAmt,
            amount_paid: newPaid,
            status: bal <= 0 ? "completed" : "in_progress",
            lead_staff: actor,
          }).select().single();
          if (createdPrj) {
            await supabase.from("client_invoices").update({ project_id: createdPrj.id }).eq("id", record.id);
          }
        }
      }

      const { data: newReceipt } = await supabase.from("payment_receipts").insert({
        receipt_no: rctNo,
        invoice_id: record.id,
        project_id: record.project_id || null,
        reference_code: record.invoice_no,
        client_name: record.client_name,
        client_company: record.client_company,
        client_email: record.client_email,
        through_person: record.through_person || record.client_name,
        project_title: record.project_title,
        total_contract_amount: totalAmt,
        previous_paid: prevPaid,
        amount_received: Number(amountToReceive),
        balance_remaining: bal,
        payment_method: paymentMethod,
        issued_by: actor,
      }).select().single();

      setReceiptModal(null);
      await loadFinanceData();
      if (newReceipt) setPrintDoc({ type: "receipt", data: newReceipt });
    } else {
      const totalAmt = Number(record.contract_value || 0);
      const prevPaid = Number(record.amount_paid || 0);
      const newPaid = prevPaid + Number(amountToReceive || 0);
      const bal = Math.max(0, totalAmt - newPaid);

      await supabase.from("studio_projects").update({
        amount_paid: newPaid,
        status: bal <= 0 ? "completed" : "in_progress",
      }).eq("id", record.id);

      const { data: newReceipt } = await supabase.from("payment_receipts").insert({
        receipt_no: rctNo,
        project_id: record.id,
        reference_code: record.project_code,
        client_name: record.client_name,
        client_company: record.client_company,
        client_email: record.client_email,
        through_person: record.client_name,
        project_title: record.project_name,
        total_contract_amount: totalAmt,
        previous_paid: prevPaid,
        amount_received: Number(amountToReceive),
        balance_remaining: bal,
        payment_method: paymentMethod,
        issued_by: actor,
      }).select().single();

      setReceiptModal(null);
      await loadFinanceData();
      if (newReceipt) setPrintDoc({ type: "receipt", data: newReceipt });
    }
    setSaving(false);
  };

  // --- MANUAL RECEIPT CREATION FROM RECEIPTS PANEL ---
  const handleCreateManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const rctNo = `LS/RCT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    const actor = currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Finance Desk";

    // If linked to an existing invoice, settle that invoice without duplicating revenue!
    if (manualRct.linked_invoice_id) {
      const inv = invoices.find((i) => i.id === manualRct.linked_invoice_id);
      if (inv) {
        setSaving(false);
        setReceiptModal({
          sourceType: "invoice",
          record: inv,
          amountToReceive: Number(manualRct.amount_received || inv.total_amount),
          paymentMethod: manualRct.payment_method,
        });
        return;
      }
    }

    const contractAmt = Number(manualRct.total_contract_amount || manualRct.amount_received || 0);
    const receivedAmt = Number(manualRct.amount_received || 0);
    const bal = Math.max(0, contractAmt - receivedAmt);

    // Also record as a studio_project so it appears in Projects & Sales without double counting
    const { data: newPrj } = await supabase.from("studio_projects").insert({
      project_code: rctNo,
      project_name: manualRct.project_title,
      client_name: manualRct.client_name,
      client_company: manualRct.client_company,
      client_email: manualRct.client_email,
      service_category: "Direct Receipt",
      sale_type: "Direct Payment",
      contract_value: contractAmt,
      amount_paid: receivedAmt,
      status: bal <= 0 ? "completed" : "in_progress",
      lead_staff: actor,
    }).select().single();

    const { data: createdRct } = await supabase.from("payment_receipts").insert({
      receipt_no: rctNo,
      project_id: newPrj?.id || null,
      reference_code: rctNo,
      client_name: manualRct.client_name,
      client_company: manualRct.client_company,
      client_email: manualRct.client_email,
      through_person: manualRct.through_person || manualRct.client_name,
      project_title: manualRct.project_title,
      total_contract_amount: contractAmt,
      previous_paid: 0,
      amount_received: receivedAmt,
      balance_remaining: bal,
      payment_method: manualRct.payment_method,
      issued_by: actor,
    }).select().single();

    setSaving(false);
    setManualRct({
      linked_invoice_id: "",
      client_name: "",
      client_company: "",
      client_email: "",
      through_person: "",
      project_title: "",
      total_contract_amount: "",
      amount_received: "",
      payment_method: "Bank Transfer",
    });
    await loadFinanceData();
    if (createdRct) setPrintDoc({ type: "receipt", data: createdRct });
  };

  // --- PAYROLL: SINGLE UNIFIED "SYNC & GENERATE UNAPPROVED" PULLING EXACT ONBOARDED SALARY ---
  const getStaffApprovedRelief = (staffCode: string) => {
    return reliefList
      .filter((r) => r.staff_code === staffCode && r.status === "approved")
      .reduce((a, b) => a + Number(b.approved_monthly_relief || 0), 0);
  };

  const handleSyncAndGeneratePayroll = async () => {
    setSaving(true);
    // 1. Delete any unapproved rows for this payPeriod so we never have stale/duplicate rows
    const unapprovedIds = payrollList
      .filter((p) => p.pay_period === payPeriod && !(p.hr_status === "approved" && p.strategist_status === "approved"))
      .map((p) => p.id);

    if (unapprovedIds.length > 0) {
      await supabase.from("payroll_runs").delete().in("id", unapprovedIds);
    }

    // 2. Pull all active staff and use their exact onboarded salary_amount from staff_profiles
    const eligibleStaff = staffList.filter((s) => s.status !== "terminated" && s.status !== "suspended");
    const approvedCodes = payrollList
      .filter((p) => p.pay_period === payPeriod && p.hr_status === "approved" && p.strategist_status === "approved")
      .map((p) => p.staff_code);

    const freshEntries = eligibleStaff
      .filter((s) => !approvedCodes.includes(s.staff_id))
      .map((s) => {
        const onboardedSalary = Number(s.salary_amount || 0);
        const relief = getStaffApprovedRelief(s.staff_id);
        const { paye, net } = computePayeWithRelief(onboardedSalary, relief);
        return {
          pay_period: payPeriod,
          staff_id: s.id,
          staff_code: s.staff_id,
          staff_name: `${s.first_name} ${s.last_name}`,
          department: s.department || "Executive",
          hierarchy_level: (s.hierarchy_level || "L3").split(" - ")[0],
          basic_salary: onboardedSalary,
          bonuses: 0,
          tax_relief_applied: relief,
          paye_tax: paye,
          pension_deduction: 0,
          net_pay: net,
          bank_name: s.bank_name || "Not Set",
          bank_account_name: s.bank_account_name || `${s.first_name} ${s.last_name}`,
          bank_account_no: s.bank_account_no || "Not Set",
          hr_status: "pending",
          strategist_status: "pending",
          status: "pending",
          processed_by: currentUser ? `${currentUser.first_name} (${currentUser.staff_id})` : "Finance",
        };
      });

    if (freshEntries.length > 0) {
      await supabase.from("payroll_runs").insert(freshEntries);
    }
    await loadFinanceData();
    setSaving(false);
    showToast(`Synced ${payPeriod} payroll from staff onboarding records`);
  };

  const handleRecalculatePayrollRow = async (pr: any, newBasic: number, newBonus: number) => {
    const gross = Number(newBasic || 0) + Number(newBonus || 0);
    const relief = getStaffApprovedRelief(pr.staff_code);
    const { paye, net } = computePayeWithRelief(gross, relief);
    await supabase.from("payroll_runs").update({
      basic_salary: newBasic,
      bonuses: newBonus,
      tax_relief_applied: relief,
      pension_deduction: 0,
      paye_tax: paye,
      net_pay: net,
    }).eq("id", pr.id);
    if (pr.staff_id) {
      await supabase.from("staff_profiles").update({ salary_amount: newBasic }).eq("id", pr.staff_id);
    }
    loadFinanceData();
  };

  const handlePayrollApproval = async (pr: any, stage: "hr" | "strategist") => {
    if (stage === "hr" && !isStrictlyHR) {
      alert("Only designated HR personnel can sign off on HR payroll approval.");
      return;
    }
    if (stage === "strategist" && !isStrictlyChiefStrategist) {
      alert("Only the Chief Strategist can sign off on Strategist payroll approval.");
      return;
    }
    const actor = `${currentUser?.first_name} (${currentUser?.staff_id})`;
    const nextHr = stage === "hr" ? "approved" : (pr.hr_status || "pending");
    const nextStrat = stage === "strategist" ? "approved" : (pr.strategist_status || "pending");
    const overall = nextHr === "approved" && nextStrat === "approved" ? "approved" : "pending";

    await supabase.from("payroll_runs").update({
      hr_status: nextHr,
      hr_by: stage === "hr" ? actor : pr.hr_by,
      strategist_status: nextStrat,
      strategist_by: stage === "strategist" ? actor : pr.strategist_by,
      status: overall,
    }).eq("id", pr.id);
    loadFinanceData();
  };

  const handleDisbursePayrollRow = async (id: string) => {
    await supabase.from("payroll_runs").delete().eq("id", id);
    showToast("Disbursed & removed from pending queue");
    loadFinanceData();
  };

  // --- TAX & RELIEF ---
  const handleReliefProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReliefForm((prev) => ({
        ...prev,
        proof_document: ev.target?.result as string,
        proof_name: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileTaxRelief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    const annualExp = Number(reliefForm.annual_expense_declared || 0);
    const annualRelief = Math.min(500000, Math.round(annualExp * 0.2));
    const monthlyRelief = Math.round(annualRelief / 12);

    await supabase.from("staff_tax_reliefs").insert({
      staff_id: currentUser.id,
      staff_code: currentUser.staff_id,
      staff_name: `${currentUser.first_name} ${currentUser.last_name}`,
      relief_type: reliefForm.relief_type,
      annual_expense_declared: annualExp,
      approved_monthly_relief: monthlyRelief,
      proof_document: reliefForm.proof_document || null,
      proof_name: reliefForm.proof_name || null,
      status: "pending",
    });

    setReliefForm({ relief_type: "Annual Rent Relief", annual_expense_declared: "", proof_document: "", proof_name: "" });
    setSaving(false);
    showToast("Tax relief filed");
    loadFinanceData();
  };

  const handleApproveTaxRelief = async (rel: any, status: "approved" | "rejected") => {
    const actor = `${currentUser?.first_name} (${currentUser?.staff_id})`;
    await supabase.from("staff_tax_reliefs").update({ status, approved_by: actor }).eq("id", rel.id);

    if (status === "approved") {
      const staffPayrolls = payrollList.filter((p) => p.staff_code === rel.staff_code);
      for (const pr of staffPayrolls) {
        const gross = Number(pr.basic_salary || 0) + Number(pr.bonuses || 0);
        const { paye, net } = computePayeWithRelief(gross, Number(rel.approved_monthly_relief || 0));
        await supabase.from("payroll_runs").update({
          tax_relief_applied: Number(rel.approved_monthly_relief || 0),
          paye_tax: paye,
          net_pay: net,
        }).eq("id", pr.id);
      }
    }
    loadFinanceData();
  };

  const outputVat = invoices.filter((i) => i.status !== "draft").reduce((a, b) => a + Number(b.vat_amount || 0), 0);
  const inputVatCredit = Math.round(paidVouchersTotal * 0.075);
  const netVatPayable = Math.max(0, outputVat - inputVatCredit);
  const periodPayeTotal = payrollList.filter((p) => p.pay_period === taxPeriod).reduce((a, b) => a + Number(b.paye_tax || 0), 0);
  const totalPayrollCost = payrollList.reduce((a, b) => a + Number(b.basic_salary || 0) + Number(b.bonuses || 0), 0);
  const assessableProfit = Math.max(0, totalInflow - paidVouchersTotal - totalPayrollCost);
  const computedCit = companyTier === "small" ? 0 : Math.round(assessableProfit * 0.25);
  const computedDevLevy = companyTier === "small" ? 0 : Math.round(assessableProfit * 0.04);

  const handleAutoComputeTax = async () => {
    setSaving(true);
    const actor = currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "Finance Desk";
    const due = `${taxPeriod}-21`;
    await supabase.from("tax_records").delete().eq("tax_period", taxPeriod).neq("status", "remitted");
    await supabase.from("tax_records").insert([
      { tax_period: taxPeriod, tax_type: "VAT (7.5%)", taxable_base: totalInflow, input_vat_credit: inputVatCredit, tax_amount: netVatPayable, filing_reference: `VAT-${taxPeriod}`, status: "computed", due_date: due, filed_by: actor },
      { tax_period: taxPeriod, tax_type: "PAYE Tax", taxable_base: totalPayrollCost, tax_amount: periodPayeTotal, filing_reference: `PAYE-${taxPeriod}`, status: "computed", due_date: due, filed_by: actor },
      { tax_period: taxPeriod, tax_type: companyTier === "small" ? "Company Tax (Exempt)" : "CIT (25%) + Levy (4%)", taxable_base: assessableProfit, dev_levy: computedDevLevy, tax_amount: computedCit + computedDevLevy, filing_reference: `CIT-${taxPeriod}`, status: companyTier === "small" ? "filed" : "computed", due_date: due, filed_by: actor },
    ]);
    setSaving(false);
    showToast(`Computed ${taxPeriod}`);
    loadFinanceData();
  };

  return (
    <div className="space-y-5">
      <div className="bg-[var(--bg-card)] px-3 py-2 rounded-2xl border border-[var(--border-subtle)]/60 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "overview", label: "Overview", icon: Landmark },
            { id: "sales", label: "Projects & Sales", icon: Briefcase, badge: unifiedProjects.length },
            { id: "billing", label: "Billing", icon: FileSpreadsheet, badge: invoices.length },
            { id: "receipts", label: "Receipts", icon: Receipt, badge: receipts.length },
            { id: "payroll", label: "Payroll", icon: Users, badge: payrollList.length },
            { id: "tax", label: "Tax", icon: ShieldAlert, badge: taxList.filter(t => t.status !== "remitted").length },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[var(--text-primary)] text-[var(--bg-main)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]/60"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className={`text-[10px] font-mono px-1.5 rounded-full ${active ? "bg-black/20 text-[var(--bg-main)]" : "bg-[#c7cb2d]/20 text-[#c7cb2d]"}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {notice && <span className="text-xs font-mono font-bold text-[#c7cb2d] px-2">{notice}</span>}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-5 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Total Inflow</span>
                <ArrowUpRight className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="text-2xl font-display font-bold text-[#c7cb2d]">₦{totalInflow.toLocaleString()}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-dim)] pt-1">
                <span>Sales Pipeline: ₦{salesPipelineTotal.toLocaleString()}</span>
                <span className="text-amber-400">Unpaid: ₦{unpaidProjectBalance.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Expenses Paid</span>
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-display font-bold">₦{paidVouchersTotal.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-[var(--text-dim)] pt-1">
                {vouchers.filter(v => v.status === "paid").length} cleared vouchers
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Net Balance</span>
                <Landmark className="w-4 h-4 text-[#c7cb2d]" />
              </div>
              <p className="text-2xl font-display font-bold text-[#c7cb2d]">
                ₦{(totalInflow - paidVouchersTotal).toLocaleString()}
              </p>
              <p className="text-[10px] font-mono text-[var(--text-dim)] pt-1">Available operating cash</p>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Tax Due</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-display font-bold text-amber-400">
                ₦{(netVatPayable + periodPayeTotal + computedCit + computedDevLevy).toLocaleString()}
              </p>
              <p className="text-[10px] font-mono text-[var(--text-dim)] pt-1">
                VAT: ₦{netVatPayable.toLocaleString()} • PAYE: ₦{periodPayeTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">Projects & Sales (Including Paid Invoices)</h3>
                <button onClick={() => setActiveTab("sales")} className="text-xs text-[#c7cb2d] cursor-pointer">View All →</button>
              </div>
              <div className="space-y-2">
                {unifiedProjects.slice(0, 6).map((pr) => {
                  const bal = Math.max(0, Number(pr.contract_value || 0) - Number(pr.amount_paid || 0));
                  return (
                    <div key={pr.id} className="p-3 rounded-2xl bg-[var(--bg-main)] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold">{pr.project_name}</p>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">{pr.project_code} • {pr.client_company || pr.client_name}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-xs font-bold text-[#c7cb2d]">Paid: ₦{Number(pr.amount_paid).toLocaleString()}</p>
                        <span className="text-[10px] text-[var(--text-dim)]">Unpaid: ₦{bal.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">Recent Invoices</h3>
                <button onClick={() => setActiveTab("billing")} className="text-xs text-[#c7cb2d] cursor-pointer">View All →</button>
              </div>
              <div className="space-y-2">
                {invoices.slice(0, 6).map((inv) => (
                  <div key={inv.id} className="p-3 rounded-2xl bg-[var(--bg-main)] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">{inv.client_company || inv.client_name}</p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">{inv.invoice_no} • {inv.project_title}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-xs font-bold text-[#c7cb2d]">₦{Number(inv.total_amount).toLocaleString()}</p>
                      <span className="text-[9px] uppercase text-[var(--text-dim)]">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UNIFIED PROJECTS & SALES (ONGOING, PENDING, COMPLETED + PAID INVOICES) */}
      {activeTab === "sales" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print:hidden">
          <form onSubmit={(e) => { if (execViewOnly) { e.preventDefault(); alert("Executive Oversight Mode (View-Only): You have full visibility into Finance operations, but modifying financial records requires Finance clearance."); return; } return handleRecordSale(e); }} className="lg:col-span-4 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
            <h2 className="font-display text-base font-bold">Record Project</h2>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project Title</label>
              <input type="text" required value={saleForm.project_name} onChange={(e) => setSaleForm({ ...saleForm, project_name: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client Name</label>
                <input type="text" required value={saleForm.client_name} onChange={(e) => setSaleForm({ ...saleForm, client_name: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Organization</label>
                <input type="text" value={saleForm.client_company} onChange={(e) => setSaleForm({ ...saleForm, client_company: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client Email</label>
              <input type="email" value={saleForm.client_email} onChange={(e) => setSaleForm({ ...saleForm, client_email: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project Value (₦)</label>
                <input type="number" required value={saleForm.contract_value} onChange={(e) => setSaleForm({ ...saleForm, contract_value: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Amount Paid (₦)</label>
                <input type="number" value={saleForm.amount_paid} onChange={(e) => setSaleForm({ ...saleForm, amount_paid: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer">
              Save Project
            </button>
          </form>

          <div className="lg:col-span-8 bg-[var(--bg-card)] p-5 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold">All Projects & Paid Invoices</h2>
              <div className="flex items-center gap-1">
                {(["all", "ongoing", "pending", "completed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setProjectFilter(f)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase cursor-pointer ${
                      projectFilter === f ? "bg-[#c7cb2d] text-black font-bold" : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredProjects.map((sale) => {
                const bal = Math.max(0, Number(sale.contract_value || 0) - Number(sale.amount_paid || 0));
                const badgeLabel =
                  bal <= 0 && Number(sale.contract_value) > 0
                    ? "Completed"
                    : Number(sale.amount_paid) > 0
                    ? "Ongoing"
                    : "Pending";

                return (
                  <div key={sale.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                            {sale.project_code}
                          </span>
                          <span className="text-xs font-bold">{sale.project_name}</span>
                          <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                            badgeLabel === "Completed" ? "bg-[#c7cb2d]/15 text-[#c7cb2d]" : badgeLabel === "Ongoing" ? "bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-subtle)]" : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {sale.client_company || sale.client_name} • {sale.sale_type}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-sm font-bold text-[#c7cb2d]">
                          Total Value: ₦{Number(sale.contract_value).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[var(--text-dim)]">
                          Amount Paid: ₦{Number(sale.amount_paid).toLocaleString()} • Remaining Balance: ₦{bal.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {bal > 0 && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                        {!sale.isFromInvoice && (
                          <button
                            onClick={() =>
                              setReceiptModal({
                                sourceType: "sale",
                                record: sale,
                                amountToReceive: bal,
                                paymentMethod: "Bank Transfer",
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold text-[10px] font-mono uppercase cursor-pointer"
                          >
                            Issue Receipt
                          </button>
                        )}
                        <button
                          onClick={() => raiseBalanceInvoice(sale)}
                          className="px-2.5 py-1 rounded-lg bg-[#c7cb2d]/20 text-[#c7cb2d] text-[10px] font-mono uppercase font-bold cursor-pointer"
                        >
                          Invoice Remaining Balance (₦{bal.toLocaleString()}) →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredProjects.length === 0 && <p className="text-xs text-[var(--text-muted)] py-8 text-center">No projects in this filter.</p>}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BILLING */}
      {activeTab === "billing" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print:hidden">
          <form onSubmit={(e) => { if (execViewOnly) { e.preventDefault(); alert("Executive Oversight Mode (View-Only): You have full visibility into Finance operations, but modifying financial records requires Finance clearance."); return; } return handleCreateInvoice(e); }} className="lg:col-span-5 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit">
            <h2 className="font-display text-base font-bold">Create Invoice</h2>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Organization (FOR)</label>
                <input type="text" required value={invForm.client_company} onChange={(e) => setInvForm({ ...invForm, client_company: e.target.value, client_name: invForm.client_name || e.target.value })} placeholder="Client or Organization Name" className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Through (Contact Person)</label>
                <input type="text" required value={invForm.through_person} onChange={(e) => setInvForm({ ...invForm, through_person: e.target.value, client_name: e.target.value })} placeholder="Client Representative Name" className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project Title</label>
                <input type="text" required value={invForm.project_title} onChange={(e) => setInvForm({ ...invForm, project_title: e.target.value })} placeholder="Project or Campaign Title" className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client Email</label>
                <input type="email" value={invForm.client_email} onChange={(e) => setInvForm({ ...invForm, client_email: e.target.value })} placeholder="client@email.com" className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--bg-main)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] font-bold">Invoice Line Items</span>
                <button
                  type="button"
                  onClick={() => setInvItems([...invItems, { service: "BRANDING", description: "", qty: 1, unitPrice: 0 }])}
                  className="text-[10px] font-mono text-[#c7cb2d] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>

              {invItems.map((row, idx) => (
                <div key={idx} className="space-y-1.5 pb-2 border-b border-[var(--border-subtle)]/40">
                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Service Category"
                      value={row.service}
                      onChange={(e) => {
                        const copy = [...invItems];
                        copy[idx].service = e.target.value;
                        setInvItems(copy);
                      }}
                      className="col-span-5 bg-[var(--bg-card)] rounded-lg px-2 py-1.5 text-xs font-bold uppercase"
                    />
                    <input
                      type="number"
                      min="1"
                      value={row.qty}
                      onChange={(e) => {
                        const copy = [...invItems];
                        copy[idx].qty = Number(e.target.value);
                        setInvItems(copy);
                      }}
                      className="col-span-2 bg-[var(--bg-card)] rounded-lg px-2 py-1.5 text-xs text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Cost ₦"
                      value={row.unitPrice || ""}
                      onChange={(e) => {
                        const copy = [...invItems];
                        copy[idx].unitPrice = Number(e.target.value);
                        setInvItems(copy);
                      }}
                      className="col-span-4 bg-[var(--bg-card)] rounded-lg px-2 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setInvItems(invItems.filter((_, i) => i !== idx))}
                      disabled={invItems.length === 1}
                      className="col-span-1 text-[var(--text-dim)] hover:text-red-400 flex justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Detailed description..."
                    value={row.description}
                    onChange={(e) => {
                      const copy = [...invItems];
                      copy[idx].description = e.target.value;
                      setInvItems(copy);
                    }}
                    className="w-full bg-[var(--bg-card)] rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">Discount (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={invForm.discount_percent || ""} onChange={(e) => setInvForm({ ...invForm, discount_percent: Number(e.target.value) })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-[var(--text-dim)] mb-1">VAT (%)</label>
                <input type="number" step="0.5" value={invForm.vat_rate} onChange={(e) => setInvForm({ ...invForm, vat_rate: Number(e.target.value) })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--bg-main)] space-y-1 text-xs font-mono">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Subtotal:</span>
                <span>₦{invSubtotal.toLocaleString()}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount ({discountPct}%):</span>
                  <span>-₦{computedDiscountAmount.toLocaleString()}</span>
                </div>
              )}
              {Number(invForm.vat_rate) > 0 && (
                <div className="flex justify-between text-[#c7cb2d]">
                  <span>VAT ({invForm.vat_rate}%):</span>
                  <span>+₦{computedVat.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[#c7cb2d] pt-1 border-t border-[var(--border-subtle)]">
                <span>Total Due:</span>
                <span>₦{computedInvoiceTotal.toLocaleString()}</span>
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer">
              Generate Invoice
            </button>
          </form>

          <div className="lg:col-span-7 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <h2 className="font-display text-base font-bold">Invoices</h2>
            <div className="space-y-3">
              {invoices.map((inv) => {
                const paid = Number(inv.amount_paid || (inv.status === "paid" ? inv.total_amount : 0));
                const bal = Math.max(0, Number(inv.total_amount || 0) - paid);
                return (
                  <div key={inv.id} className="p-4 rounded-2xl bg-[var(--bg-main)] space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                            {inv.invoice_no}
                          </span>
                          <span className="text-xs font-bold">{inv.client_company || inv.client_name}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{inv.project_title}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-sm font-bold text-[#c7cb2d]">Total: ₦{Number(inv.total_amount).toLocaleString()}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">
                          Subtotal: ₦{Number(inv.subtotal).toLocaleString()} • VAT: ₦{Number(inv.vat_amount).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[#c7cb2d]">
                          Amount Paid: ₦{paid.toLocaleString()} • Balance Due: ₦{bal.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                          {inv.status}
                        </span>
                        {inv.payment_link && (
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(inv.payment_link); showToast("Payment link copied!"); }}
                            className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" /> Payment Link
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {bal > 0 && (
                          <button
                            type="button"
                            onClick={() => setReceiptModal({ sourceType: "invoice", record: inv, amountToReceive: bal, paymentMethod: "Bank Transfer" })}
                            className="px-2.5 py-1 rounded-lg bg-[#c7cb2d] text-black font-bold text-[10px] font-mono uppercase font-bold cursor-pointer"
                          >
                            Receive Payment / Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPrintDoc({ type: "invoice", data: inv })}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Official PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECEIPTS PANEL (GENERATE FROM INVOICE OR MANUALLY) */}
      {activeTab === "receipts" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print:hidden">
          <form onSubmit={(e) => { if (execViewOnly) { e.preventDefault(); alert("Executive Oversight Mode (View-Only): You have full visibility into Finance operations, but modifying financial records requires Finance clearance."); return; } return handleCreateManualReceipt(e); }} className="lg:col-span-4 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3 h-fit border border-[var(--border-subtle)]/60">
            <h2 className="font-display text-base font-bold">Issue Official Receipt</h2>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Link to Invoice (Optional)</label>
              <select
                value={manualRct.linked_invoice_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const inv = invoices.find((i) => i.id === id);
                  if (inv) {
                    const bal = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid || 0));
                    setManualRct({
                      ...manualRct,
                      linked_invoice_id: id,
                      client_name: inv.client_name,
                      client_company: inv.client_company || inv.client_name,
                      client_email: inv.client_email || "",
                      through_person: inv.through_person || inv.client_name,
                      project_title: inv.project_title,
                      total_contract_amount: String(inv.total_amount),
                      amount_received: String(bal > 0 ? bal : inv.total_amount),
                    });
                  } else {
                    setManualRct({ ...manualRct, linked_invoice_id: "" });
                  }
                }}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
              >
                <option value="">-- Standalone / Manual Receipt --</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_no} — {inv.client_company || inv.client_name} (₦{Number(inv.total_amount).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Organization (FOR)</label>
                <input type="text" required value={manualRct.client_company} onChange={(e) => setManualRct({ ...manualRct, client_company: e.target.value, client_name: manualRct.client_name || e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Through</label>
                <input type="text" required value={manualRct.through_person} onChange={(e) => setManualRct({ ...manualRct, through_person: e.target.value, client_name: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project / Service Description</label>
              <input type="text" required value={manualRct.project_title} onChange={(e) => setManualRct({ ...manualRct, project_title: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Contract Total (₦)</label>
                <input type="number" required value={manualRct.total_contract_amount} onChange={(e) => setManualRct({ ...manualRct, total_contract_amount: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Amount Received (₦)</label>
                <input type="number" required value={manualRct.amount_received} onChange={(e) => setManualRct({ ...manualRct, amount_received: e.target.value })} className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono" />
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer">
              Generate & Print Receipt
            </button>
          </form>

          <div className="lg:col-span-8 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
            <h2 className="font-display text-base font-bold">Issued Receipts</h2>
            <div className="space-y-2.5">
              {receipts.map((rct) => (
                <div key={rct.id} className="p-4 rounded-2xl bg-[var(--bg-main)] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] text-[#c7cb2d] font-bold">
                        {rct.receipt_no}
                      </span>
                      <span className="text-xs font-bold">{rct.client_company || rct.client_name}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{rct.project_title}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <p className="text-sm font-bold text-[#c7cb2d]">Received: ₦{Number(rct.amount_received).toLocaleString()}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">
                        Contract: ₦{Number(rct.total_contract_amount).toLocaleString()} • Balance Due: ₦{Number(rct.balance_remaining).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintDoc({ type: "receipt", data: rct })}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] text-xs font-mono uppercase flex items-center gap-1.5 cursor-pointer hover:bg-[#c7cb2d] hover:text-black font-bold"
                    >
                      <Printer className="w-3.5 h-3.5" /> Official PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAYROLL (SINGLE UNIFIED SYNC & GENERATE BUTTON + STRICT ROLE APPROVALS) */}
      {activeTab === "payroll" && (
        <div className="space-y-4 print:hidden">
          <div className="bg-[var(--bg-card)] px-5 py-4 rounded-3xl flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-base font-bold">Payroll</h2>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="bg-[var(--bg-main)] rounded-xl px-3 py-1.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleSyncAndGeneratePayroll}
                disabled={saving}
                className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} />
                <span>Sync & Generate {payPeriod} Payroll</span>
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] p-5 rounded-3xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-dim)]">
                  <th className="py-2.5 px-2">Staff</th>
                  <th className="py-2.5 px-2">Bank</th>
                  <th className="py-2.5 px-2">Onboarded Salary (₦)</th>
                  <th className="py-2.5 px-2">Bonus (₦)</th>
                  <th className="py-2.5 px-2">Tax Relief</th>
                  <th className="py-2.5 px-2">PAYE Tax</th>
                  <th className="py-2.5 px-2">Net Pay (₦)</th>
                  <th className="py-2.5 px-2">Approvals</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/40">
                {payrollList.map((pr) => {
                  const fullyApproved = pr.hr_status === "approved" && pr.strategist_status === "approved";
                  return (
                    <tr key={pr.id}>
                      <td className="py-3 px-2">
                        <p className="font-bold">{pr.staff_name}</p>
                        <p className="text-[10px] font-mono text-[#c7cb2d]">{pr.staff_code} • {pr.pay_period}</p>
                      </td>
                      <td className="py-3 px-2 text-[11px]">
                        <p className="font-medium">{pr.bank_account_name}</p>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">{pr.bank_name} • {pr.bank_account_no}</p>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          defaultValue={pr.basic_salary}
                          disabled={fullyApproved}
                          onBlur={(e) => handleRecalculatePayrollRow(pr, Number(e.target.value), Number(pr.bonuses || 0))}
                          className="w-24 bg-[var(--bg-main)] rounded-lg px-2 py-1 text-xs font-mono border border-[var(--border-subtle)] disabled:opacity-60"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          defaultValue={pr.bonuses || 0}
                          disabled={fullyApproved}
                          onBlur={(e) => handleRecalculatePayrollRow(pr, Number(pr.basic_salary), Number(e.target.value))}
                          className="w-20 bg-[var(--bg-main)] rounded-lg px-2 py-1 text-xs font-mono border border-[var(--border-subtle)] disabled:opacity-60"
                        />
                      </td>
                      <td className="py-3 px-2 font-mono text-[var(--text-muted)]">
                        {Number(pr.tax_relief_applied) > 0 ? `₦${Number(pr.tax_relief_applied).toLocaleString()}` : "₦0"}
                      </td>
                      <td className="py-3 px-2 font-mono text-amber-400">
                        {Number(pr.paye_tax) === 0 ? "₦0" : `-₦${Number(pr.paye_tax).toLocaleString()}`}
                      </td>
                      <td className="py-3 px-2 font-mono font-bold text-[#c7cb2d]">₦{Number(pr.net_pay).toLocaleString()}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1 text-[9px] font-mono uppercase">
                          <span className={pr.hr_status === "approved" ? "text-[#c7cb2d]" : "text-[var(--text-dim)]"}>
                            HR: {pr.hr_status || "pending"}
                          </span>
                          <span className={pr.strategist_status === "approved" ? "text-[#c7cb2d]" : "text-[var(--text-dim)]"}>
                            Strategist: {pr.strategist_status || "pending"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {isStrictlyHR && pr.hr_status !== "approved" && (
                            <button
                              onClick={() => handlePayrollApproval(pr, "hr")}
                              className="px-2 py-1 rounded bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-[9px] font-mono uppercase cursor-pointer"
                            >
                              ✓ Approve (HR)
                            </button>
                          )}
                          {isStrictlyChiefStrategist && pr.strategist_status !== "approved" && (
                            <button
                              onClick={() => handlePayrollApproval(pr, "strategist")}
                              className="px-2 py-1 rounded bg-[#c7cb2d]/20 text-[#c7cb2d] text-[9px] font-mono uppercase font-bold cursor-pointer"
                            >
                              ✓ Approve (Strategist)
                            </button>
                          )}
                          {fullyApproved && (
                            <>
                              <button
                                onClick={() => setPrintDoc({ type: "payslip", data: pr })}
                                className="px-2 py-1 rounded bg-[var(--bg-main)] text-[var(--text-primary)] text-[9px] font-mono uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <FileCheck className="w-3 h-3 text-[#c7cb2d]" /> Preview Payslip
                              </button>
                              {isStrictlyFinance && (
                                <button
                                  onClick={() => handleDisbursePayrollRow(pr.id)}
                                  className="px-2.5 py-1 rounded bg-[#c7cb2d] text-black font-bold text-[9px] font-mono uppercase font-bold cursor-pointer"
                                >
                                  Disburse
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TAX & STAFF TAX RELIEFS */}
      {activeTab === "tax" && (
        <TaxComplianceSuite execViewOnly={execViewOnly} />
      )}

      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <form onSubmit={(e) => { if (execViewOnly) { e.preventDefault(); alert("Executive Oversight Mode (View-Only): You have full visibility into Finance operations, but modifying financial records requires Finance clearance."); return; } return handleConfirmPaymentAndReceipt(e); }} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-display text-base font-bold">Process Payment & Official Receipt</h3>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Amount Received Now (₦)</label>
              <input type="number" required min="1" value={receiptModal.amountToReceive} onChange={(e) => setReceiptModal({ ...receiptModal, amountToReceive: Number(e.target.value) })} className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-sm font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setReceiptModal(null)} className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer">Issue Receipt</button>
            </div>
          </form>
        </div>
      )}

      {printDoc && (
        <OfficialDocumentModal type={printDoc.type} data={printDoc.data} onClose={() => setPrintDoc(null)} />
      )}
    </div>
  );
}
