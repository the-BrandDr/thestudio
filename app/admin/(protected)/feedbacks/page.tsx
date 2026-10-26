"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Star, Upload, Trash2, CheckCircle2, Film, Image as ImageIcon, Plus } from "lucide-react";

export default function ClientFeedbacksAndTestimonialsPage() {
  const supabase = createClient();
  const [testimonials, setTestimonials] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    client_name: "",
    client_role: "",
    client_company: "",
    project_category: "Brand Strategy & Identity",
    rating: 5,
    quote: "",
    media_url: "",
    media_type: "",
    media_name: "",
    is_featured: true,
  });

  const loadTestimonials = React.useCallback(async () => {
    const { data } = await supabase
      .from("client_testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTestimonials(data);
  }, [supabase]);

  React.useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCreateTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("client_testimonials").insert({
      client_name: form.client_name,
      client_role: form.client_role,
      client_company: form.client_company,
      project_category: form.project_category,
      rating: Number(form.rating),
      quote: form.quote,
      media_url: form.media_url || null,
      media_type: form.media_type || null,
      media_name: form.media_name || null,
      is_featured: form.is_featured,
      status: "published",
    });
    setForm({
      client_name: "",
      client_role: "",
      client_company: "",
      project_category: "Brand Strategy & Identity",
      rating: 5,
      quote: "",
      media_url: "",
      media_type: "",
      media_name: "",
      is_featured: true,
    });
    setSaving(false);
    loadTestimonials();
  };

  const toggleFeatured = async (item: any) => {
    await supabase.from("client_testimonials").update({ is_featured: !item.is_featured }).eq("id", item.id);
    loadTestimonials();
  };

  const deleteTestimonial = async (id: string) => {
    await supabase.from("client_testimonials").delete().eq("id", id);
    loadTestimonials();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* Create Testimonial & Upload Media Form */}
      <form onSubmit={handleCreateTestimonial} className="lg:col-span-4 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
        <h2 className="font-display text-base font-bold">Add Client Testimonial</h2>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client Name</label>
            <input
              type="text"
              required
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Role / Title</label>
            <input
              type="text"
              value={form.client_role}
              onChange={(e) => setForm({ ...form, client_role: e.target.value })}
              placeholder="Founder / CEO"
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Company</label>
            <input
              type="text"
              value={form.client_company}
              onChange={(e) => setForm({ ...form, client_company: e.target.value })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Rating</label>
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} Stars</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Client Feedback / Quote</label>
          <textarea
            rows={3}
            required
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            placeholder="Client testimonial text..."
            className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">
            Media Attachment (Video, Audio, or Project Image)
          </label>
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleMediaFile}
            className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[var(--bg-main)] file:text-xs file:font-semibold"
          />
          {form.media_name && (
            <p className="text-[10px] font-mono text-[#c7cb2d] mt-1">Attached: {form.media_name} ({form.media_type})</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] text-xs font-bold cursor-pointer"
        >
          {saving ? "Publishing..." : "Publish Testimonial"}
        </button>
      </form>

      {/* Testimonials & Media Feed */}
      <div className="lg:col-span-8 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map((item) => (
            <div key={item.id} className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 text-[#c7cb2d]">
                    {Array.from({ length: item.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#c7cb2d]" />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleFeatured(item)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase cursor-pointer ${
                        item.is_featured ? "bg-[#c7cb2d]/20 text-[#c7cb2d] font-bold" : "bg-[var(--bg-main)] text-[var(--text-dim)]"
                      }`}
                    >
                      {item.is_featured ? "Featured" : "Standard"}
                    </button>
                    <button
                      onClick={() => deleteTestimonial(item.id)}
                      className="p-1 text-[var(--text-dim)] hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-[var(--text-primary)]">"{item.quote}"</p>

                {item.media_url && (
                  <div className="rounded-2xl overflow-hidden bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                    {item.media_type === "video" ? (
                      <video src={item.media_url} controls className="w-full max-h-48 object-cover" />
                    ) : item.media_type === "audio" ? (
                      <audio src={item.media_url} controls className="w-full p-2" />
                    ) : (
                      <img src={item.media_url} alt={item.client_name} className="w-full max-h-48 object-cover" />
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">{item.client_name}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    {item.client_role} {item.client_company ? `• ${item.client_company}` : ""}
                  </p>
                </div>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-dim)]">
                  {item.project_category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {testimonials.length === 0 && (
          <div className="p-12 rounded-3xl bg-[var(--bg-card)] text-center text-xs text-[var(--text-muted)]">
            No client feedbacks published yet.
          </div>
        )}
      </div>

    </div>
  );
}
