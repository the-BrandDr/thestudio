"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutDashboard, Briefcase, Mail, Settings, 
  Users, Landmark, LogOut, Menu, X, UserCheck, MessageSquareQuote, Film, Send
} from "lucide-react";

interface StaffProfile {
  id: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  role: string;
  permissions?: string[] | null;
  department?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  passport_url?: string | null;
}

export default function AdminNav({ profile }: { profile: StaffProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = React.useState(false);

  const firstName = profile.first_name;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const staffId = profile.staff_id;
  const role = profile.role;
  const perms = profile.permissions || [role];
  const photo = profile.passport_url || profile.avatar_url;
  const initials = `${profile.first_name[0]}${profile.last_name?.[0] || ""}`.toUpperCase();

  const hasAccess = (allowed: string[]) => {
    if (role === "super_admin" || perms.includes("super_admin")) return true;
    return allowed.some((r) => r === role || perms.includes(r));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard, allowed: ["super_admin", "hr", "finance", "staff", "intern"] },
    { name: "Portfolio", href: "/admin/portfolio", icon: Briefcase, allowed: ["super_admin", "portfolio", "staff", "intern"] },
    { name: "Inquiries", href: "/admin/inquiries", icon: Mail, allowed: ["super_admin", "inquiries", "hr", "staff"] },
    { name: "Feedbacks", href: "/admin/feedbacks", icon: MessageSquareQuote, allowed: ["super_admin", "portfolio", "hr", "staff"] },
    { name: "Newsletter", href: "/admin/newsletter", icon: Send, allowed: ["super_admin", "chief_strategist", "head_of_operations", "portfolio", "inquiries", "staff"] },
    { name: "Hero Media", href: "/admin/media", icon: Film, allowed: ["super_admin", "chief_strategist", "portfolio"] },
    { name: "HR & Workspace", href: "/admin/hr", icon: Users, allowed: ["super_admin", "hr", "finance", "staff", "intern", "support_staff", "executive"] },
    { name: "Finance", href: "/admin/finance", icon: Landmark, allowed: ["super_admin", "finance"] },
    { name: "Profile", href: "/admin/settings", icon: Settings, allowed: ["super_admin", "hr", "finance", "staff", "intern"] },
  ];

  const visibleNavItems = navItems.filter((item) => hasAccess(item.allowed));

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-main)]/95 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <Link href="/admin" className="flex items-center shrink-0">
            <Image
              src="/logo-light.svg"
              alt="Lavie Studios"
              width={115}
              height={24}
              priority
              style={{ width: "auto", height: "22px" }}
              className="object-contain"
            />
          </Link>

          <div className="flex items-center justify-end gap-3 flex-1">
            <nav className="hidden lg:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive 
                        ? "bg-[var(--text-primary)] text-[var(--bg-main)]" 
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-full border border-[var(--border-subtle)]/60">
              <Link 
                href="/admin/settings" 
                className="flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full hover:bg-[var(--bg-main)]/60 transition-colors group"
                title="View Profile"
              >
                {photo ? (
                  <img 
                    src={photo} 
                    alt={fullName} 
                    className="w-6 h-6 rounded-full object-cover shrink-0" 
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] leading-none">
                  <span className="font-semibold text-[var(--text-primary)] group-hover:text-[#c7cb2d] transition-colors truncate max-w-[110px]">
                    {firstName}
                  </span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-dim)]">
                    {staffId}
                  </span>
                </div>
              </Link>

              <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />

              <button
                onClick={handleLogout}
                className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded-full transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            <button 
              onClick={() => setIsOpen(true)}
              className="lg:hidden p-2 text-[var(--text-primary)] bg-[var(--bg-card)] rounded-full"
              aria-label="Open Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
          />
          <aside className="relative w-64 max-w-[85%] h-full bg-[var(--bg-card)] flex flex-col justify-between p-5 shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] flex items-center justify-center text-[10px] font-bold uppercase">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)] leading-none">{fullName}</p>
                    <p className="text-[9px] font-mono text-[var(--text-dim)] uppercase mt-1">{staffId} • {role.replace("_", " ")}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full bg-[var(--bg-main)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? "bg-[var(--text-primary)] text-[var(--bg-main)]" 
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              <Link
                href="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[var(--bg-main)] text-xs font-semibold text-[var(--text-primary)]"
              >
                <UserCheck className="w-3.5 h-3.5" /> Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-red-500/10 text-red-500 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
