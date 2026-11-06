"use client";

// app/portfolio/page.tsx

import * as React from "react";
import Header from "@/components/navigation/header";
import Footer from "@/components/navigation/footer";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  category: string;
  sub_category?: string;
  client: string;
  year: string;
  summary: string;
  description?: string;
  cover_image: string;
  deliverables?: string[] | string | null;
  tags?: string[] | string | null;
  services?: string[] | string | null;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 6;

/**
 * Extracts a clean array of deliverable/tag strings from a case study row,
 * supporting arrays, JSON arrays, or comma/bullet-separated text in deliverables/tags.
 */
function extractDeliverableTags(project: CaseStudy): string[] {
  const rawSources = [
    project.deliverables,
    project.tags,
    project.services,
    project.scope,
    project.sub_category,
  ];

  const collected: string[] = [];

  for (const src of rawSources) {
    if (!src) continue;
    if (Array.isArray(src)) {
      src.forEach((item) => {
        if (typeof item === "string" && item.trim()) {
          collected.push(item.trim());
        } else if (item && typeof item === "object" && (item.name || item.title || item.label)) {
          collected.push(String(item.name || item.title || item.label).trim());
        }
      });
    } else if (typeof src === "string") {
      const trimmed = src.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (p) collected.push(String(p).trim());
            });
            continue;
          }
        } catch (_) {}
      }
      trimmed
        .split(/[,•|\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => collected.push(s));
    }
  }

  // Deduplicate case-insensitively while preserving display casing
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tag of collected) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tag);
    }
  }
  return unique;
}

export default function PortfolioPage() {
  const [projects, setProjects] = React.useState<CaseStudy[]>([]);
  const [activeTag, setActiveTag] = React.useState("All");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const gridTopRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("case_studies")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error("Failed to load portfolio items:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, []);

  // Build filter pills dynamically from all deliverables/tags filled across projects
  const deliverableFilterPills = React.useMemo(() => {
    const seen = new Map<string, string>();
    projects.forEach((p) => {
      const pTags = extractDeliverableTags(p);
      pTags.forEach((t) => {
        const lower = t.toLowerCase();
        if (!seen.has(lower)) {
          seen.set(lower, t);
        }
      });
    });

    // If no deliverable tags have been entered yet, fall back to any project categories present
    if (seen.size === 0) {
      projects.forEach((p) => {
        if (p.category && p.category.trim()) {
          const lower = p.category.trim().toLowerCase();
          if (!seen.has(lower)) seen.set(lower, p.category.trim());
        }
      });
    }

    return ["All", ...Array.from(seen.values())];
  }, [projects]);

  // Reset to page 1 whenever the active deliverable tag changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTag]);

  const filteredProjects = React.useMemo(() => {
    if (activeTag === "All") return projects;
    const target = activeTag.toLowerCase();
    return projects.filter((p) => {
      const pTags = extractDeliverableTags(p).map((t) => t.toLowerCase());
      if (pTags.includes(target) || pTags.some((t) => t.includes(target))) {
        return true;
      }
      return (p.category || "").toLowerCase() === target;
    });
  }, [projects, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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

        {/* DELIVERABLES / TAGS FILTER PILLS */}
        <section ref={gridTopRef} className="max-w-7xl mx-auto px-5 sm:px-8 pb-10 flex justify-center scroll-mt-24">
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-5xl">
            {deliverableFilterPills.map((tag) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? "bg-[var(--text-primary)] text-[var(--bg-main)] shadow-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tag}
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
                No projects found with this deliverable tag yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {paginatedProjects.map((project) => {
                  const projectTags = extractDeliverableTags(project);
                  return (
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-500" />

                      {/* Top Right Arrow */}
                      <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1.5 group-hover:translate-y-0">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>

                      {/* Compact Text Content overlaying the image */}
                      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 text-left z-10">
                        {projectTags.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {projectTags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-[9px] font-mono uppercase tracking-wider text-[#c7cb2d]"
                              >
                                {t}
                              </span>
                            ))}
                            {projectTags.length > 3 && (
                              <span className="text-[9px] font-mono text-white/60">
                                +{projectTags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/70 mb-1.5">
                            <span className="truncate">{project.category}</span>
                            <span>•</span>
                            <span>{project.year || "2026"}</span>
                          </div>
                        )}

                        <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white mb-1 group-hover:text-[#c7cb2d] transition-colors line-clamp-1">
                          {project.title}
                        </h2>

                        <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                          {project.summary || project.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Showing <span className="text-[var(--text-primary)] font-bold">{startIndex + 1}</span>–
                    <span className="text-[var(--text-primary)] font-bold">
                      {Math.min(startIndex + ITEMS_PER_PAGE, filteredProjects.length)}
                    </span>{" "}
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
                                ? "bg-[#c7cb2d] text-black"
                                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
