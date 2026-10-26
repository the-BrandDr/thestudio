"use client";

// app/portfolio/[slug]/page.tsx

import * as React from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface CaseStudyDetail {
  slug: string;
  title: string;
  category: string;
  client: string;
  year: string;
  summary: string;
  description: string;
  cover_image: string;
  gallery_images: string[];
  deliverables: string[];
}

// 1. The Inner Content Component that uses useParams()
function CaseStudyContent() {
  const params = useParams();
  const slug = params?.slug as string;

  const [study, setStudy] = React.useState<CaseStudyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStudy() {
      if (!slug) return;
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('case_studies')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setStudy(data);
      } catch (err) {
        console.error('Failed to load project details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudy();
  }, [slug]);

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 pt-32 pb-32">
        <Loader2 className="w-6 h-6 animate-spin text-[#c7cb2d]" />
        <p className="text-xs uppercase font-mono tracking-widest text-[var(--text-dim)]">
          Loading Case Study...
        </p>
      </main>
    );
  }

  if (!study) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-32 px-5 text-center">
        <h1 className="font-display text-3xl font-bold mb-4">Project Not Found</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          The case study you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archive
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 pt-28 sm:pt-32 pb-24">
      {/* NAVIGATION BACK */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-6 pb-8">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Selected Archive
        </Link>
      </section>

      {/* HERO TITLE & META */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
          <span>{study.category}</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-8 leading-[1.1]">
          {study.title}
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] text-xs">
          <div>
            <p className="font-mono uppercase text-[10px] tracking-widest text-[var(--text-dim)] mb-1">Client</p>
            <p className="font-bold text-[var(--text-primary)]">{study.client || 'Confidential'}</p>
          </div>
          <div>
            <p className="font-mono uppercase text-[10px] tracking-widest text-[var(--text-dim)] mb-1">Year</p>
            <p className="font-bold text-[var(--text-primary)]">{study.year || '2026'}</p>
          </div>
          <div>
            <p className="font-mono uppercase text-[10px] tracking-widest text-[var(--text-dim)] mb-1">Category</p>
            <p className="font-bold text-[var(--text-primary)]">{study.category}</p>
          </div>
          <div>
            <p className="font-mono uppercase text-[10px] tracking-widest text-[var(--text-dim)] mb-1">Status</p>
            <p className="font-bold text-[#c7cb2d]">Delivered</p>
          </div>
        </div>
      </section>

      {/* MAIN COVER IMAGE */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[32px] bg-[var(--bg-card)] shadow-md">
          <Image
            src={study.cover_image}
            alt={study.title}
            fill
            priority
            className="object-cover"
          />
        </div>
      </section>

      {/* PROJECT NARRATIVE & DELIVERABLES */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Execution Overview</h2>
            <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
              {study.description || study.summary}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="p-8 rounded-3xl bg-[var(--bg-card)]">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold mb-6">
                Scope & Deliverables
              </h3>
              <ul className="space-y-3.5">
                {study.deliverables?.length ? (
                  study.deliverables.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#c7cb2d] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-[var(--text-muted)]">Full-scale project execution</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY IMAGES */}
      {study.gallery_images?.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {study.gallery_images.map((imgUrl, i) => (
              <div key={i} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-[var(--bg-card)]">
                <Image
                  src={imgUrl}
                  alt={`${study.title} exhibition view ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BOTTOM CTA */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 text-center pt-8">
        <div className="p-10 sm:p-14 rounded-[32px] bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <h3 className="font-display text-2xl sm:text-3xl font-bold mb-4">Planning a similar production?</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-8">
            Explore your investment range upfront or speak directly with our team to start scoping your event.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-2 shadow-sm"
            >
              Estimate Cost <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--bg-main)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--bg-card)] border border-[var(--border-strong)] transition"
            >
              Direct Inquiry
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// 2. The Default Export wrapped in Suspense
export default function CaseStudyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />
      <React.Suspense 
        fallback={
          <main className="flex-1 flex flex-col items-center justify-center gap-3 pt-32 pb-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#c7cb2d]" />
            <p className="text-xs uppercase font-mono tracking-widest text-[var(--text-dim)]">
              Loading Case Study...
            </p>
          </main>
        }
      >
        <CaseStudyContent />
      </React.Suspense>
      <Footer />
    </div>
  );
}