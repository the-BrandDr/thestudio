"use client";

// components/cookie-consent.tsx

import * as React from 'react';
import Link from 'next/link';

export function CookieConsent() {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const consent = localStorage.getItem('lavie_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('lavie_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('lavie_cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-10 duration-700">
      <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-[24px] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h3 className="font-bold text-sm mb-2 text-[var(--text-primary)]">Your privacy matters to us.</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xl">
            We use a few cookies to make sure this site runs perfectly and to understand how you interact with our portfolio. No invasive tracking, just the essentials to keep things smooth. You can read exactly how we protect your data in our <Link href="/privacy" className="font-bold underline hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleDecline}
            className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-transparent border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--border-subtle)] transition"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition shadow-sm"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
