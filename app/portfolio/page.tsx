"use client";

// app/portfolio/page.tsx

import * as React from 'react';
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

const ITEMS_PER_PAGE = 6;

export default function PortfolioPage() {
  const [projects, setProjects] = React.useState<CaseStudy[]>([]);
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const gridTopRef = React.useRef<HTMLDivElement>(null);

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

  // Reset to page 1 whenever the category filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  const filteredProjects =
    activeCategory === 'All'
      ? projects
      : projects.filter(
          (p) => (p.category || '').toLowerCase() === activeCategory.toLowerCase()
        );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-20">
        {/* HERO SECTION */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-10 sm:pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Case Studies (Recent projects)</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-5">
            A look at what we&apos;ve been building.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            We prefer to let the work speak for itself. Here is a curated look at some of the physical spaces, stage setups, and brand identities we&apos;ve deployed recently.
          </p>
        </section>

        {/* CATEGORY FILTER PILLS */}
        <section ref={gridTopRef} className="max-w-7xl mx-auto px-5 sm:px-8 pb-10 flex justify-center scroll-mt-24">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
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

        {/* PROJECTS GRID (COMPACT 3-COLUMN OVERLAY CARDS) */}
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
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {paginatedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/portfolio/${project.slug}`}
                    className="group block relative w-full aspect-[4/3] overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/40 shadow-sm"
                  >
                    <Image
                      src={project.cover_image}
                      alt={project.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-500" />

                    {/* Top Right Arrow */}
                    <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1.5 group-hover:translate-y-0">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>

                    {/* Compact Text Content overlaying the image */}
                    <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 text-left z-10">
                      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/70 mb-1.5">
                        <span className="truncate">{project.category}</span>
                        <span>•</span>
                        <span>{project.year || '2026'}</span>
                      </div>

                      <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white mb-1.5 group-hover:text-[#c7cb2d] transition-colors line-clamp-1">
                        {project.title}
                      </h2>

                      <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                        {project.summary}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Showing <span className="text-[var(--text-primary)] font-bold">{startIndex + 1}</span>–
                    <span className="text-[var(--text-primary)] font-bold">
                      {Math.min(startIndex + ITEMS_PER_PAGE, filteredProjects.length)}
                    </span>{' '}
                    of <span className="text-[var(--text-primary)] font-bold">{filteredProjects.length}</span> case studies
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs font-semibold flex items-center gap-1.5 text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                        const active = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-full text-xs font-mono font-bold transition cursor-pointer ${
                              active
                                ? 'bg-[#c7cb2d] text-black'
                                : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs font-semibold flex items-center gap-1.5 text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}