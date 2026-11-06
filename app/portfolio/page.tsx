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

const FILTER_CATEGORIES = [
  "All",
  "Event Branding",
  "Corporate Branding",
  "Event Media",
  "Photography",
  "Souvenirs",
  "Design & Print Production",
  "OOH",
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number];

/**
 * Extracts normalized deliverable tags & service items from a project row.
 */
function getDeliverableTokens(project: CaseStudy): string[] {
  const rawSources = [
    project.deliverables,
    project.tags,
    project.services,
    project.scope,
    project.sub_category,
  ];

  const list: string[] = [];
  for (const src of rawSources) {
    if (!src) continue;
    if (Array.isArray(src)) {
      src.forEach((item) => {
        if (typeof item === "string" && item.trim()) list.push(item.trim().toLowerCase());
        else if (item && typeof item === "object") {
          const val = item.name || item.title || item.label || "";
          if (val) list.push(String(val).trim().toLowerCase());
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
              if (p) list.push(String(p).trim().toLowerCase());
            });
            continue;
          }
        } catch (_) {}
      }
      trimmed
        .split(/[,•|\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .forEach((s) => list.push(s));
    }
  }
  return list;
}

/**
 * Intelligently determines which of the 7 core studio categories a project belongs to
 * based on its deliverable tags and primary category without false-positive overlaps.
 */
function classifyProjectCategories(project: CaseStudy): FilterCategory[] {
  const matched = new Set<FilterCategory>();
  const deliverables = getDeliverableTokens(project);
  const deliverablesText = deliverables.join(" | ");
  const catText = `${project.category || ""} | ${project.sub_category || ""}`.toLowerCase();
  const fullContext = `${deliverablesText} | ${catText}`;

  const hasAny = (text: string, terms: RegExp[]) => terms.some((rx) => rx.test(text));

  // 1. Event Branding (stage, scenography, spatial build, venue branding, backdrop, booth, summit, activation)
  if (
    hasAny(fullContext, [
      /\bevent\s*branding\b/i,
      /\bvenue\s*branding\b/i,
      /\bstage\b/i,
      /\bscenograph/i,
      /\bspatial\b/i,
      /\bbooth\b/i,
      /\bexhibition\b/i,
      /\btunnel\b/i,
      /\bbackdrop\b/i,
      /\bexperiential\b/i,
      /\bactivation\b/i,
      /\bset\s*build\b/i,
      /\barrival\s*set/i,
      /\benvironmental\s*branding\b/i,
      /\bconference\s*branding\b/i,
      /\bsummit\b/i,
    ])
  ) {
    matched.add("Event Branding");
  }

  // 2. Corporate Branding (strictly corporate identity, logo, brand strategy, brand guidelines, rebranding — NEVER triggered by "Event Branding")
  const textWithoutEventBranding = fullContext
    .replace(/event\s*branding/gi, "")
    .replace(/venue\s*branding/gi, "")
    .replace(/environmental\s*branding/gi, "")
    .replace(/stage\s*branding/gi, "");

  if (
    hasAny(textWithoutEventBranding, [
      /\bcorporate\s*(brand|branding|identity)\b/i,
      /\bbrand\s*(identity|strategy|guideline|positioning|architecture|book|manual|system)\b/i,
      /\bvisual\s*identity\b/i,
      /\blogo\s*(design|system|mark|identity)?\b/i,
      /\brebrand/i,
      /\bnaming\b/i,
      /\bstationery\s*design\b/i,
    ])
  ) {
    matched.add("Corporate Branding");
  }

  // 3. Event Media (video production, motion graphics, aftermovie, livestream, documentary, LED screen content, showreel)
  if (
    hasAny(fullContext, [
      /\bevent\s*media\b/i,
      /\bvideo\b/i,
      /\bmotion\b/i,
      /\bdocumentary\b/i,
      /\baftermovie\b/i,
      /\bshowreel\b/i,
      /\breel\b/i,
      /\blivestream/i,
      /\blive\s*stream/i,
      /\banimation\b/i,
      /\bled\s*(screen|content|visual)\b/i,
      /\bmedia\s*(coverage|production)\b/i,
      /\bhighlight\s*video\b/i,
    ])
  ) {
    matched.add("Event Media");
  }

  // 4. Photography (event photography, portrait, headshots, photo coverage, photo booth, documentary photography)
  if (
    hasAny(fullContext, [
      /\bphotograph/i,
      /\bphoto\s*(coverage|shoot|booth|story|journalism|gallery|documentation)\b/i,
      /\bportrait/i,
      /\bheadshot/i,
      /\bstill\s*coverage\b/i,
    ])
  ) {
    matched.add("Photography");
  }

  // 5. Souvenirs (merchandise, gift box, tote bag, lanyard, t-shirt, apparel, wristband, lapel pin, notebook, jotter, mug, award plaque)
  if (
    hasAny(fullContext, [
      /\bsouvenir/i,
      /\bmerch/i,
      /\bgift\s*(box|bag|pack|item|set)?\b/i,
      /\blanyard/i,
      /\btote\b/i,
      /\bt-?shirt/i,
      /\bhoodie/i,
      /\bapparel/i,
      /\bwristband/i,
      /\bswag/i,
      /\bhamper/i,
      /\bjotter/i,
      /\bnotebook/i,
      /\bdiary\b/i,
      /\blapel\b/i,
      /\bplaque/i,
      /\btrophy/i,
      /\bmedal\b/i,
      /\bmug\b/i,
      /\bwater\s*bottle/i,
      /\bpen\b/i,
      /\bcollateral/i,
    ])
  ) {
    matched.add("Souvenirs");
  }

  // 6. Design & Print Production (graphic design, print production, brochure, programme booklet, magazine, roll-up banner, flyer, poster, Tag/badge design)
  if (
    hasAny(fullContext, [
      /\bdesign\s*&\s*print/i,
      /\bprint\s*(production|collateral|media|material|design)?\b/i,
      /\bgraphic\s*design\b/i,
      /\bpublication/i,
      /\beditorial/i,
      /\bbrochure/i,
      /\bbooklet/i,
      /\bmagazine/i,
      /\bprogramme\b/i,
      /\bannual\s*report/i,
      /\bflyer/i,
      /\bposter\b/i,
      /\broll-?up\b/i,
      /\bfeather\s*banner/i,
      /\binvitation\s*card/i,
      /\baccreditation\s*(pass|tag|badge)/i,
      /\bdelegate\s*(pass|tag|badge|folder)/i,
      /\bpackaging\s*design/i,
      /\bkey\s*visual/i,
    ])
  ) {
    matched.add("Design & Print Production");
  }

  // 7. OOH (Out-of-Home, billboard, lamp post, gantry, bus branding, street banner, directional signage, wayfinding, fascia)
  if (
    hasAny(fullContext, [
      /\booh\b/i,
      /\bout-?of-?home\b/i,
      /\bbillboard/i,
      /\blamp\s*post/i,
      /\bstreet\s*pole/i,
      /\bgantry\b/i,
      /\bunipole\b/i,
      /\bled\s*billboard/i,
      /\btransit\s*branding/i,
      /\bbus\s*branding/i,
      /\bvehicle\s*branding/i,
      /\bwayfinding/i,
      /\bdirectional\s*sign/i,
      /\boutdoor\s*(advertising|signage|media|banner)/i,
      /\bfascia\b/i,
      /\bhoarding\b/i,
    ])
  ) {
    matched.add("OOH");
  }

  // Fallback if a project had no matching deliverable keywords yet
  if (matched.size === 0) {
    matched.add("Event Branding");
  }

  return Array.from(matched);
}

