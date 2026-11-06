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

const ITEMS_PER_PAGE = 9;

const STREAMLINED_FILTERS = [
  {
    label: "All",
    keywords: [],
  },
  {
    label: "Events",
    keywords: [
      "event",
      "stage",
      "scenography",
      "spatial",
      "venue",
      "booth",
      "exhibition",
      "tunnel",
      "backdrop",
      "experiential",
      "summit",
      "conference",
      "activation",
      "set build",
      "fabrication",
      "lighting",
    ],
  },
  {
    label: "Event Media",
    keywords: [
      "media",
      "video",
      "photo",
      "motion",
      "coverage",
      "documentary",
      "reel",
      "showreel",
      "livestream",
      "content",
      "animation",
      "screen",
      "led",
      "projection",
    ],
  },
  {
    label: "Corporate Brand",
    keywords: [
      "corporate",
      "brand",
      "identity",
      "logo",
      "guideline",
      "strategy",
      "positioning",
      "rebrand",
      "naming",
      "visual identity",
      "stationary",
      "stationery",
      "communications",
    ],
  },
  {
    label: "Souvenirs",
    keywords: [
      "souvenir",
      "merch",
      "merchandise",
      "gift",
      "collateral",
      "lanyard",
      "tote",
      "shirt",
      "apparel",
      "wristband",
      "badge",
      "swag",
      "packaging",
      "box",
      "hamper",
      "diary",
      "notebook",
      "pen",
    ],
  },
  {
    label: "Design",
    keywords: [
      "design",
      "print",
      "graphic",
      "publication",
      "editorial",
      "brochure",
      "report",
      "flyer",
      "poster",
      "signage",
      "wayfinding",
      "billboard",
      "ooh",
      "out-of-home",
      "environmental",
      "banner",
      "roll-up",
    ],
  },
];

/**
 * Combines all deliverable tags, categories, and descriptions on a project
 * into a single searchable text string for smart group matching.
 */
function buildProjectSearchCorpus(project: CaseStudy): string {
  const parts: string[] = [
    project.category || "",
    project.sub_category || "",
    project.title || "",
    project.summary || "",
  ];

  const rawLists = [project.deliverables, project.tags, project.services, project.scope];
  for (const src of rawLists) {
    if (!src) continue;
    if (Array.isArray(src)) {
      src.forEach((item) => {
        if (typeof item === "string") parts.push(item);
        else if (item && typeof item === "object") {
          parts.push(String(item.name || item.title || item.label || ""));
        }
      });
    } else if (typeof src === "string") {
      parts.push(src);
    }
  }

  return parts.join(" ").toLowerCase();
}

/**
 * Returns the primary streamlined group label for display on the card subtitle
 */
function resolvePrimaryGroupLabel(project: CaseStudy): string {
  const corpus = buildProjectSearchCorpus(project);
  for (const group of STREAMLINED_FILTERS) {
    if (group.label === "All") continue;
    if (group.keywords.some((kw) => corpus.includes(kw))) {
      return group.label;
    }
  }
  return project.category || "Brand Experience";
}

export default function PortfolioPage() {
  const [projects, setProjects] = React.useState<CaseStudy[]>([]);
  const [activeFilter, setActiveFilter] = React.useState("All");
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

  // Reset to page 1 when switching filter groups
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const filteredProjects = React.useMemo(() => {
    if (activeFilter === "All") return projects;
    const group = STREAMLINED_FILTERS.find((g) => g.label === activeFilter);
    if (!group) return projects;

    return projects.filter((project) => {
      const corpus = buildProjectSearchCorpus(project);
      return group.keywords.some((kw) => corpus.includes(kw));
    });
  }, [projects, activeFilter]);

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
        {/* COMPACT HERO SECTION */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card)] text-[10px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Selected Works</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-4">
            A look at what we&apos;ve been building.
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
            Curated event environments, corporate brand systems, media production, and custom collateral deployed by Lavie Studios.
          </p>
        </section>

        {/* STREAMLINED 6-PILLAR FILTER BAR */}
        <section ref={gridTopRef} className="max-w-6xl mx-auto px-5 sm:px-8 pb-10 flex justify-center scroll-mt-24">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {STREAMLINED_FILTERS.map((group) => {
              const isActive = activeFilter === group.label;
              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => setActiveFilter(group.label)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#c7cb2d] text-black font-bold shadow-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]/50"
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* COMPACT, UNCLOUDED 3-COLUMN CARDS */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--text-dim)] text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#c7cb2d]" />
              <p className="text-xs uppercase font-mono tracking-widest">
                Loading portfolio...
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No case studies matched <strong>{activeFilter}</strong> yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedProjects.map((project) => {
                  const groupTag = resolvePrimaryGroupLabel(project);
                  return (
                    <Link
                      key={project.id}
                      href={`/portfolio/${project.slug}`}
                      className="group flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 overflow-hidden hover:border-[#c7cb2d]/60 transition-all duration-300"
                    >
                      {/* CLEAN, UNOBSTRUCTED IMAGE FRAME */}
                      <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/20">
                        <Image
                          src={project.cover_image}
                          alt={project.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />

                        {/* Subtle corner action icon on hover only */}
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <ArrowUpRight className="w-4 h-4 text-[#c7cb2d]" />
                        </div>
                      </div>

                      {/* COMPACT FOOTER BELOW IMAGE (NO TEXT CLOUDING THE PHOTO) */}
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-0.5">
                            <span className="text-[#c7cb2d] font-semibold">{groupTag}</span>
                            {project.client && (
                              <>
                                <span>•</span>
                                <span className="truncate">{project.client}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{project.year || "2026"}</span>
                          </div>
                          <h2 className="font-display text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[#c7cb2d] transition-colors truncate">
                            {project.title}
                          </h2>
                        </div>

                        <ArrowUpRight className="w-4 h-4 text-[var(--text-dim)] group-hover:text-[#c7cb2d] shrink-0 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="mt-10 pt-6 border-t border-[var(--border-subtle)]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Showing <span className="text-[var(--text-primary)] font-bold">{startIndex + 1}</span>–
                    <span className="text-[var(--text-primary)] font-bold">
                      {Math.min(startIndex + ITEMS_PER_PAGE, filteredProjects.length)}
                    </span>{" "}
                    of <span className="text-[var(--text-primary)] font-bold">{filteredProjects.length}</span> projects
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs font-semibold flex items-center gap-1 text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                        const active = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-7 h-7 rounded-full text-xs font-mono font-bold transition cursor-pointer ${
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
                      className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs font-semibold flex items-center gap-1 text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
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
