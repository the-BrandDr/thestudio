"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Star, MessageSquarePlus, X, Check, Loader2, ArrowRight } from "lucide-react";

const SERVICE_CATEGORIES = [
  "Brand Strategy & Positioning",
  "Corporate & Visual Identity",
  "Event Branding & Experiential",
  "Out-of-Home (OOH) & Advertising",
  "UI/UX & Digital Products",
  "Web & Software Development",
  "Motion Graphics & Video Production",
  "Print Media & Packaging",
];

export default function ClientFeedbackSection({ limit = 3, showAllLink = true }: { limit?: number; showAllLink?: boolean }) {
  const supabase = createClient();
  const [testimonials, setTestimonials] = React.useState<any[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const [form, setForm] = React.useState({
    client_name: "",
    client_role: "",
    client_company: "",
    project_category: SERVICE_CATEGORIES[2],
    rating: 5,
    quote: "",
    media_url: "",
    media_type: "",
    media_name: "",
  });

  const fetchPublishedFeedbacks = React.useCallback(async () => {
    const { data } = await supabase
      .from("client_testimonials")
      .select("*")
      .eq("status", "published");

    if (data) {
      setTotalCount(data.length);
      // Sort by Relevance & Quality: Featured first -> Highest Rating -> Richer review detail -> Most Recent
      const ranked = [...data].sort((a, b) => {
        if (Boolean(b.is_featured) !== Boolean(a.is_featured)) return b.is_featured ? 1 : -1;
        if ((b.rating || 5) !== (a.rating || 5)) return (b.rating || 5) - (a.rating || 5);
        const lenScoreB = Math.min((b.quote || "").length, 220);
        const lenScoreA = Math.min((a.quote || "").length, 220);
        if (Math.abs(lenScoreB - lenScoreA) > 25) return lenScoreB - lenScoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setTestimonials(limit ? ranked.slice(0, limit) : ranked);
    }
  }, [supabase, limit]);

  React.useEffect(() => {
    fetchPublishedFeedbacks();
  }, [fetchPublishedFeedbacks]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const type = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : "image";
      setForm((prev) => ({
        ...prev,
        media_url: ev.target?.result as string,
        media_type: type,
        media_name: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.from("client_testimonials").insert({
      client_name: form.client_name.trim(),
      client_role: form.client_role.trim(),
      client_company: form.client_company.trim(),
      project_category: form.project_category,
      rating: Number(form.rating),
      quote: form.quote.trim(),
      media_url: form.media_url || null,
      media_type: form.media_type || null,
      media_name: form.media_name || null,
      is_featured: true,
      status: "published",
    });

    setSubmitting(false);
    setSubmitted(true);
    await fetchPublishedFeedbacks();

    setTimeout(() => {
      setSubmitted(false);
      setIsModalOpen(false);
      setForm({
        client_name: "",
        client_role: "",
        client_company: "",
        project_category: SERVICE_CATEGORIES[2],
        rating: 5,
        quote: "",
        media_url: "",
        media_type: "",
        media_name: "",
      });
    }, 900);
  };

  const getInitials = (name: string) => {
    if (!name) return "LS";
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      {/* Centered Header matching Homepage Standard */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#84871d] dark:text-[#c7cb2d] font-semibold">
          Client Endorsements
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1.5">
          Trusted by Visionary Brands
        </h2>
      </div>

      {/* Compact Google-Review Style Cards (Strictly 3 on Homepage, No Large Image Previews) */}
      {testimonials.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/70 shadow-sm flex flex-col justify-between space-y-3.5 hover:border-[#c7cb2d]/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {item.client_avatar ? (
                    <img src={item.client_avatar} alt={item.client_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(item.client_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{item.client_name}</h4>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {[item.client_role, item.client_company].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < (item.rating || 5)
                          ? "fill-[#fbbc04] text-[#fbbc04]"
                          : "fill-[var(--bg-main)] text-[var(--border-subtle)]"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed line-clamp-4">
                  "{item.quote}"
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)]/40 flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase text-[var(--text-dim)] truncate">
                  {item.project_category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Centered Action Bar: Give Feedback + See More Reviews */}
      <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition cursor-pointer shadow-sm"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> Give Feedback
        </button>

        {showAllLink && totalCount > limit && (
          <Link
            href="/feedback"
            className="px-5 py-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition flex items-center gap-1.5"
          >
            See More Reviews ({totalCount}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Feedback Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">Client Review</span>
                <h3 className="font-display text-lg font-bold">Share Your Experience</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#c7cb2d] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Role / Title</label>
                  <input
                    type="text"
                    value={form.client_role}
                    onChange={(e) => setForm({ ...form, client_role: e.target.value })}
                    placeholder="Founder / Director"
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#c7cb2d] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Organization</label>
                  <input
                    type="text"
                    value={form.client_company}
                    onChange={(e) => setForm({ ...form, client_company: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#c7cb2d] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Service</label>
                  <select
                    value={form.project_category}
                    onChange={(e) => setForm({ ...form, project_category: e.target.value })}
                    className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#c7cb2d] focus:outline-none"
                  >
                    {SERVICE_CATEGORIES.map((srv) => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setForm({ ...form, rating: star })}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= form.rating ? "fill-[#fbbc04] text-[#fbbc04]" : "fill-transparent text-[var(--border-subtle)]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Review *</label>
                <textarea
                  rows={3}
                  required
                  value={form.quote}
                  onChange={(e) => setForm({ ...form, quote: e.target.value })}
                  placeholder="Share your experience..."
                  className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#c7cb2d] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[var(--bg-main)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submitted ? (
                    <><Check className="w-3.5 h-3.5" /> Thank You!</>
                  ) : submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
