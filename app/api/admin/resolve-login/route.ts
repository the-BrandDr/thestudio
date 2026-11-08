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

function normalizeStaffCodeVariations(rawInput: string): string[] {
  const digits = rawInput.replace(/[^0-9]/g, "");
  if (!digits) return [rawInput.trim().toUpperCase()];
  const num = parseInt(digits, 10);
  const padded2 = String(num).padStart(2, "0");
  const padded3 = String(num).padStart(3, "0");
  return Array.from(
    new Set([
      `LS-${digits}`,
      `LS-${padded2}`,
      `LS-${padded3}`,
      `LS-${num}`,
    ])
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawIdentifier = String(body?.identifier || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json({ error: "Please enter your Staff ID or Email." }, { status: 400 });
    }

    // If it already contains '@', treat it directly as an email address
    if (rawIdentifier.includes("@")) {
      return NextResponse.json({ email: rawIdentifier.toLowerCase() });
    }

    const variations = normalizeStaffCodeVariations(rawIdentifier);
    const supabase = getDb();

    // 1. Search across staff tables in Supabase (staff_profiles, staff_members, profiles, users)
    const candidateTables = ["staff_profiles", "staff_members", "profiles", "staff", "employees"];

    for (const table of candidateTables) {
      try {
        const { data, error } = await supabase.from(table).select("*");
        if (!error && Array.isArray(data) && data.length > 0) {
          const matchedRow = data.find((row: any) => {
            const code = String(
              row.staff_id || row.staff_code || row.employee_id || row.code || ""
            )
              .trim()
              .toUpperCase();
            return variations.includes(code);
          });

          if (matchedRow) {
            const resolvedEmail = String(
              matchedRow.email || matchedRow.work_email || matchedRow.user_email || ""
            )
              .trim()
              .toLowerCase();
            if (resolvedEmail) {
              return NextResponse.json({
                email: resolvedEmail,
                staff_id: matchedRow.staff_id || matchedRow.staff_code || variations[0],
              });
            }
          }
        }
      } catch (_) {}
    }

    // 2. If Service Role Key is available, also check auth.users user_metadata for staff_id
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: usersList } = await supabase.auth.admin.listUsers();
        if (usersList?.users) {
          const foundUser = usersList.users.find((u) => {
            const metaCode = String(
              u.user_metadata?.staff_id || u.user_metadata?.staff_code || ""
            )
              .trim()
              .toUpperCase();
            return variations.includes(metaCode);
          });
          if (foundUser?.email) {
            return NextResponse.json({
              email: foundUser.email.toLowerCase(),
              staff_id: variations[0],
            });
          }
        }
      } catch (_) {}
    }

    return NextResponse.json(
      {
        error: `No staff account found for Staff ID ${variations[0]}. Please check your number or sign in with Email.`,
      },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not resolve Staff ID." },
      { status: 500 }
    );
  }
}
