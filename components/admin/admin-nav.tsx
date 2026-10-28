"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  LayoutGrid,
  FolderKanban,
  Mail,
  MessageSquare,
  Users,
  Landmark,
  UserCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { resolveAuthenticatedStaff, checkModuleAccess } from "@/utils/resolve-current-staff";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [me, setMe] = React.useState<any | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function loadIdentity() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;
      const { data: staffRows } = await supabase.from("staff_profiles").select("*");
      const resolved = resolveAuthenticatedStaff(authData.user, staffRows || []);
      if (mounted) setMe(resolved);
    }
    loadIdentity();
    return () => {
      mounted = false;
    };
  }, [supabase, pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = React.useMemo(() => {
    const items = [
      { name: "Overview", href: "/admin", matchPaths: ["/admin", "/admin/overview"], icon: LayoutGrid, show: true },
      { name: "Workspace", href: "/admin/workspace", matchPaths: ["/admin/workspace"], icon: MessageSquare, show: true },
      { name: "Portfolio", href: "/admin/portfolio", matchPaths: ["/admin/portfolio"], icon: FolderKanban, show: checkModuleAccess(me, "portfolio") },
      { name: "Inquiries", href: "/admin/inquiries", matchPaths: ["/admin/inquiries"], icon: Mail, show: checkModuleAccess(me, "inquiries") },
      { name: "HR Desk", href: "/admin/hr", matchPaths: ["/admin/hr"], icon: Users, show: checkModuleAccess(me, "hr") },
      { name: "Finance", href: "/admin/finance", matchPaths: ["/admin/finance"], icon: Landmark, show: checkModuleAccess(me, "finance") },
      { name: "Profile", href: "/admin/settings", matchPaths: ["/admin/settings"], icon: UserCheck, show: true },
    ];
    return items.filter((item) => item.show);
  }, [me]);

  const detectedLogo = "/logo-dark.svg";

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* LAVIE STUDIOS HEADER BRAND LOGO (WITH AUTOMATIC VECTOR LOCKUP) */}
        <Link href="/admin" className="flex items-center gap-2.5 shrink-0 group">
          {detectedLogo && !imgError ? (
            <img
              src={detectedLogo}
              alt="Lavie Studios"
              onError={() => setImgError(true)}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <svg width="88" height="24" viewBox="0 0 88 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
                {/* L */}
                <path d="M0 2H7V16H16V22H0V2Z" fill="#F29F05" />
                {/* A */}
                <path d="M18 22L28 2L38 22H18Z" fill="#F29F05" />
                {/* V */}
                <path d="M36 2H56L46 22L36 2Z" fill="#C7CB2D" />
                {/* E */}
                <rect x="58" y="2" width="26" height="5" fill="#EA4335" />
                <rect x="58" y="9.5" width="20" height="5" fill="#EA4335" />
                <rect x="58" y="17" width="26" height="5" fill="#EA4335" />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="font-display text-[11px] font-bold tracking-tight text-[var(--text-primary)]">
                  Lavie
                </span>
                <span className="font-display text-[11px] font-bold tracking-tight text-[var(--text-primary)]">
                  Studios.
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* DESKTOP NAV LINKS */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.matchPaths.includes(pathname) ||
              (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                  active
                    ? "bg-[var(--text-primary)] text-[var(--bg-main)] font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT USER BADGE & SIGN OUT */}
        <div className="flex items-center gap-2">
          {me && (
            <Link
              href="/admin/settings"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 hover:border-[#c7cb2d]/50 transition"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--bg-main)] overflow-hidden flex items-center justify-center text-[10px] font-mono font-bold text-[#c7cb2d]">
                {me.passport_url ? (
                  <img src={me.passport_url} alt={me.first_name} className="w-full h-full object-cover" />
                ) : (
                  `${me.first_name?.[0] || "S"}${me.last_name?.[0] || ""}`
                )}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold leading-none">
                  {me.first_name || "Staff"}
                </span>
                <span className="block text-[9px] font-mono text-[var(--text-dim)] uppercase mt-0.5">
                  {me.staff_id || "STAFF"}
                </span>
              </div>
            </Link>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[var(--text-muted)] hover:text-red-400 cursor-pointer transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            className="lg:hidden p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-[var(--text-primary)]"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="lg:hidden px-4 pb-4 pt-2 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.matchPaths.includes(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  active
                    ? "bg-[#c7cb2d] text-black font-bold"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
