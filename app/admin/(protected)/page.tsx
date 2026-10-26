import * as React from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { Briefcase, MailOpen, Users, ShieldCheck, ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import FormattedDate from "@/components/admin/formatted-date";

export default async function AdminOverviewPage() {
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
  if (!user) redirect("/admin/login");

  const [
    { data: profile },
    { count: staffCount },
    { count: projectCount },
    { count: inquiryCount },
    { data: recentInquiries },
    { data: recentProjects },
    { data: staffDirectory }
  ] = await Promise.all([
    supabase.from("staff_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("staff_profiles").select("*", { count: "exact", head: true }),
    supabase.from("case_studies").select("*", { count: "exact", head: true }),
    supabase.from("contact_messages").select("*", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id, name, email, subject, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("case_studies").select("id, title, client, category, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("staff_profiles").select("id, first_name, last_name, staff_id, role, job_title, status").order("staff_id", { ascending: true }).limit(5)
  ]);

  const activeProfile = profile || (staffDirectory && staffDirectory[0]);
  if (!activeProfile) redirect("/admin/login?error=unverified_staff_profile");

  const roleLabel = activeProfile.role.replace("_", " ");

  return (
    <div className="space-y-8">
      
      {/* Top Identity & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[#c7cb2d]/15 text-[#c7cb2d] font-bold">
              {activeProfile.staff_id}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              {roleLabel} • {activeProfile.department || "Executive"}
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Welcome back, {activeProfile.first_name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/admin/portfolio" 
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Case Study
          </Link>
          <Link 
            href="/admin/hr" 
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-main)] text-[var(--text-primary)] text-xs font-bold hover:opacity-80 transition"
          >
            <Users className="w-3.5 h-3.5" /> HR Desk
          </Link>
        </div>
      </div>

      {/* Live Database Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/portfolio" className="p-6 rounded-3xl bg-[var(--bg-card)] flex flex-col justify-between h-36 group hover:ring-1 hover:ring-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Case Studies</span>
            <Briefcase className="w-4 h-4 text-[#c7cb2d]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-display font-bold">{projectCount ?? 0}</span>
            <span className="text-[11px] text-[var(--text-dim)] flex items-center gap-0.5 group-hover:text-[var(--text-primary)]">
              Manage <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/admin/inquiries" className="p-6 rounded-3xl bg-[var(--bg-card)] flex flex-col justify-between h-36 group hover:ring-1 hover:ring-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Client Inquiries</span>
            <MailOpen className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-display font-bold">{inquiryCount ?? 0}</span>
            <span className="text-[11px] text-[var(--text-dim)] flex items-center gap-0.5 group-hover:text-[var(--text-primary)]">
              Review <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/admin/hr" className="p-6 rounded-3xl bg-[var(--bg-card)] flex flex-col justify-between h-36 group hover:ring-1 hover:ring-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Staff Roster</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-display font-bold">{staffCount ?? 1}</span>
            <span className="text-[11px] text-[var(--text-dim)] flex items-center gap-0.5 group-hover:text-[var(--text-primary)]">
              Directory <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/admin/settings" className="p-6 rounded-3xl bg-[var(--bg-card)] flex flex-col justify-between h-36 group hover:ring-1 hover:ring-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Clearance Level</span>
            <ShieldCheck className="w-4 h-4 text-[#c7cb2d]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-display font-bold uppercase">{roleLabel}</span>
            <span className="text-[11px] font-mono text-[var(--text-dim)]">{activeProfile.staff_id}</span>
          </div>
        </Link>
      </div>

      {/* Operational Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-base font-bold">Recent Inquiries</h2>
              <Link href="/admin/inquiries" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentInquiries && recentInquiries.length > 0 ? (
                recentInquiries.map((inq) => (
                  <div key={inq.id} className="p-3.5 rounded-2xl bg-[var(--bg-main)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{inq.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{inq.subject || inq.email}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-dim)] shrink-0">
                      <FormattedDate dateString={inq.created_at} />
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No client inquiries recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-base font-bold">Portfolio Works</h2>
              <Link href="/admin/portfolio" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {recentProjects && recentProjects.length > 0 ? (
                recentProjects.map((proj) => (
                  <div key={proj.id} className="p-3.5 rounded-2xl bg-[var(--bg-main)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{proj.title}</p>
                      <p className="text-[10px] font-mono uppercase text-[var(--text-muted)] truncate">
                        {proj.client || proj.category}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] shrink-0">
                      {proj.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No case studies published yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-base font-bold">Staff Directory</h2>
              <Link href="/admin/hr" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                HR Desk
              </Link>
            </div>
            <div className="space-y-3">
              {staffDirectory && staffDirectory.length > 0 ? (
                staffDirectory.map((member) => (
                  <div key={member.id} className="p-3.5 rounded-2xl bg-[var(--bg-main)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-[10px] font-mono uppercase text-[var(--text-muted)] truncate">
                        {member.staff_id} • {member.job_title || member.role?.replace("_", " ")}
                      </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#c7cb2d] shrink-0" title={member.status} />
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No staff profiles found.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
