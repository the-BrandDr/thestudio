import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, first_name, last_name, role, hierarchy_level, department, job_title } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and temporary password are required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Isolated client with persistSession: false so the current Admin is NEVER logged out
    const isolatedSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let userId = null;
    let authNote = "Portal login created. Staff can sign in immediately.";

    // If Service Role Key is present, auto-confirm email immediately
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: adminUser, error: adminErr } = await isolatedSupabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `${first_name || ""} ${last_name || ""}`.trim(),
          role: role || "staff",
          hierarchy_level,
          department,
          job_title,
        },
      });
      if (adminErr && !adminErr.message.toLowerCase().includes("already")) {
        return NextResponse.json({ error: adminErr.message }, { status: 400 });
      }
      userId = adminUser?.user?.id || null;
    } else {
      // Standard signUp using isolated non-persisted client
      const { data: signUpData, error: signUpErr } = await isolatedSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: `${first_name || ""} ${last_name || ""}`.trim(),
            role: role || "staff",
            hierarchy_level,
            department,
            job_title,
          },
        },
      });
      if (signUpErr && !signUpErr.message.toLowerCase().includes("already")) {
        return NextResponse.json({ error: signUpErr.message }, { status: 400 });
      }
      userId = signUpData?.user?.id || null;
      if (signUpData?.user && !signUpData.session) {
        authNote = "Account registered! If Email Confirmations are enabled in Supabase Auth, they should click the confirmation link in their inbox (or disable Confirm Email in Supabase -> Auth -> Providers -> Email for instant login).";
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      note: authNote,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to provision staff auth" }, { status: 500 });
  }
}
