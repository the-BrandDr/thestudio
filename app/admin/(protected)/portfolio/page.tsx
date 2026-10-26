"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Trash2, Edit3, X, Image as ImageIcon, Check } from "lucide-react";

const PORTFOLIO_CATEGORIES = [
  "Brand Strategy & Positioning",
  "Corporate & Visual Identity",
  "Event Branding & Experiential",
  "Out-of-Home (OOH) & Advertising",
  "UI/UX & Digital Products",
  "Web & Software Development",
  "Motion Graphics & Video Production",
  "Print Media & Packaging",
  "Creative Direction & Campaigns",
];

export default function AdminPortfolioPage() {
  const supabase = createClient();
  const [projects, setProjects] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const [form, setForm] = React.useState({
    title: "",
    slug: "",
    client: "",
    category: PORTFOLIO_CATEGORIES[1],
    year: "2026",
    summary: "",
    challenge: "",
    solution: "",
    metrics: "",
    deliverables_text: "Brand Strategy, Visual Identity, Guidelines",
    cover_image: "",
    images: [] as string[],
    is_featured: true,
  });

  const loadProjects = React.useCallback(async () => {
    const { data } = await supabase.from("case_studies").select("*").order("created_at", { ascending: false });
    if (data) setProjects(data);
  }, [supabase]);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Multi-image file selector (appends to form.images[] array and sets cover_image if empty)
  const handleMultiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setForm((prev) => {
          const nextImages = [...prev.images, dataUrl];
          return {
            ...prev,
            cover_image: prev.cover_image || dataUrl,
            images: nextImages,
          };
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeGalleryImage = (idx: number) => {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== idx);
      return {
        ...prev,
        images: next,
        cover_image: idx === 0 ? next[0] || "" : prev.cover_image,
      };
    });
  };

  const setAsCover = (imgUrl: string) => {
    setForm((prev) => ({ ...prev, cover_image: imgUrl }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      client: "",
      category: PORTFOLIO_CATEGORIES[1],
      year: "2026",
      summary: "",
      challenge: "",
      solution: "",
      metrics: "",
      deliverables_text: "Brand Strategy, Visual Identity, Guidelines",
      cover_image: "",
      images: [],
      is_featured: true,
    });
  };

  const startEditingProject = (item: any) => {
    const existingArray: string[] = Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : Array.isArray(item.gallery_media) && item.gallery_media.length > 0
      ? item.gallery_media
      : item.cover_image
      ? [item.cover_image]
      : [];

    setEditingId(item.id);
    setForm({
      title: item.title || "",
      slug: item.slug || "",
      client: item.client || "",
      category: item.category || PORTFOLIO_CATEGORIES[1],
      year: item.year || "2026",
      summary: item.summary || "",
      challenge: item.challenge || "",
      solution: item.solution || "",
      metrics: item.metrics || "",
      deliverables_text: Array.isArray(item.deliverables) ? item.deliverables.join(", ") : (item.services || []).join(", "),
      cover_image: item.cover_image || existingArray[0] || "",
      images: existingArray,
      is_featured: item.is_featured ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

    const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadState.active) return;
    setSaving(true);
    setStatusBanner(null);

    try {
      const baseSlug = (form.slug || form.title || "project")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const deliverablesArr = form.deliverables_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const galleryArr = form.images.length > 0 ? form.images : form.cover_image ? [form.cover_image] : [];
      const primaryCover = form.cover_image || galleryArr[0] || "";

      // Detect actual column names from existing rows in case_studies so Supabase PostgREST never rejects an unknown column
      const sampleRow = projects[0] || {};
      const knownCols = Object.keys(sampleRow);

      const candidatePayload: Record<string, any> = {
        title: form.title.trim(),
        slug: editingId ? baseSlug : (projects.some((p) => p.slug === baseSlug) ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug),
        client: form.client.trim(),
        category: form.category,
        year: form.year || "2026",
        summary: form.summary,
        challenge: form.challenge,
        solution: form.solution,
        metrics: form.metrics,
        deliverables: deliverablesArr,
        services: deliverablesArr,
        cover_image: primaryCover,
        images: galleryArr,
        gallery_media: galleryArr,
        is_featured: form.is_featured,
      };

      // Filter payload to only columns that exist on case_studies (if table already has rows)
      let payloadToSend: Record<string, any> = {};
      if (knownCols.length > 0) {
        for (const k of Object.keys(candidatePayload)) {
          if (knownCols.includes(k)) {
            payloadToSend[k] = candidatePayload[k];
          }
        }
        // Always ensure images or gallery_media is sent if either exists
        if (!("images" in payloadToSend) && !("gallery_media" in payloadToSend)) {
          payloadToSend.images = galleryArr;
        }
      } else {
        payloadToSend = {
          title: candidatePayload.title,
          slug: candidatePayload.slug,
          client: candidatePayload.client,
          category: candidatePayload.category,
          year: candidatePayload.year,
          summary: candidatePayload.summary,
          challenge: candidatePayload.challenge,
          solution: candidatePayload.solution,
          metrics: candidatePayload.metrics,
          deliverables: candidatePayload.deliverables,
          cover_image: candidatePayload.cover_image,
          images: candidatePayload.images,
          is_featured: candidatePayload.is_featured,
        };
      }

      // Auto-retry loop: if PostgREST complains about a specific missing column, strip that column and retry immediately
      let attempts = 0;
      let lastError: any = null;

      while (attempts < 6) {
        attempts++;
        const res = editingId
          ? await supabase.from("case_studies").update(payloadToSend).eq("id", editingId).select()
          : await supabase.from("case_studies").insert([payloadToSend]).select();

        if (!res.error) {
          lastError = null;
          break;
        }

        lastError = res.error;
        const colMatch = res.error.message?.match(/Could not find the '([^']+)' column/i) ||
                         res.error.message?.match(/column "([^"]+)" of relation/i);
        if (colMatch && colMatch[1] && colMatch[1] in payloadToSend) {
          delete payloadToSend[colMatch[1]];
          continue;
        }
        break;
      }

      if (lastError) {
        setStatusBanner({
          type: "error",
          text: `Database rejected save: ${lastError.message}`,
        });
        alert("Portfolio Save Error: " + lastError.message);
      } else {
        await loadProjects();
        setStatusBanner({
          type: "success",
          text: editingId
            ? `Saved changes to "${form.title}" (${galleryArr.length} photos)!`
            : `Published "${form.title}" (${galleryArr.length} photos) to Portfolio!`,
        });
        resetForm();
      }
    } catch (err: any) {
      setStatusBanner({
        type: "error",
        text: err?.message || "Unexpected error while saving project.",
      });
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (id: string) => {
    await supabase.from("case_studies").delete().eq("id", id);
    if (editingId === id) resetForm();
    loadProjects();
  };

  const filteredProjects = projects.filter((p) => categoryFilter === "all" || p.category === categoryFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* Create / Edit Case Study Form with Multi-Image Array Builder */}
      <form onSubmit={handleSaveProject} className="lg:col-span-5 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
              {editingId ? "Editing Existing Case Study" : "Portfolio CMS"}
            </span>
            <h2 className="font-display text-base font-bold">
              {editingId ? "Update Project & Gallery" : "Publish New Case Study"}
            </h2>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-2.5 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client / Brand</label>
            <input
              type="text"
              required
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="col-span-2">
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Service Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            >
              {PORTFOLIO_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Year</label>
            <input
              type="text"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Deliverables (Comma Separated)</label>
          <input
            type="text"
            value={form.deliverables_text}
            onChange={(e) => setForm({ ...form, deliverables_text: e.target.value })}
            placeholder="Brand Strategy, Visual Identity, Motion, Web"
            className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Executive Summary</label>
          <textarea
            rows={2}
            required
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">The Challenge</label>
            <textarea
              rows={2}
              value={form.challenge}
              onChange={(e) => setForm({ ...form, challenge: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">The Solution & Impact</label>
            <textarea
              rows={2}
              value={form.solution}
              onChange={(e) => setForm({ ...form, solution: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Multi-Image Array Uploader for [slug] Gallery Pages */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase text-[var(--text-dim)] font-bold">
              Project Gallery Images ({form.images.length} in array)
            </label>
            <label className="px-3 py-1 rounded-lg bg-[#c7cb2d] text-black text-[10px] font-mono uppercase font-bold cursor-pointer flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Multiple Photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultiImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {form.images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pt-1">
              {form.images.map((imgUrl, idx) => {
                const isCover = form.cover_image === imgUrl;
                return (
                  <div key={idx} className={`relative group rounded-xl overflow-hidden border-2 h-16 ${isCover ? "border-[#c7cb2d]" : "border-transparent"}`}>
                    <img src={imgUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAsCover(imgUrl)}
                        className="px-1.5 py-0.5 rounded bg-[#c7cb2d] text-black text-[8px] font-mono uppercase font-bold cursor-pointer"
                        title="Set as Cover"
                      >
                        Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="p-1 rounded bg-red-500 text-white cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] text-center py-3">
              Select multiple images at once to populate the project [slug] gallery array.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
        >
          {saving ? "Saving..." : editingId ? "Save Project Changes" : "Publish Case Study"}
        </button>
      </form>

      {/* Published Portfolio List + Category Filter */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-[var(--bg-card)] p-2.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-xl text-[10px] font-mono uppercase shrink-0 cursor-pointer ${
              categoryFilter === "all" ? "bg-[var(--text-primary)] text-[var(--bg-main)] font-bold" : "text-[var(--text-muted)]"
            }`}
          >
            All ({projects.length})
          </button>
          {PORTFOLIO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-[10px] font-mono uppercase shrink-0 cursor-pointer ${
                categoryFilter === cat ? "bg-[var(--text-primary)] text-[var(--bg-main)] font-bold" : "text-[var(--text-muted)]"
              }`}
            >
              {cat.split(" & ")[0]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((item) => {
            const imgCount = Array.isArray(item.images) ? item.images.length : item.cover_image ? 1 : 0;
            return (
              <div key={item.id} className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-40 bg-[var(--bg-main)]">
                    {item.cover_image ? (
                      <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-dim)]">No Cover</div>
                    )}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[9px] font-mono flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-[#c7cb2d]" /> {imgCount} photos
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">{item.category}</span>
                    <h3 className="font-display text-sm font-bold">{item.title}</h3>
                    <p className="text-[11px] font-medium text-[var(--text-muted)]">{item.client} • {item.year || "2026"}</p>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.summary}</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => startEditingProject(item)}
                    className="flex-1 py-1.5 rounded-xl bg-[var(--bg-main)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-main)] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Project & Photos
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl bg-[var(--bg-main)] text-[var(--text-dim)] hover:text-red-400 cursor-pointer"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="p-12 rounded-3xl bg-[var(--bg-card)] text-center text-xs text-[var(--text-muted)]">
            No case studies in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}
