"use client";

// app/page.tsx

import * as React from 'react';
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import StudioTicker from '@/components/home/ticker';
import RotatingWord from '@/components/home/rotating-word';
import DynamicHeroVideo from '@/components/home/dynamic-hero-video';
import DynamicProjectCard from '@/components/home/dynamic-project-card';
import DynamicInquiryShowcase from '@/components/home/dynamic-inquiry-showcase';
import ClientFeedbackSection from '@/components/client-feedback-section';
import Link from 'next/link';
import {
  ArrowRight,
  Maximize2,
  Layers,
  Eye,
  Send,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function Home() {
  // --- HERO VIDEO PLAYLIST STATE (SUPPORTS MULTI-VIDEO ROTATION) ---
  const [heroPlaylist, setHeroPlaylist] = React.useState<Array<{
    videoUrl: string;
    posterUrl: string;
    tagline: string;
    location: string;
  }>>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = React.useState(0);
  const [featuredProjects, setFeaturedProjects] = React.useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = React.useState(true);

  // --- FORM STATE (Exactly from Contact Page) ---
  const [formStatus, setFormStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });

  // --- NEWSLETTER SUBSCRIPTION STATE ---
  const [subEmail, setSubEmail] = React.useState('');
  const [subStatus, setSubStatus] = React.useState<'idle' | 'loading' | 'done'>('idle');

  // --- FETCH DATA ON MOUNT ---
  React.useEffect(() => {
    async function fetchHomeData() {
      setIsLoadingMedia(true);
      try {
        const supabase = createClient();

        // 1. Fetch active videos from hero_videos playlist table
        const { data: activeVideos } = await supabase
          .from('hero_videos')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const { data: heroData } = await supabase
          .from('homepage_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (activeVideos && activeVideos.length > 0) {
          setHeroPlaylist(
            activeVideos.map((v: any) => ({
              videoUrl: v.video_url,
              posterUrl: heroData?.poster_url || '',
              tagline: v.tagline || heroData?.tagline || 'Event Branding & Experience Design',
              location: v.location || heroData?.location || 'Lagos • Abuja • Ogbomoso'
            }))
          );
        } else if (heroData && heroData.video_url) {
          setHeroPlaylist([
            {
              videoUrl: heroData.video_url,
              posterUrl: heroData.poster_url || '',
              tagline: heroData.tagline || '',
              location: heroData.location || ''
            }
          ]);
        }

        // 2. Fetch Latest 6 Case Studies ordered by most recent
        const { data: projectData } = await supabase
          .from('case_studies')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (projectData) {
          const mappedProjects = projectData.map((p: any) => ({
            ...p,
            coverImage: p.cover_image,
            galleryImages: p.images && p.images.length > 0 ? p.images : p.gallery_images || p.gallery_media || []
          }));
          setFeaturedProjects(mappedProjects);
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setIsLoadingMedia(false);
      }
    }

    fetchHomeData();
  }, []);

  // Rotate across active hero videos every 18 seconds if multiple are enabled
  React.useEffect(() => {
    if (heroPlaylist.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentVideoIdx((prev) => (prev + 1) % heroPlaylist.length);
    }, 18000);
    return () => clearInterval(timer);
  }, [heroPlaylist]);

  const activeHeroMedia = heroPlaylist[currentVideoIdx] || heroPlaylist[0];

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            subject: selectedServices.length > 0 ? selectedServices.join(', ') : 'General Inquiry',
            message: formData.company ? `Company/Brand: ${formData.company}\n\n${formData.message}` : formData.message
          }
        ]);

      if (error) throw error;

      // Also opt-in to newsletter subscribers if not already present
      await supabase
        .from('newsletter_subscribers')
        .upsert({ email: formData.email.trim().toLowerCase(), full_name: formData.name.trim(), source: 'Project Brief' }, { onConflict: 'email' });

      setFormStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '', message: '' });
      setSelectedServices([]);
      setTimeout(() => setFormStatus('idle'), 5000);
    } catch (error) {
      console.error('Submission failed', error);
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 5000);
    }
  };

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubStatus('loading');
    const supabase = createClient();
    await supabase
      .from('newsletter_subscribers')
      .upsert({ email: subEmail.trim().toLowerCase(), source: 'Homepage Bar', status: 'subscribed' }, { onConflict: 'email' });
    setSubStatus('done');
    setSubEmail('');
    setTimeout(() => setSubStatus('idle'), 4000);
  };

  const allShowcaseImages = featuredProjects.flatMap((p) => p.galleryImages || []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* HERO SECTION */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-6 sm:mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            <span>Event Branding & Experience Design Studio</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--text-primary)] max-w-4xl leading-[1.1]">
            We build immersive spatial experiences that make live events{' '}
            <RotatingWord />
          </h1>

          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed">
            Great events are built with intention. We design and install the stages, walkways, and visual details that turn empty halls into memorable gatherings, working with event organizers and teams across Lagos, Abuja, Osogbo, Ogbomoso, and beyond.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm"
            >
              Configure Event Production
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/portfolio"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] font-medium text-xs uppercase tracking-wider hover:bg-[var(--bg-card-hover)] transition text-center shadow-sm"
            >
              Explore Case Studies
            </Link>
          </div>
        </section>

        {/* DYNAMIC HERO VIDEO SHOWREEL (WITH MULTI-VIDEO ROTATION) */}
        {!isLoadingMedia && activeHeroMedia?.videoUrl && (
          <div className="relative">
            <DynamicHeroVideo
              key={activeHeroMedia.videoUrl}
              videoUrl={activeHeroMedia.videoUrl}
              posterUrl={activeHeroMedia.posterUrl}
              tagline={activeHeroMedia.tagline}
              location={activeHeroMedia.location}
            />
            {heroPlaylist.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {heroPlaylist.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentVideoIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentVideoIdx ? 'w-6 bg-[#c7cb2d]' : 'w-2 bg-[var(--border-subtle)]'
                    }`}
                    aria-label={`Switch to video ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Studio Marquee */}
        <StudioTicker />

        {/* CORE DISCIPLINES (CENTER-ALIGNED HEADING) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#84871d] dark:text-[#c7cb2d] font-semibold">
              Signature Capabilities
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1.5">
              Transforming Empty Venues Into Living Spaces
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-primary)] mb-6">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#84871d] dark:text-[#c7cb2d] font-bold">
                  01 / STAGE ARCHITECTURE
                </span>
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mt-3 mb-2">
                  Keynote & Stage Scenography
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  We engineer bespoke stage backdrops, seamless multi-screen LED visuals, podium wraps, and lighting palettes that anchor the speaker and captivate every attendee from the front row to the balcony.
                </p>
              </div>
              <div className="mt-8 pt-4 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                Summits • Award Galas • Live Concerts
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-primary)] mb-6">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#84871d] dark:text-[#c7cb2d] font-bold">
                  02 / SPATIAL & WALKWAY DESIGN
                </span>
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mt-3 mb-2">
                  Arrival Tunnels & Experiential Zones
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  The event begins the second a guest steps on the property. We build entrance tunnels, mood-lit VIP walkways, registration archways, and interactive photo installations built for organic social sharing.
                </p>
              </div>
              <div className="mt-8 pt-4 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                Entrances • Photobooths • VIP Lounges
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-primary)] mb-6">
                  <Eye className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#84871d] dark:text-[#c7cb2d] font-bold">
                  03 / EVENT COLLATERAL & MEDIA
                </span>
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mt-3 mb-2">
                  Comprehensive Event Identity
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  Full collateral harmony: custom VIP badges, lanyards, conference guides, dynamic speaker motion loops, digital billboards, and signage systems that prevent visual clutter and enforce event prestige.
                </p>
              </div>
              <div className="mt-8 pt-4 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                Credential Kits • Program Books • Motion Loops
              </div>
            </div>
          </div>
        </section>

        {/* ADDITIONAL STUDIO CAPABILITIES STRIP */}
        <section className="bg-[var(--bg-card)]/40 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-semibold">
                Integrated Studio Services
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1.5">
                Looking for Corporate Identity or Advertising Campaigns?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                While event experience is our flagship craft, we also develop end-to-end brand identity systems, investor pitch decks, and digital campaign marketing through our full-service studio desk.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--bg-card)] text-xs uppercase tracking-wider font-semibold text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-main)] transition w-fit shadow-sm"
            >
              View Full Studio Services
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* FEATURED CASE STUDIES (CENTER-ALIGNED HEADING, NO "VISUAL ARCHIVE", MAX 3) */}
        {featuredProjects.length > 0 && (
          <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                Recent Spatial & Brand Deployments
              </h2>
              <div className="mt-3">
                <Link
                  href="/portfolio"
                  className="text-xs uppercase font-mono tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  Explore Full Portfolio →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {featuredProjects.slice(0, 3).map((project, idx) => (
                <DynamicProjectCard
                  key={project.id}
                  project={project}
                  intervalMs={4000 + idx * 800}
                />
              ))}
            </div>
          </section>
        )}

        {/* EVENT PRODUCTION WORKFLOW */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#84871d] dark:text-[#c7cb2d] font-semibold">
              The Execution Standard
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1.5">
              Blueprint through Event Day Execution
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] shadow-sm">
              <span className="text-[10px] font-mono font-bold text-[#84871d] dark:text-[#c7cb2d]">PHASE 01</span>
              <h4 className="font-display text-base font-bold text-[var(--text-primary)] mt-3 mb-2">Venue Recon & Audit</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Precise spatial measurements, lighting angles, traffic flow analysis, and stage line-of-sight planning.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-card)] shadow-sm">
              <span className="text-[10px] font-mono font-bold text-[#84871d] dark:text-[#c7cb2d]">PHASE 02</span>
              <h4 className="font-display text-base font-bold text-[var(--text-primary)] mt-3 mb-2">3D Renders & Concepts</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Photorealistic mockups of your stage, entrance tunnels, backdrops, and lighting atmospheres before build starts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-card)] shadow-sm">
              <span className="text-[10px] font-mono font-bold text-[#84871d] dark:text-[#c7cb2d]">PHASE 03</span>
              <h4 className="font-display text-base font-bold text-[var(--text-primary)] mt-3 mb-2">Fabrication & Print</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                High-resolution large-format printing, structural framing, acrylic builds, and hardware prep under strict QC.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-card)] shadow-sm">
              <span className="text-[10px] font-mono font-bold text-[#84871d] dark:text-[#c7cb2d]">PHASE 04</span>
              <h4 className="font-display text-base font-bold text-[var(--text-primary)] mt-3 mb-2">On-Site Rigging & Handover</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Zero-delay venue rigging, cable management, lighting calibration, and live support throughout show day.
              </p>
            </div>
          </div>
        </section>

        {/* COMPACT CENTERED CLIENT FEEDBACKS (LIMITED TO TOP 3 BY QUALITY) */}
        <ClientFeedbackSection limit={3} showAllLink={true} />

        {/* INQUIRY & BOOKING SECTION */}
        <section className="bg-[var(--bg-card)]/40 py-16 sm:py-24 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-sm">
                {formStatus === 'success' ? (
                  <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-full bg-[#c7cb2d]/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-8 h-8 text-[#c7cb2d]" />
                    </div>
                    <h3 className="font-display text-3xl font-bold mb-4">Brief Received!</h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-8 leading-relaxed">
                      Thank you for sharing your project details. Our team is reviewing your brief and will be in touch shortly to schedule a discovery call.
                    </p>
                    <button
                      onClick={() => setFormStatus('idle')}
                      className="px-8 py-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 transition shadow-sm"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                        Project Brief
                      </h2>
                      <p className="text-sm text-[var(--text-muted)]">
                        Fill out the details below. The more context you provide, the better we can prepare for our first chat.
                      </p>
                    </div>

                    <form onSubmit={handleContactSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            required
                            disabled={formStatus === 'submitting'}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Full Name"
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            disabled={formStatus === 'submitting'}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="name@organization.com"
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            disabled={formStatus === 'submitting'}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+234 ..."
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Organization or Brand Name
                          </label>
                          <input
                            type="text"
                            disabled={formStatus === 'submitting'}
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="e.g. Tech Summit Africa"
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-3 font-semibold">
                          What do you need help with?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            'Event Branding & Identity',
                            'Spatial Scenography & Stages',
                            'Event Media & Visuals',
                            'Corporate Brand Design',
                            'Advertising & Marketing',
                            'Other / Custom Request'
                          ].map((service) => (
                            <label key={service} className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] cursor-pointer hover:border-[#c7cb2d]/50 transition-colors">
                              <input
                                type="checkbox"
                                name="services"
                                value={service}
                                checked={selectedServices.includes(service)}
                                onChange={() => toggleService(service)}
                                disabled={formStatus === 'submitting'}
                                className="w-4 h-4 rounded text-[#c7cb2d] focus:ring-[#c7cb2d] bg-transparent border-[var(--border-strong)] disabled:opacity-50"
                              />
                              <span className={`text-sm font-medium ${formStatus === 'submitting' ? 'opacity-50' : ''}`}>
                                {service}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                          Project Details *
                        </label>
                        <textarea
                          required
                          disabled={formStatus === 'submitting'}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          rows={5}
                          placeholder="Tell us a bit about your event or brand. What are the dates, locations, or specific goals you have in mind?"
                          className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition resize-none disabled:opacity-50"
                        />
                      </div>

                      {formStatus === 'error' && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                          Something went wrong. Please try again or reach out to us via email.
                        </div>
                      )}

                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                          type="submit"
                          disabled={formStatus === 'submitting'}
                          className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {formStatus === 'submitting' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              Send Message
                              <Send className="w-4 h-4" />
                            </>
                          )}
                        </button>
                        <p className="text-[11px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d] animate-pulse" />
                          We are currently accepting new projects.
                        </p>
                      </div>
                    </form>
                  </>
                )}
              </div>

              {allShowcaseImages.length > 0 && (
                <DynamicInquiryShowcase images={allShowcaseImages} />
              )}
            </div>
          </div>
        </section>

        {/* COMPACT STUDIO DISPATCH / NEWSLETTER SUBSCRIPTION BAR */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c7cb2d] font-bold">
                Studio Dispatch
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold mt-1">
                Get Event Production & Brand Insights
              </h3>
            </div>

            <form onSubmit={handleNewsletterSubscribe} className="flex w-full md:w-auto items-center gap-2">
              <div className="relative flex-1 md:w-72">
                <Mail className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Enter your email..."
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-full pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#c7cb2d]"
                />
              </div>
              <button
                type="submit"
                disabled={subStatus === 'loading'}
                className="px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0"
              >
                {subStatus === 'done' ? 'Subscribed ✓' : subStatus === 'loading' ? '...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
