"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  LayoutGrid,
  FolderKanban,
  Mail,
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
  const [isLightMode, setIsLightMode] = React.useState(false);

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

  // Detect theme mode (dark vs light) from document.documentElement or body
  React.useEffect(() => {
    const checkTheme = () => {
      const root = document.documentElement;
      const body = document.body;
      const themeAttr = root.getAttribute("data-theme") || body.getAttribute("data-theme") || "";
      const hasLightClass = root.classList.contains("light") || body.classList.contains("light");
      const bgStyle = getComputedStyle(body).backgroundColor;
      const isWhiteBg = bgStyle === "rgb(255, 255, 255)" || bgStyle === "rgb(250, 250, 250)" || bgStyle === "rgb(244, 244, 245)";
      setIsLightMode(themeAttr === "light" || hasLightClass || isWhiteBg);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => observer.disconnect();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const navItems = React.useMemo(() => {
    const items = [
      { name: "Overview", href: "/admin", matchPaths: ["/admin", "/admin/overview"], icon: LayoutGrid, show: true },
      { name: "Portfolio", href: "/admin/portfolio", matchPaths: ["/admin/portfolio"], icon: FolderKanban, show: checkModuleAccess(me, "portfolio") },
      { name: "Inquiries", href: "/admin/inquiries", matchPaths: ["/admin/inquiries"], icon: Mail, show: checkModuleAccess(me, "inquiries") },
      { name: "HR Desk", href: "/admin/hr", matchPaths: ["/admin/hr"], icon: Users, show: checkModuleAccess(me, "hr") },
      { name: "Finance", href: "/admin/finance", matchPaths: ["/admin/finance"], icon: Landmark, show: checkModuleAccess(me, "finance") },
      { name: "Profile", href: "/admin/settings", matchPaths: ["/admin/settings"], icon: UserCheck, show: true },
    ];
    return items.filter((item) => item.show);
  }, [me]);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* THEME-AWARE LOGO: logo-light ON DARK MODE, logo-dark ON LIGHT MODE */}
        <Link href="/admin" className="flex items-center shrink-0">
          <img
            src={isLightMode ? "/logo-dark.svg" : "/logo-light.svg"}
            alt="Lavie Studios"
            className="h-7 w-auto object-contain"
          />
        </Link>

        {/* CLEAN DESKTOP NAV */}
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

        {/* STAFF IDENTITY PILL & SIGN OUT */}
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
