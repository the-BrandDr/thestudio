"use client";

// app/portfolio/page.tsx

import * as React from 'react';
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  category: string;
  client: string;
  year: string;
  summary: string;
  cover_image: string;
}

const CATEGORIES = [
  'All',
  'Event Branding',
  'Venue Branding',
  'Corporate Identity',
  'Event Media',
];

export default function PortfolioPage() {
  const [projects, setProjects] = React.useState<CaseStudy[]>([]);
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('case_studies')
          .select('id, slug, title, category, client, year, summary, cover_image')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Failed to load portfolio items:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const filteredProjects =
    activeCategory === 'All'
      ? projects
      : projects.filter(
          (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
        );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-20">
        {/* HERO SECTION */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-12 sm:pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Case Studies (Recent projects)</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
            A look at what we&apos;ve been building.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            We prefer to let the work speak for itself. Here is a curated look at some of the physical spaces, stage setups, and brand identities we&apos;ve deployed recently.
          </p>
        </section>

        {/* CATEGORY FILTER PILLS */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-14 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--text-primary)] text-[var(--bg-main)] shadow-sm'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* PROJECTS GRID (OVERLAY CARDS) */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--text-dim)] text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#c7cb2d]" />
              <p className="text-xs uppercase font-mono tracking-widest">
                Loading portfolio...
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No projects found in this category yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/portfolio/${project.slug}`}
                  className="group block relative w-full aspect-[4/3] sm:aspect-[4/5] overflow-hidden rounded-[32px] bg-[var(--bg-card)] shadow-sm"
                >
                  <Image
                    src={project.cover_image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
                  
                  {/* Top Right Arrow */}
                  <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>

                  {/* Text Content overlaying the image */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-10 text-left z-10">
                    <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-white/70 mb-3">
                      <span>{project.category}</span>
                      <span>•</span>
                      <span>{project.year || '2026'}</span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 group-hover:text-[#c7cb2d] transition-colors">
                      {project.title}
                    </h2>
                    
                    <p className="text-sm text-white/80 line-clamp-2 leading-relaxed max-w-md">
                      {project.summary}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}