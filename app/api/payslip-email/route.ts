import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, staffName, staffCode, period, basicSalary, bonuses, payeTax, netPay, bankName, accountNo } = body;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing staff email" }, { status: 400 });
    }

    const gross = Number(basicSalary || 0) + Number(bonuses || 0);
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #0c0d0e; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #222;">
        <p style="color: #c7cb2d; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px 0;">Lavie Studios Ltd • Official Payslip</p>
        <h2 style="margin: 0 0 16px 0; font-size: 20px;">Remuneration Advice — ${period}</h2>
        <p style="color: #aaa; font-size: 13px; line-height: 1.5;">
          Hello <strong>${staffName}</strong> (${staffCode}), your monthly remuneration for <strong>${period}</strong> has been processed and disbursed.
        </p>
        <div style="background: #141618; padding: 16px; border-radius: 12px; margin: 20px 0; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #888;">Gross Salary:</span>
            <strong>₦${gross.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #888;">PAYE Tax Deduction:</span>
            <strong style="color: #f59e0b;">-₦${Number(payeTax || 0).toLocaleString()}</strong>
          </div>
          <hr style="border: 0; border-top: 1px solid #2a2d30; margin: 12px 0;" />
          <div style="display: flex; justify-content: space-between; font-size: 15px;">
            <span style="color: #c7cb2d; font-weight: bold;">Net Disbursed Pay:</span>
            <strong style="color: #10b981;">₦${Number(netPay || 0).toLocaleString()}</strong>
          </div>
        </div>
        <p style="color: #777; font-size: 11px; margin-top: 16px;">
          Disbursed to: ${bankName || "Registered Bank"} (${accountNo || "NUBAN"}) • Log in to your Lavie Studios Staff Portal to view and download your official PDF payslip.
        </p>
      </div>
    `;

    // If RESEND_API_KEY is configured in .env.local, dispatch real email automatically
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "Lavie Studios Finance <finance@studioslavie.com>",
          to: [email],
          subject: `Lavie Studios Payslip (${period}) — ${staffName}`,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, mode: "resend", data });
    }

    return NextResponse.json({
      ok: true,
      mode: "ready",
      subject: `Lavie Studios Payslip (${period}) — ${staffName}`,
      mailto: `mailto:${email}?subject=${encodeURIComponent(`Lavie Studios Payslip (${period}) —${staffName}`)}&body=${encodeURIComponent(
        `Hello ${staffName} (${staffCode}),\n\nYour payslip for ${period} has been processed:\n\nGross Salary: NGN${gross.toLocaleString()}\nPAYE Tax: -NGN ${Number(payeTax || 0).toLocaleString()}\nNet Pay Disbursed: NGN${Number(netPay || 0).toLocaleString()}\nBank: ${bankName || "N/A"} (${accountNo || "N/A"})\n\nView your full printable payslip inside the Lavie Studios Portal.\n\n— Lavie Studios Finance`
      )}`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
