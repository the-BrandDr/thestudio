// app/privacy/page.tsx
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-32 sm:pt-40 pb-24 max-w-3xl mx-auto px-5 sm:px-8">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Legal</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Privacy Policy
          </h1>
          <p className="text-xs text-[var(--text-dim)] font-mono uppercase tracking-widest">
            Last Updated: October 2026
          </p>
        </div>

        <div className="space-y-12 text-sm sm:text-base leading-relaxed text-[var(--text-muted)]">
          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">1. Who we are</h2>
            <p>
              Lavie Studios Ltd ("we", "us", or "our") operates as a creative design and event branding studio. We act as the data controller for the personal information you share with us. We are committed to processing your data securely and in full compliance with the Nigeria Data Protection Act (NDPA) and other relevant global standards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">2. The information we collect</h2>
            <p className="mb-4">We only collect information that is strictly necessary to provide our services and communicate effectively:</p>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-[var(--text-primary)]">Direct Inquiries:</strong> When you use our contact form or project estimator, we collect your name, email address, phone number, and project details.</li>
              <li><strong className="text-[var(--text-primary)]">Newsletter Subscriptions:</strong> If you join our Agency Dispatch, we collect your email address.</li>
              <li><strong className="text-[var(--text-primary)]">Technical Data:</strong> We may collect anonymized technical data (like browser type and basic usage metrics) via essential cookies to ensure our website functions correctly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">3. How we use your information</h2>
            <p className="mb-4">Your personal data is never sold to third parties. We use it solely to:</p>
            <ul className="list-disc pl-5 space-y-3">
              <li>Review your project briefs, schedule discovery calls, and prepare formal proposals.</li>
              <li>Deliver dispatch emails regarding studio updates (only if you have explicitly opted in).</li>
              <li>Maintain the security and performance of our digital infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">4. Data storage and security</h2>
            <p>
              Your contact submissions and subscription preferences are securely routed and stored in our encrypted database infrastructure (powered by Supabase). We enforce strict access controls, meaning only authorized production and management personnel at Lavie Studios can view your project details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">5. Your privacy rights</h2>
            <p className="mb-4">You maintain full control over your personal data. At any time, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-3">
              <li>Request a copy of the personal data we hold about you.</li>
              <li>Ask us to correct inaccurate or incomplete information.</li>
              <li>Request the complete deletion of your records from our systems.</li>
              <li>Withdraw your consent (e.g., unsubscribing from our mailing list via the link in our emails).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">6. Contacting our team</h2>
            <p>
              If you have any questions regarding this policy or wish to exercise your data rights, please reach out to us directly at <a href="mailto:info@studioslavie.com" className="font-bold text-[var(--text-primary)] hover:text-[#c7cb2d] transition-colors">info@studioslavie.com</a>. We aim to address all privacy-related inquiries within 48 hours.
            </p>
          </section>
        </div>
        
        <div className="mt-16 pt-8 border-t border-[var(--border-subtle)]">
           <Link href="/terms" className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors">
              Read our Terms & Conditions →
           </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}