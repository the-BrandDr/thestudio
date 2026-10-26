"use client";

// components/theme-toggle.tsx

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-14 h-7 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] opacity-40" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] p-0.5 transition-colors duration-200 focus:outline-none"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="flex w-full items-center justify-between px-1.5 text-[var(--text-dim)]">
        <Sun className={`h-3 w-3 ${isDark ? 'opacity-40' : 'opacity-0'}`} />
        <Moon className={`h-3 w-3 ${isDark ? 'opacity-0' : 'opacity-40'}`} />
      </div>

      <span
        className={`pointer-events-none absolute flex h-5 w-5 transform items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] shadow-sm transition-transform duration-200 ease-in-out ${
          isDark ? 'translate-x-7' : 'translate-x-0.5'
        }`}
      >
        {isDark ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
      </span>
    </button>
  );
}