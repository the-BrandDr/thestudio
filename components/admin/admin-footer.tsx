import * as React from "react";

export default function AdminFooter() {
  return (
    <footer className="w-full mt-auto shrink-0 bg-[var(--bg-main)] py-6">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center justify-center text-[11px] font-mono tracking-wider text-[var(--text-dim)]">
        <span className="text-[var(--text-muted)] font-sans font-medium">Lavie Studios Ltd</span>
        <span className="mx-2.5 opacity-40">|</span>
        <span>© 2026</span>
      </div>
    </footer>
  );
}
