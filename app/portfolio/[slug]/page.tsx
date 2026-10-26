"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Header from "@/components/navigation/header";
import Footer from "@/components/navigation/footer";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Building2,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

function FallbackStudioHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[var(--bg-main)]/85 backdrop-blur-md border-b border-[var(--border-subtle)]/50">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-display text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
            LAVIE <span className="text-[#c7cb2d]">STUDIOS.</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)] transition">Home</Link>
          <Link href="/#about" className="hover:text-[var(--text-primary)] transition">Who we are</Link>
          <Link href="/portfolio" className="text-[#c7cb2d] font-bold">Portfolio</Link>
          <Link href="/#services" className="hover:text-[var(--text-primary)] transition">Services</Link>
          <Link href="/#pricing" className="hover:text-[var(--text-primary)] transition">Pricing</Link>
          <Link href="/#contact" className="hover:text-[var(--text-primary)] transition">Contact Us</Link>
        </nav>
        <Link
          href="/#contact"
          className="px-4 py-2 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition flex items-center gap-1"
        >
          Get Started <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}

function FallbackStudioFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)]/60 bg-[var(--bg-card)]/40 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="font-display text-base font-bold text-[var(--text-primary)]">
            Lavie Studios Ltd <span className="text-xs font-mono text-[var(--text-dim)]">(RC - 9210438)</span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Old Ogbomoso-Ilorin Road, Yoaco Area, Ogbomoso, Oyo State, Nigeria • <span className="italic text-[#c7cb2d]">the life in every place</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[#c7cb2d] transition">Home</Link>
          <Link href="/portfolio" className="hover:text-[#c7cb2d] transition">Portfolio</Link>
          <Link href="/#services" className="hover:text-[#c7cb2d] transition">Services</Link>
          <Link href="/#contact" className="hover:text-[#c7cb2d] transition">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

export default function PortfolioCaseStudyDetailPage() {
  const params = useParams();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string);
  const supabase = createClient();

  const [project, setProject] = React.useState<any | null>(null);
  const [relatedProjects, setRelatedProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    async function fetchCaseStudy() {
      setLoading(true);
      const { data: allRows } = await supabase
        .from("case_studies")
        .select("*")
        .order("created_at", { ascending: false });

      if (allRows && allRows.length > 0) {
        const decoded = decodeURIComponent(rawSlug || "").toLowerCase();
        const found =
          allRows.find((r) => String(r.slug || "").toLowerCase() === decoded) ||
          allRows.find((r) => String(r.id || "").toLowerCase() === decoded) ||
          allRows.find(
            (r) =>
              String(r.title || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") === decoded
          );

        if (found) {
          setProject(found);
          setRelatedProjects(allRows.filter((r) => r.id !== found.id).slice(0, 3));
        }
      }
      setLoading(false);
    }
    if (rawSlug) fetchCaseStudy();
  }, [rawSlug, supabase]);

  const allPhotos = React.useMemo(() => {
    if (!project) return [];
    const list: string[] = [];
    const addUrl = (u: any) => {
      if (typeof u === "string" && u.trim() && !list.includes(u.trim())) {
        list.push(u.trim());
      }
    };
    if (project.cover_image) addUrl(project.cover_image);
    if (Array.isArray(project.images)) project.images.forEach(addUrl);
    if (Array.isArray(project.gallery_media)) project.gallery_media.forEach(addUrl);
    if (Array.isArray(project.gallery)) project.gallery.forEach(addUrl);
    return list;
  }, [project]);

  const deliverables: string[] = React.useMemo(() => {
    if (!project) return [];
    if (Array.isArray(project.deliverables) && project.deliverables.length > 0) return project.deliverables;
    if (Array.isArray(project.services) && project.services.length > 0) return project.services;
    if (typeof project.deliverables === "string" && project.deliverables.trim()) {
      return project.deliverables.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    return ["Brand Strategy", "Spatial & Visual Identity", "Production & Execution"];
  }, [project]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allPhotos.length : null));
      if (e.key === "ArrowLeft")
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : null));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, allPhotos.length]);

  const coverImage = allPhotos[0] || "";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 pt-28 pb-16">
        {loading ? (
          <div className="max-w-6xl mx-auto px-6 space-y-8 animate-pulse">
            <div className="h-6 w-36 rounded-full bg-[var(--bg-card)]" />
            <div className="h-14 w-2/3 rounded-2xl bg-[var(--bg-card)]" />
            <div className="h-[460px] w-full rounded-3xl bg-[var(--bg-card)]" />
          </div>
        ) : !project ? (
          <div className="max-w-3xl mx-auto px-6 text-center space-y-6 p-12 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <span className="text-xs font-mono uppercase tracking-widest text-[#c7cb2d]">Project Not Found</span>
            <h1 className="font-display text-3xl font-bold">This project archive could not be located.</h1>
            <p className="text-sm text-[var(--text-muted)]">
              It may have been updated or moved under a new portfolio link.
            </p>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Portfolio
            </Link>
          </div>
        ) : (
          <>
            {/* TOP BREADCRUMB & HEADER */}
            <section className="max-w-6xl mx-auto px-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link
                  href="/portfolio"
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[#c7cb2d] transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Portfolio
                </Link>
                <span className="px-3.5 py-1 rounded-full bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 text-[#c7cb2d] text-[11px] font-mono uppercase tracking-wider font-bold">
                  {project.category || "Case Study"}
                </span>
              </div>

              <div className="space-y-4 max-w-4xl">
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
                  {project.title}
                </h1>
                {project.summary && (
                  <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
                    {project.summary}
                  </p>
                )}
              </div>

              {/* PROJECT METADATA BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#c7cb2d]" /> Client
                  </span>
                  <p className="font-display text-sm font-bold">{project.client || "Featured Client"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#c7cb2d]" /> Category
                  </span>
                  <p className="font-display text-sm font-bold">{project.category || "Brand & Spatial Design"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#c7cb2d]" /> Year
                  </span>
                  <p className="font-mono text-sm font-bold">{project.year || "2026"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c7cb2d]" /> Project Highlights
                  </span>
                  <p className="font-display text-sm font-bold text-[#c7cb2d]">
                    {project.metrics || `${allPhotos.length} Project Photos`}
                  </p>
                </div>
              </div>
            </section>

            {/* HERO PRIMARY IMAGE */}
            {coverImage && (
              <section className="max-w-6xl mx-auto px-6 mt-8">
                <div
                  onClick={() => setLightboxIndex(0)}
                  className="relative group h-[340px] sm:h-[520px] lg:h-[620px] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 cursor-pointer"
                >
                  <img
                    src={coverImage}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-6">
                    <span className="px-3.5 py-1.5 rounded-full bg-black/80 text-white text-xs font-mono flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-[#c7cb2d]" /> View full size (1 of {allPhotos.length})
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* THE CHALLENGE, OUR SOLUTION & DELIVERABLES */}
            <section className="max-w-6xl mx-auto px-6 mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* THE CHALLENGE */}
                  <div className="p-7 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                      01 / The Challenge
                    </span>
                    <h2 className="font-display text-xl font-bold">Project Context & Brief</h2>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                      {project.challenge ||
                        project.summary ||
                        `${project.client || "The client"} needed a clear, memorable visual and spatial experience designed to connect with their audience and bring their story to life.`}
                    </p>
                  </div>

                  {/* OUR SOLUTION */}
                  <div className="p-7 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                      02 / Our Solution
                    </span>
                    <h2 className="font-display text-xl font-bold">How We Delivered</h2>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                      {project.solution ||
                        `Lavie Studios crafted a cohesive identity and production system across ${project.category || "every project touchpoint"}, combining thoughtful creative direction with meticulous execution.`}
                    </p>
                  </div>
                </div>

                {/* PROJECT OVERVIEW */}
                {project.summary && (project.challenge || project.solution) && (
                  <div className="p-7 rounded-3xl bg-[var(--bg-card)]/60 border border-[var(--border-subtle)]/40 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">
                      Project Overview
                    </span>
                    <p className="text-sm sm:text-base text-[var(--text-primary)] leading-relaxed">
                      {project.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* SCOPE & DELIVERABLES SIDEBAR */}
              <aside className="lg:col-span-4 p-7 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                    03 / What We Delivered
                  </span>
                  <h3 className="font-display text-lg font-bold mt-1">Scope & Deliverables</h3>
                </div>

                <ul className="space-y-2.5">
                  {deliverables.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-primary)] p-2.5 rounded-xl bg-[var(--bg-main)]/70 border border-[var(--border-subtle)]/40"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#c7cb2d] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {project.metrics && (
                  <div className="pt-4 border-t border-[var(--border-subtle)]/50 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">
                      Results & Impact
                    </span>
                    <p className="font-display text-base font-bold text-[#c7cb2d]">{project.metrics}</p>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    href="/#contact"
                    className="w-full py-3 px-5 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition"
                  >
                    Start a Similar Project <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </aside>
            </section>

            {/* COMPLETE MULTI-IMAGE GALLERY */}
            {allPhotos.length > 0 && (
              <section className="max-w-6xl mx-auto px-6 mt-16 space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                      04 / Project Gallery
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
                      All Project Photos ({allPhotos.length})
                    </h2>
                  </div>
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Click any photo to view in full screen
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allPhotos.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxIndex(idx)}
                      className={`group relative rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 cursor-pointer ${
                        idx % 5 === 0 && allPhotos.length >= 4 ? "sm:col-span-2 h-80 sm:h-96" : "h-72 sm:h-80"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${project.title} photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-black/80 text-white text-[10px] font-mono">
                          Photo {String(idx + 1).padStart(2, "0")} of {String(allPhotos.length).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* RELATED PROJECTS (Clean Studio Wording) */}
            {relatedProjects.length > 0 && (
              <section className="max-w-6xl mx-auto px-6 mt-20 pt-12 border-t border-[var(--border-subtle)]/50 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                      More From Our Portfolio
                    </span>
                    <h2 className="font-display text-2xl font-bold">Related Case Studies</h2>
                  </div>
                  <Link
                    href="/portfolio"
                    className="text-xs font-mono uppercase tracking-wider text-[#c7cb2d] hover:underline flex items-center gap-1"
                  >
                    View Full Portfolio <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedProjects.map((rel) => {
                    const relCover =
                      rel.cover_image || (Array.isArray(rel.images) && rel.images[0]) || "";
                    const relCount = Array.isArray(rel.images) && rel.images.length > 0 ? rel.images.length : relCover ? 1 : 0;
                    return (
                      <Link
                        key={rel.id}
                        href={`/portfolio/${rel.slug || rel.id}`}
                        className="group rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 overflow-hidden flex flex-col justify-between hover:border-[#c7cb2d]/60 transition"
                      >
                        <div>
                          <div className="relative h-48 bg-[var(--bg-main)] overflow-hidden">
                            {relCover ? (
                              <img
                                src={relCover}
                                alt={rel.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                            ) : null}
                            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/75 text-white text-[10px] font-mono">
                              {relCount} {relCount === 1 ? "photo" : "photos"}
                            </span>
                          </div>
                          <div className="p-5 space-y-1.5">
                            <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                              {rel.category}
                            </span>
                            <h3 className="font-display text-base font-bold group-hover:text-[#c7cb2d] transition">
                              {rel.title}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">{rel.summary}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {allPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + allPhotos.length) % allPhotos.length);
                }}
                className="absolute left-4 sm:left-8 w-11 h-11 rounded-full bg-white/10 hover:bg-[#c7cb2d] hover:text-black text-white flex items-center justify-center cursor-pointer transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % allPhotos.length);
                }}
                className="absolute right-4 sm:right-8 w-11 h-11 rounded-full bg-white/10 hover:bg-[#c7cb2d] hover:text-black text-white flex items-center justify-center cursor-pointer transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="max-w-5xl max-h-[85vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allPhotos[lightboxIndex]}
              alt={`${project?.title || "Project"} full view ${lightboxIndex + 1}`}
              className="max-h-[78vh] w-auto object-contain rounded-2xl border border-white/10"
            />
            <div className="text-xs font-mono text-white/80">
              {project?.title} — Photo {lightboxIndex + 1} of {allPhotos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
