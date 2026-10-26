import * as React from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/admin-nav";
import AdminFooter from "@/components/admin/admin-footer";

async function AuthenticatedAdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  let { data: profile } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile && user.email) {
    const { data: byEmail } = await supabase
      .from("staff_profiles")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();
    profile = byEmail;
  }

  if (!profile || !profile.first_name || !profile.staff_id || profile.status === "terminated" || profile.status === "suspended") {
    redirect("/admin/login?error=unverified_staff_profile");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col">
      <AdminNav profile={profile} />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
        {children}
      </main>
      <AdminFooter />
    </div>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-muted)] flex items-center justify-center text-xs font-mono uppercase tracking-widest">
          Loading Studio Workspace...
        </div>
      }
    >
      <AuthenticatedAdminShell>{children}</AuthenticatedAdminShell>
    </React.Suspense>
  );
}