export default function PortfolioPage() {
  const [projects, setProjects] = React.useState<CaseStudy[]>([]);
  const [activeFilter, setActiveFilter] = React.useState<FilterCategory>("All");
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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const filteredProjects = React.useMemo(() => {
    if (activeFilter === "All") return projects;
    return projects.filter((project) => {
      const categories = classifyProjectCategories(project);
      return categories.includes(activeFilter);
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
            We prefer to let the work speak for itself. Here is a curated look at some of the physical spaces, stage setups, and brand identities we&apos;ve deployed recently.
          </p>
        </section>

        {/* 7 SERVICE FILTER PILLS */}
        <section ref={gridTopRef} className="max-w-6xl mx-auto px-5 sm:px-8 pb-10 flex justify-center scroll-mt-24">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {FILTER_CATEGORIES.map((label) => {
              const isActive = activeFilter === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveFilter(label)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#c7cb2d] text-black font-bold shadow-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]/50"
                  }`}
                >
                  {label}
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
                No case studies tagged under <strong>{activeFilter}</strong> yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedProjects.map((project) => {
                  const matchedCats = classifyProjectCategories(project);
                  const displayBadge =
                    activeFilter !== "All" && matchedCats.includes(activeFilter)
                      ? activeFilter
                      : matchedCats[0];

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

                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <ArrowUpRight className="w-4 h-4 text-[#c7cb2d]" />
                        </div>
                      </div>

                      {/* COMPACT FOOTER BELOW IMAGE */}
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-0.5">
                            <span className="text-[#c7cb2d] font-semibold shrink-0">{displayBadge}</span>
                            {project.client && (
                              <>
                                <span>•</span>
                                <span className="truncate">{project.client}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="shrink-0">{project.year || "2026"}</span>
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

              {/* PAGINATION BAR (ALWAYS VISIBLE WHEN PROJECTS EXIST) */}
              <div className="mt-10 pt-6 border-t border-[var(--border-subtle)]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs font-mono text-[var(--text-muted)]">
                  Showing <span className="text-[var(--text-primary)] font-bold">{startIndex + 1}</span>–
                  <span className="text-[var(--text-primary)] font-bold">
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredProjects.length)}
                  </span>{" "}
                  of <span className="text-[var(--text-primary)] font-bold">{filteredProjects.length}</span> projects
                  {totalPages > 1 ? ` (Page ${currentPage} of ${totalPages})` : ""}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 text-xs font-semibold flex items-center gap-1 text-[var(--text-primary)] hover:border-[#c7cb2d] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
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
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
