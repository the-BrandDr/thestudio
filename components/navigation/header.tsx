"use client";

// components/navigation/header.tsx

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_LINKS = [
  { label: 'Home', href: '/', id: '01' },
  { label: 'Who we are', href: '/about', id: '02' },
  { label: 'Portfolio', href: '/portfolio', id: '03' },
  { label: 'Services', href: '/services', id: '04' },
  { label: 'Pricing', href: '/pricing', id: '05' },
  { label: 'Contact Us', href: '/contact', id: '06' },
];

function HeaderContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[110] backdrop-blur-md bg-[var(--bg-main)]/90 border-b border-transparent transition-colors">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="group flex items-center shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <div className="relative h-7 sm:h-8 w-28 sm:w-32 flex items-center">
              <Image
                src="/logo-dark.svg"
                alt="Lavie Studios"
                width={140}
                height={32}
                priority
                className="show-in-light h-6 sm:h-7 md:h-8 w-auto object-contain transition-opacity group-hover:opacity-85"
              />
              <Image
                src="/logo-light.svg"
                alt="Lavie Studios"
                width={140}
                height={32}
                priority
                className="show-in-dark h-6 sm:h-7 md:h-8 w-auto object-contain transition-opacity group-hover:opacity-85"
              />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[14px] font-medium tracking-wide text-[var(--text-muted)]">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-[var(--text-primary)] ${
                    isActive ? 'text-[var(--text-primary)] font-bold' : ''
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/contact"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              Get Started
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-white dark:bg-[#0a0a0a] flex flex-col justify-between px-6 sm:px-10 pt-28 pb-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#84871d] dark:text-[#c7cb2d] font-bold mb-4">
              Index / Navigation
            </span>

            <nav className="flex flex-col divide-y divide-[var(--border-subtle)]">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="group py-5 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="text-xs text-[var(--text-dim)] group-hover:text-[#c7cb2d] transition-colors">
                        {link.id}
                      </span>
                      <span
                        className={`text-2xl sm:text-3xl tracking-tight ${
                          isActive
                            ? 'text-[var(--text-primary)] font-bold'
                            : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-medium'
                        }`}
                      >
                        {link.label}
                      </span>
                    </div>
                    <ArrowUpRight
                      className={`w-6 h-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                        isActive
                          ? 'text-[#84871d] dark:text-[#c7cb2d]'
                          : 'text-[var(--text-dim)] opacity-40 group-hover:opacity-100'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-8 mt-8 border-t border-[var(--border-subtle)] space-y-6">
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm"
            >
              Start Your Project
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
              <span>Lagos • Abuja • Osogbo • Ogbomoso</span>
              <span>+234 (0) 7073725374</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<header className="fixed top-0 left-0 right-0 z-[110] h-20 backdrop-blur-md bg-[var(--bg-main)]/90 border-b border-transparent" />}>
      <HeaderContent />
    </Suspense>
  );
}