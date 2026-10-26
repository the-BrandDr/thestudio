"use client";

// components/navigation/footer.tsx

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

function YearDisplay() {
  const [year, setYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <time suppressHydrationWarning>{year ?? 2026}</time>;
}

export default function Footer() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error' | 'duplicate'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('submitting');

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email }]);

      if (error) {
        // Handle Supabase unique constraint violation (duplicate email)
        if (error.code === '23505') {
          setStatus('duplicate');
          return;
        }
        throw error;
      }

      setStatus('success');
      setEmail('');
      
      // Reset success message after 5 seconds so they can subscribe another email if needed
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error('Subscription failed:', error);
      setStatus('error');
    }
  };

  return (
    <footer className="relative z-10 bg-[var(--bg-main)] pt-16 sm:pt-20 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-8">
        
        {/* Main Footer Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-14">
          
          {/* Column 1: Studio Identity (Full width on mobile, 4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-block">
              {/* LIGHT MODE: Shows the dark-colored variation */}
              <Image
                src="/logo-dark.svg"
                alt="Lavie Studios"
                width={140}
                height={32}
                className="show-in-light h-7 sm:h-8 w-auto object-contain transition-opacity hover:opacity-85"
              />
              {/* DARK MODE: Shows the light-colored variation */}
              <Image
                src="/logo-light.svg"
                alt="Lavie Studios"
                width={140}
                height={32}
                className="show-in-dark h-7 sm:h-8 w-auto object-contain transition-opacity hover:opacity-85"
              />
            </Link>

            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-sm">
              Lavie Studios is a creative design studio specializing in event branding, spatial scenography, and advertising. We help brands, people, and gatherings stand out.
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-2 text-xs text-[#84871d] dark:text-[#c7cb2d] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
                Deploying across Nigeria & beyond
              </span>
            </div>
          </div>

          {/* Column 2 & 3: Directory and Inquiries (Forced into 2 columns on ALL devices) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-6 sm:gap-10">
            {/* Directory */}
            <div>
              <h5 className="uppercase tracking-[0.2em] text-[11px] text-[var(--text-dim)] font-bold mb-4">
                Directory
              </h5>
              <ul className="space-y-3 text-sm">
                <li><Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Home</Link></li>
                <li><Link href="/about" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Who we are</Link></li>
                <li><Link href="/portfolio" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Portfolio</Link></li>
                <li><Link href="/services" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Services</Link></li>
                <li><Link href="/pricing" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link></li>
                <li><Link href="/contact" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Contact Us</Link></li>
                <li className="pt-2"><Link href="/privacy" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Terms & Conditions</Link></li>
              </ul>
            </div>

            {/* Inquiries */}
            <div>
              <h5 className="uppercase tracking-[0.2em] text-[11px] text-[var(--text-dim)] font-bold mb-4">
                Inquiries
              </h5>
              <div className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Lavie Studios Ltd</p>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5">Ogbomoso, Oyo State, Nigeria</p>
                </div>
                <div className="pt-2">
                  <a href="mailto:info@studioslavie.com" className="block hover:text-[var(--text-primary)] transition-colors break-all">info@studioslavie.com</a>
                  <a href="tel:+2347073725374" className="block hover:text-[var(--text-primary)] transition-colors mt-0.5">+234 (0) 7073725374</a>
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Agency Dispatch (Full width on mobile/tablet, 4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <h5 className="uppercase tracking-[0.2em] text-[11px] text-[var(--text-dim)] font-bold mb-2">
                Agency Dispatch
              </h5>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-sm">
                Join our private dispatch for spatial design insights, event breakdowns, and studio production updates.
              </p>
            </div>

            {status === 'success' ? (
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-green-500/20 bg-[#c7cb2d]/10 text-[#c7cb2d] animate-in fade-in duration-300 w-full max-w-md">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-bold">You are on the list.</p>
                </div>
                <p className="text-xs">Keep an eye on your inbox for dispatch updates.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="w-full space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
                  <input
                    type="email"
                    required
                    disabled={status === 'submitting'}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status !== 'idle' && status !== 'submitting') setStatus('idle');
                    }}
                    placeholder="Enter your email"
                    className="flex-1 bg-[var(--bg-card)] border border-transparent rounded-xl px-4 py-3.5 sm:py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] shadow-sm transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting' || !email}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0 text-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
                  </button>
                </div>
                
                {status === 'duplicate' && (
                  <p className="text-xs text-[#c7cb2d] flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3 h-3" />
                    This email is already subscribed.
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3 h-3" />
                    Something went wrong. Please try again.
                  </p>
                )}
                {(status === 'idle' || status === 'submitting') && (
                  <p className="text-xs text-[var(--text-dim)]">
                    No spam. Unsubscribe at any time.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

       {/* Bottom Sub-Footer Bar */}
        <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-[var(--text-dim)] text-center">
          <p>© <YearDisplay /> Lavie Studios Ltd. All rights reserved.</p>
          <span className="hidden sm:inline-block text-[var(--border-strong)]">|</span>
          <p className="font-bold tracking-wide">the life in every place.</p>
        </div>
      </div>
    </footer>
  );
}