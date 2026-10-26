// app/services/page.tsx
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import Link from 'next/link';
import { ArrowRight, PenTool, Maximize, Layers, Film, Megaphone, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Our Services | Lavie Studios',
  description: 'From event branding and custom stages to event media and advertising campaigns.',
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16">
        {/* HERO SECTION */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 text-center pt-10 sm:pt-16 pb-16 sm:pb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Studio Capabilities</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
            What we build.<br />How we help.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
            We design, build, and install the visual elements that <br /> make events and brands memorable.
          </p>
        </section>

        {/* CORE SERVICES */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20 sm:pb-32 space-y-20 sm:space-y-32">
          
          {/* Service 1: Event Branding */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[#84871d] dark:text-[#c7cb2d] shadow-sm">
                <PenTool className="w-5 h-5" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Event Branding & Identity
              </h2>
              <p className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base">
                Every great event starts with a distinct personality. Before the first ticket is sold, we help you define how your event looks and feels. We build visual systems that make your gathering instantly recognizable on social media and in real life.
              </p>
              <ul className="space-y-3 pt-2">
                {['Event Logos & Typography', 'Color Palettes & Visual Guidelines', 'Social Media Campaign Assets', 'Speaker Announcement Templates'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <CheckCircle2 className="w-4 h-4 text-[#c7cb2d]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2 relative aspect-square sm:aspect-[4/3] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#c7cb2d]/10 to-transparent flex items-center justify-center">
                <span className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-widest">Brand System</span>
              </div>
            </div>
          </div>

          {/* Service 2: Spatial & Stage Design */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-bl from-[#e55130]/10 to-transparent flex items-center justify-center">
                <span className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-widest">Stage Build Photo</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[#e55130] shadow-sm">
                <Maximize className="w-5 h-5" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Spatial Scenography & Stages
              </h2>
              <p className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base">
                This is where the magic happens. We turn empty venue halls into immersive environments. Designing the attendees experience from the moment they walk through the entrance tunnel through the moment they look at the stage.
              </p>
              <ul className="space-y-3 pt-2">
                {['Custom Keynote Stage Backdrops', 'Entrance Tunnels & Archways', 'Photobooths & Interactive Zones', 'Venue Lighting & Rigging Setup'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <CheckCircle2 className="w-4 h-4 text-[#e55130]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Service 3: Marketing Designs (Replaced Collateral) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-primary)] shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Marketing Designs
              </h2>
              <p className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base">
                The details people interact with often leave the biggest impression. We design the marketing materials that get people excited before the event, and keep them guided and engaged once they arrive.
              </p>
              <ul className="space-y-3 pt-2">
                {['Promotional Graphics & Flyers', 'VIP Badges, Tags & Lanyards', 'Wayfinding & Venue Signage', 'Conference Guides & Program Books'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--text-primary)] opacity-70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2 relative aspect-square sm:aspect-[4/3] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--text-primary)]/5 to-transparent flex items-center justify-center">
                <span className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-widest">Marketing Layout</span>
              </div>
            </div>
          </div>

          {/* Service 4: Event Media (New) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-bl from-[#c7cb2d]/10 to-transparent flex items-center justify-center">
                <span className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-widest">Event Media</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[#84871d] dark:text-[#c7cb2d] shadow-sm">
                <Film className="w-5 h-5" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Event Media & Visuals
              </h2>
              <p className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base">
                A massive LED screen is only as good as what you put on it. We design dynamic motion graphics that keep your audience captivated during the show, and we document the experience so you can share it with the world long after the event ends.
              </p>
              <ul className="space-y-3 pt-2">
                {['Dynamic Screen Motion Loops', 'Speaker Introduction Graphics', 'Live Event Photography', 'Highlight Reels & Video Production'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <CheckCircle2 className="w-4 h-4 text-[#c7cb2d]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Service 5: Corporate Identity & Advertising (Expanded) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[#e55130] shadow-sm">
                <Megaphone className="w-5 h-5" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Corporate Identity & Advertising
              </h2>
              <p className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base">
                Beyond live events, we help businesses build their brands and run advertising campaigns that actually work. We ensure busineses and products look professional and gets noticed.
              </p>
              <ul className="space-y-3 pt-2">
                {['Company Logos & Identity Systems', 'Out-of-Home Advertising & Billboards', 'Digital Marketing Campaigns', 'Pitch Decks & Presentations'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <CheckCircle2 className="w-4 h-4 text-[#e55130]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2 relative aspect-square sm:aspect-[4/3] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#e55130]/10 to-transparent flex items-center justify-center">
                <span className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-widest">Corporate & Ads</span>
              </div>
            </div>
          </div>

        </section>

        {/* HOW WE WORK (PROCESS) */}
        <section className="bg-[var(--bg-card)]/40 py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                How we work with you
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-muted)]">
                We believe in a straightforward process. No surprises, just clear communication and on-time delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'The Briefing', desc: 'We sit down with you to understand your audience, your venue, and your exact goals for the project.' },
                { step: '02', title: 'Design & Mockups', desc: 'We create the visual identity and photorealistic 3D renders so you can see the designs before we build them.' },
                { step: '03', title: 'Fabrication & Print', desc: 'Once approved, we handle all the large-format printing, structural framing, and hardware prep.' },
                { step: '04', title: 'On-Site Execution', desc: 'Our team arrives early at the venue for zero-delay rigging, setup, and live support during the event.' },
              ].map((process) => (
                <div key={process.step} className="p-8 rounded-3xl bg-[var(--bg-main)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition">
                  <span className="text-3xl font-display font-bold text-[#e55130]/20 mb-4 block">
                    {process.step}
                  </span>
                  <h4 className="font-bold text-base mb-3">{process.title}</h4>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    {process.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-32 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
            Let&apos;s build something great together.
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] mb-10 max-w-lg mx-auto">
            Ready to secure your production slot or need a custom quote for a corporate branding project? Reach out today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm"
            >
              Start a Conversation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider hover:bg-[var(--bg-card-hover)] transition flex items-center justify-center shadow-sm"
            >
              View Production Pricing
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}