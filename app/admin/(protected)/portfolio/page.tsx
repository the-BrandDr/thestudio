"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Film,
  Upload,
} from "lucide-react";

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

async function compressImageFile(file: File, maxWidth = 1600, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/webp", quality);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, dataUrl: compressedDataUrl });
            else reject(new Error("Blob compression failed"));
          },
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPortfolioPage() {
  const supabase = createClient();
  const [projects, setProjects] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusBanner, setStatusBanner] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Hero Showreel Video State (Inside Portfolio CMS)
  const [heroVideoUrl, setHeroVideoUrl] = React.useState("");
  const [heroVideoInputUrl, setHeroVideoInputUrl] = React.useState("");
  const [showReelManager, setShowReelManager] = React.useState(false);
  const [heroVideoUploadState, setHeroVideoUploadState] = React.useState<{
    active: boolean;
    percent: number;
    etaSeconds: number;
    fileName: string;
    statusText: string;
  }>({
    active: false,
    percent: 0,
    etaSeconds: 0,
    fileName: "",
    statusText: "",
  });

  // Multi-Photo Upload Progress State
  const [uploadState, setUploadState] = React.useState<{
    active: boolean;
    current: number;
    total: number;
    percent: number;
    etaSeconds: number;
    fileName: string;
  }>({
    active: false,
    current: 0,
    total: 0,
    percent: 0,
    etaSeconds: 0,
    fileName: "",
  });

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

  const loadProjectsAndReel = React.useCallback(async () => {
    const [{ data: projData }, { data: reelData }] = await Promise.all([
      supabase.from("case_studies").select("*").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("value").eq("key", "hero_video_url").maybeSingle(),
    ]);
    if (projData) setProjects(projData);
    if (reelData?.value) {
      setHeroVideoUrl(reelData.value);
      setHeroVideoInputUrl(reelData.value);
    }
  }, [supabase]);

  React.useEffect(() => {
    loadProjectsAndReel();
  }, [loadProjectsAndReel]);

  // Save Hero Video URL to site_settings (and studio_settings if present)
  const saveHeroVideoUrlToDb = async (urlToSave: string) => {
    const clean = urlToSave.trim();
    if (!clean) return;
    await supabase
      .from("site_settings")
      .upsert({ key: "hero_video_url", value: clean, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setHeroVideoUrl(clean);
    setHeroVideoInputUrl(clean);
    setHeroVideoUploadState((prev) => ({
      ...prev,
      active: false,
      percent: 100,
      etaSeconds: 0,
      statusText: "✅ Hero Showreel Video saved and live on Homepage!",
    }));
  };

  // Upload Hero Showreel Video with real-time byte progress & ETA countdown
  const handleHeroVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const startTime = Date.now();
    const totalBytes = file.size;
    setHeroVideoUploadState({
      active: true,
      percent: 3,
      etaSeconds: Math.max(3, Math.ceil(totalBytes / (800 * 1024))),
      fileName: `${file.name} (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`,
      statusText: "Uploading Hero Showreel Video...",
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const objectPath = `showreel/hero-${Date.now()}.${ext}`;

      const uploadedPublicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${supabaseUrl}/storage/v1/object/media/${objectPath}`, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.min(98, Math.max(4, Math.round((ev.loaded / ev.total) * 100)));
            const elapsedSec = Math.max(0.5, (Date.now() - startTime) / 1000);
            const bytesPerSec = ev.loaded / elapsedSec;
            const remainingBytes = Math.max(0, ev.total - ev.loaded);
            const eta = bytesPerSec > 0 ? Math.ceil(remainingBytes / bytesPerSec) : 1;
            setHeroVideoUploadState({
              active: true,
              percent: pct,
              etaSeconds: eta,
              fileName: `${file.name} (${(ev.loaded / (1024 * 1024)).toFixed(1)} / ${(ev.total / (1024 * 1024)).toFixed(1)} MB)`,
              statusText: "Uploading Hero Showreel Video...",
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const { data: pub } = supabase.storage.from("media").getPublicUrl(objectPath);
            resolve(pub.publicUrl);
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during video upload"));
        xhr.send(file);
      });

      await saveHeroVideoUrlToDb(uploadedPublicUrl);
    } catch (err: any) {
      setHeroVideoUploadState({
        active: false,
        percent: 0,
        etaSeconds: 0,
        fileName: file.name,
        statusText: `⚠️ Upload error: ${err?.message || "Check Supabase 'media' bucket"}`,
      });
    }
  };

  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    const total = files.length;
    const startTime = Date.now();
    const uploadedUrls: string[] = [];

    setUploadState({
      active: true,
      current: 0,
      total,
      percent: 5,
      etaSeconds: Math.max(2, total * 2),
      fileName: files[0].name,
    });

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const stepStart = Date.now();

      setUploadState((prev) => ({
        ...prev,
        current: i + 1,
        fileName: file.name,
        percent: Math.round(((i + 0.3) / total) * 100),
      }));

      try {
        const { blob, dataUrl } = await compressImageFile(file, 1600, 0.82);
        let finalUrl = dataUrl;

        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "") + ".webp";
        const storagePath = `case-studies/${Date.now()}-${i}-${cleanName}`;

        for (const bucketName of ["media", "portfolio", "public", "assets"]) {
          const { data: upData, error: upErr } = await supabase.storage
            .from(bucketName)
            .upload(storagePath, blob, { contentType: "image/webp", upsert: true });

          if (!upErr && upData?.path) {
            const { data: pubUrl } = supabase.storage.from(bucketName).getPublicUrl(upData.path);
            if (pubUrl?.publicUrl) {
              finalUrl = pubUrl.publicUrl;
              break;
            }
          }
        }

        uploadedUrls.push(finalUrl);
      } catch (err) {
        const fallbackUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = (ev) => res((ev.target?.result as string) || "");
          r.readAsDataURL(file);
        });
        if (fallbackUrl) uploadedUrls.push(fallbackUrl);
      }

      const elapsedSec = (Date.now() - startTime) / 1000;
      const avgPerFile = elapsedSec / (i + 1);
      const remainingFiles = total - (i + 1);
      const eta = Math.max(0, Math.ceil(avgPerFile * remainingFiles));
      const pct = Math.round(((i + 1) / total) * 100);

      if (Date.now() - stepStart < 220) {
        await new Promise((r) => setTimeout(r, 220));
      }

      setUploadState({
        active: true,
        current: i + 1,
        total,
        percent: pct,
        etaSeconds: eta,
        fileName: file.name,
      });
    }

    setForm((prev) => {
      const nextImages = [...prev.images, ...uploadedUrls];
      return {
        ...prev,
        cover_image: prev.cover_image || nextImages[0] || "",
        images: nextImages,
      };
    });

    setTimeout(() => {
      setUploadState((prev) => ({ ...prev, active: false }));
    }, 600);
  };

  const removeGalleryImage = (idx: number) => {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== idx);
      const removedUrl = prev.images[idx];
      return {
        ...prev,
        images: next,
        cover_image: prev.cover_image === removedUrl ? next[0] || "" : prev.cover_image,
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
    setStatusBanner(null);
    const existingArray: string[] =
      Array.isArray(item.images) && item.images.length > 0
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
      deliverables_text: Array.isArray(item.deliverables)
        ? item.deliverables.join(", ")
        : Array.isArray(item.services)
        ? item.services.join(", ")
        : "Brand Strategy, Visual Identity, Guidelines",
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

      let payloadToSend: Record<string, any> = {};
      if (knownCols.length > 0) {
        for (const k of Object.keys(candidatePayload)) {
          if (knownCols.includes(k)) {
            payloadToSend[k] = candidatePayload[k];
          }
        }
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
        const colMatch =
          res.error.message?.match(/Could not find the '([^']+)' column/i) ||
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
          text: `Database error: ${lastError.message}`,
        });
      } else {
        await loadProjectsAndReel();
        setStatusBanner({
          type: "success",
          text: editingId
            ? `Updated "${form.title}" (${galleryArr.length} photos) successfully!`
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
    if (!window.confirm("Remove this case study from the portfolio?")) return;
    const { error } = await supabase.from("case_studies").delete().eq("id", id);
    if (!error) {
      await loadProjectsAndReel();
      if (editingId === id) resetForm();
    }
  };

  const filteredProjects =
    categoryFilter === "all" ? projects : projects.filter((p) => p.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* TOP BAR: PORTFOLIO & HOMEPAGE HERO SHOWREEL VIDEO MANAGER */}
      <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c7cb2d]/15 border border-[#c7cb2d]/40 flex items-center justify-center text-[#c7cb2d]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Portfolio & Showreel Manager</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Manage case studies and the Homepage Hero Showreel Video in one place.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowReelManager((prev) => !prev)}
            className="px-4 py-2 rounded-2xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
          >
            <Film className="w-3.5 h-3.5" />
            {showReelManager ? "Hide Hero Video Reel" : "Manage Hero Video Reel"}
          </button>
        </div>

        {/* EXPANDABLE HERO SHOWREEL VIDEO UPLOADER WITH PROGRESS & ETA */}
        {(showReelManager || heroVideoUploadState.active) && (
          <div className="p-5 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                  Homepage Hero Video Reel
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  Upload an MP4/WebM video file or paste a direct video URL for the homepage hero section.
                </p>
              </div>
              <label className="px-4 py-2 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition">
                <Upload className="w-3.5 h-3.5" />
                {heroVideoUploadState.active
                  ? `Uploading (${heroVideoUploadState.percent}%)...`
                  : "Upload Showreel Video"}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={heroVideoUploadState.active}
                  onChange={handleHeroVideoFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {heroVideoUploadState.active && (
              <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[#c7cb2d]/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c7cb2d]" />
                    {heroVideoUploadState.statusText}
                  </span>
                  <span className="font-mono font-bold text-[#c7cb2d]">
                    {heroVideoUploadState.percent}% • ~{heroVideoUploadState.etaSeconds}s remaining
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[var(--bg-main)] overflow-hidden">
                  <div
                    className="h-full bg-[#c7cb2d] transition-all duration-300 rounded-full"
                    style={{ width: `${heroVideoUploadState.percent}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-[var(--text-dim)]">{heroVideoUploadState.fileName}</p>
              </div>
            )}

            {heroVideoUploadState.statusText && !heroVideoUploadState.active && (
              <p className="text-xs font-mono text-[#c7cb2d]">{heroVideoUploadState.statusText}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                value={heroVideoInputUrl}
                onChange={(e) => setHeroVideoInputUrl(e.target.value)}
                placeholder="Or paste direct MP4 / WebM video URL..."
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => saveHeroVideoUrlToDb(heroVideoInputUrl)}
                className="px-5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[#c7cb2d] hover:text-black border border-[#c7cb2d]/50 text-[#c7cb2d] text-xs font-bold uppercase cursor-pointer transition"
              >
                Save Video URL
              </button>
            </div>

            {heroVideoUrl && (
              <div className="rounded-2xl overflow-hidden bg-black border border-[var(--border-subtle)]/50 max-h-56">
                <video
                  key={heroVideoUrl}
                  src={heroVideoUrl}
                  controls
                  muted
                  playsInline
                  className="w-full max-h-56 object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN PORTFOLIO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveProject}
          className="lg:col-span-5 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-4 sticky top-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c7cb2d] font-bold">
                {editingId ? "Editing Case Study" : "Portfolio CMS"}
              </span>
              <h2 className="font-display text-lg font-bold">
                {editingId ? "Update Project & Gallery" : "Add Portfolio Case Study"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-main)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel Edit
              </button>
            )}
          </div>

          {statusBanner && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 border ${
                statusBanner.type === "success"
                  ? "bg-[#c7cb2d]/10 border-[#c7cb2d]/40 text-[var(--text-primary)]"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              {statusBanner.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#c7cb2d] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{statusBanner.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Project Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Future Tech Africa Summit"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client / Brand *</label>
              <input
                required
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="e.g. Polaris Bank"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Service Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs"
              >
                {PORTFOLIO_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Year</label>
              <input
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="2026"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Executive Summary *</label>
            <textarea
              required
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Brief overview of the spatial or brand execution..."
              className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">The Challenge</label>
              <textarea
                rows={2}
                value={form.challenge}
                onChange={(e) => setForm({ ...form, challenge: e.target.value })}
                placeholder="What problem needed solving?"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Our Solution</label>
              <textarea
                rows={2}
                value={form.solution}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
                placeholder="How Lavie Studios executed it..."
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
                Deliverables (Comma separated)
              </label>
              <input
                value={form.deliverables_text}
                onChange={(e) => setForm({ ...form, deliverables_text: e.target.value })}
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Impact / Metrics</label>
              <input
                value={form.metrics}
                onChange={(e) => setForm({ ...form, metrics: e.target.value })}
                placeholder="e.g. 5,000+ Attendees"
                className="w-full bg-[var(--bg-main)] rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">
                  Project Gallery ({form.images.length} {form.images.length === 1 ? "photo" : "photos"})
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Upload multiple photos; click any thumbnail to set as Cover.
                </span>
              </div>
              <label className="px-3.5 py-2 rounded-xl bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 hover:opacity-90 transition">
                <Plus className="w-3.5 h-3.5" /> Add Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMultiImageUpload}
                  disabled={uploadState.active}
                  className="hidden"
                />
              </label>
            </div>

            {uploadState.active && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[#c7cb2d]/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c7cb2d]" />
                    Uploading photo {uploadState.current} of {uploadState.total}...
                  </span>
                  <span className="font-mono text-[11px] text-[#c7cb2d] font-bold">
                    {uploadState.percent}% • {uploadState.etaSeconds > 0 ? `~${uploadState.etaSeconds}s remaining` : "Finalizing..."}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                  <div
                    className="h-full bg-[#c7cb2d] transition-all duration-300 rounded-full"
                    style={{ width: `${uploadState.percent}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-[var(--text-dim)] truncate">
                  Optimizing & storing: {uploadState.fileName}
                </p>
              </div>
            )}

            {form.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                {form.images.map((imgUrl, idx) => {
                  const isCover = form.cover_image === imgUrl || (!form.cover_image && idx === 0);
                  return (
                    <div
                      key={idx}
                      className={`relative group h-20 rounded-xl overflow-hidden border-2 transition ${
                        isCover ? "border-[#c7cb2d]" : "border-transparent"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${idx + 1}`}
                        onClick={() => setAsCover(imgUrl)}
                        className="w-full h-full object-cover cursor-pointer"
                        title="Click to set as primary cover photo"
                      />
                      {isCover && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#c7cb2d] text-black text-[8px] font-mono font-bold uppercase">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center opacity-90 hover:bg-red-500 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              className="rounded accent-[#c7cb2d]"
            />
            <span>Feature this project on the Homepage showcase</span>
          </label>

          <button
            type="submit"
            disabled={saving || uploadState.active}
            className="w-full py-3 rounded-full bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {(saving || uploadState.active) && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploadState.active
              ? `Uploading Photos (${uploadState.percent}%)...`
              : saving
              ? "Saving to Portfolio Database..."
              : editingId
              ? `Save Changes (${form.images.length} Photos)`
              : `Publish Project (${form.images.length} Photos)`}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                categoryFilter === "all"
                  ? "bg-[#c7cb2d] text-black"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)]"
              }`}
            >
              All ({projects.length})
            </button>
            {PORTFOLIO_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                  categoryFilter === cat
                    ? "bg-[#c7cb2d] text-black"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                }`}
              >
                {cat.split(" & ")[0]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((item) => {
              const imgCount = Array.isArray(item.images) && item.images.length > 0 ? item.images.length : item.cover_image ? 1 : 0;
              const displayCover = item.cover_image || (Array.isArray(item.images) && item.images[0]) || "";
              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 bg-[var(--bg-main)]">
                      {displayCover ? (
                        <img src={displayCover} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-dim)]">
                          No Cover
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[9px] font-mono flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-[#c7cb2d]" /> {imgCount} {imgCount === 1 ? "photo" : "photos"}
                      </span>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">{item.category}</span>
                      <h3 className="font-display text-sm font-bold">{item.title}</h3>
                      <p className="text-[11px] font-medium text-[var(--text-muted)]">
                        {item.client} • {item.year || "2026"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.summary}</p>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => startEditingProject(item)}
                      className="flex-1 py-1.5 rounded-xl bg-[var(--bg-main)] hover:bg-[#c7cb2d] hover:text-black text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Project & Photos
                    </button>
                    <button
                      type="button"
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
    </div>
  );
}
