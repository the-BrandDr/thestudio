"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { Film, Upload, Check, Trash2, Play, Power } from "lucide-react";

export default function HeroVideoMediaManager() {
  const supabase = createClient();
  const [uploadProgressPct, setUploadProgressPct] = React.useState(0);
  const [uploadEtaSec, setUploadEtaSec] = React.useState(0);
  const [uploadBytesLabel, setUploadBytesLabel] = React.useState("");

  const uploadWithProgress = async (bucketName: string, filePath: string, fileObj: File) => {
    const startTime = Date.now();
    setUploadProgressPct(4);
    setUploadEtaSec(Math.max(2, Math.ceil(fileObj.size / (750 * 1024))));
    setUploadBytesLabel(`0.0 / ${(fileObj.size / (1024 * 1024)).toFixed(1)} MB`);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    return new Promise<{ error: any }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", fileObj.type || "video/mp4");

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.min(98, Math.max(5, Math.round((ev.loaded / ev.total) * 100)));
          const elapsed = Math.max(0.5, (Date.now() - startTime) / 1000);
          const speed = ev.loaded / elapsed;
          const rem = Math.max(0, ev.total - ev.loaded);
          const eta = speed > 0 ? Math.ceil(rem / speed) : 1;
          setUploadProgressPct(pct);
          setUploadEtaSec(eta);
          setUploadBytesLabel(`${(ev.loaded / (1024 * 1024)).toFixed(1)} / ${(ev.total / (1024 * 1024)).toFixed(1)} MB`);
        }
      };

      xhr.onload = () => {
        setUploadProgressPct(100);
        setUploadEtaSec(0);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ error: null });
        } else {
          resolve({ error: { message: `Storage upload failed (${xhr.status})` } });
        }
      };
      xhr.onerror = () => resolve({ error: { message: "Network error during upload" } });
      xhr.send(fileObj);
    });
  };
  const [videos, setVideos] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [uploading, setUploading] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  const [form, setForm] = React.useState({
    title: "",
    tagline: "Event Branding & Experience Design",
    location: "Lagos • Abuja • Ogbomoso",
    video_data: "",
    file_name: "",
  });

  const loadVideos = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: staffData }, { data: vidData }] = await Promise.all([
      supabase.from("staff_profiles").select("*"),
      supabase.from("hero_videos").select("*").order("created_at", { ascending: false }),
    ]);
    if (staffData) {
      setCurrentUser(staffData.find((s) => s.id === user?.id) || staffData[0]);
    }
    if (vidData) setVideos(vidData);
  }, [supabase]);

  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        video_data: ev.target?.result as string,
        file_name: file.name,
      }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.video_data) return;
    setUploading(true);
    const actor = currentUser ? `${currentUser.first_name} (${currentUser.staff_id})` : "Chief Strategist";

    // Also try uploading to Supabase Storage 'media' bucket if available, otherwise use direct data/blob URL
    let finalVideoUrl = form.video_data;
    try {
      const ext = (form.file_name.split(".").pop() || "mp4").toLowerCase();
      const path = `hero-${Date.now()}.${ext}`;
      const res = await fetch(form.video_data);
      const blob = await res.blob();
      const { data: upData, error: upErr } = await uploadWithProgress("media", path, blob);
      if (!upErr && upData) {
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
        if (pub?.publicUrl) finalVideoUrl = pub.publicUrl;
      }
    } catch (err) {}

    await supabase.from("hero_videos").insert({
      title: form.title,
      video_url: finalVideoUrl,
      tagline: form.tagline,
      location: form.location,
      is_active: true,
      uploaded_by: actor,
    });

    // Also sync primary homepage_settings for backward compatibility
    await supabase.from("homepage_settings").upsert({
      id: 1,
      video_url: finalVideoUrl,
      tagline: form.tagline,
      location: form.location,
    });

    setForm({ title: "", tagline: "Event Branding & Experience Design", location: "Lagos • Abuja • Ogbomoso", video_data: "", file_name: "" });
    setUploading(false);
    setNotice("Video added to active rotation!");
    setTimeout(() => setNotice(""), 3000);
    loadVideos();
  };

  const toggleVideoActive = async (vid: any) => {
    const nextState = !vid.is_active;
    await supabase.from("hero_videos").update({ is_active: nextState }).eq("id", vid.id);
    if (nextState) {
      await supabase.from("homepage_settings").upsert({
        id: 1,
        video_url: vid.video_url,
        tagline: vid.tagline,
        location: vid.location,
      });
    }
    loadVideos();
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("hero_videos").delete().eq("id", id);
    loadVideos();
  };

  const activeCount = videos.filter((v) => v.is_active).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <form onSubmit={handleUploadAndSave} className="lg:col-span-4 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3.5 h-fit border border-[var(--border-subtle)]/60">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Upload Hero Video</h2>
          <span className="text-[10px] font-mono text-[#c7cb2d]">{activeCount} Active in Rotation</span>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Select Video File (MP4 / WebM)</label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            required
            onChange={handleVideoFileSelect}
            className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[var(--bg-main)] file:text-xs font-semibold cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Video Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. OCH 5.0 Arena Reel"
            className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Overlay Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[var(--text-dim)] mb-1">Location Stamp</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full bg-[var(--bg-main)] rounded-xl px-3 py-2 text-xs"
          />
        </div>

        {notice && <p className="text-xs font-bold text-[#c7cb2d]">{notice}</p>}

        {uploading && (
              <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[#c7cb2d]/60 space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)]">Uploading Hero Video...</span>
                  <span className="font-mono font-bold text-[#c7cb2d]">
                    {uploadProgressPct}% • {uploadEtaSec > 0 ? `~${uploadEtaSec}s remaining` : "Finalizing..."}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                  <div
                    className="h-full bg-[#c7cb2d] transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgressPct}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-[var(--text-dim)]">{uploadBytesLabel}</p>
              </div>
            )}
            <button
          type="submit"
          disabled={uploading || !form.video_data}
          className="w-full py-2.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold cursor-pointer disabled:opacity-40"
        >
          {uploading ? "Processing Video..." : "Upload & Activate"}
        </button>
      </form>

      {/* Previously Uploaded Videos Library (Single-Click Reuse & Multi-Video Rotation) */}
      <div className="lg:col-span-8 bg-[var(--bg-card)] p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Hero Video Archive & Active Playlist</h2>
          <span className="text-[10px] font-mono text-[var(--text-dim)]">
            All active videos automatically rotate on the homepage
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((vid) => (
            <div
              key={vid.id}
              className={`rounded-2xl bg-[var(--bg-main)] border overflow-hidden flex flex-col justify-between ${
                vid.is_active ? "border-[#c7cb2d]" : "border-[var(--border-subtle)]/50 opacity-70"
              }`}
            >
              <div>
                <video src={vid.video_url} controls className="w-full h-36 object-cover bg-black" />
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold truncate">{vid.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                      vid.is_active ? "bg-[#c7cb2d]/20 text-[#c7cb2d]" : "bg-[var(--bg-card)] text-[var(--text-dim)]"
                    }`}>
                      {vid.is_active ? "In Rotation" : "Standby"}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{vid.tagline}</p>
                </div>
              </div>

              <div className="px-3.5 py-2.5 border-t border-[var(--border-subtle)]/50 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleVideoActive(vid)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-mono uppercase font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    vid.is_active ? "bg-[var(--bg-card)] text-[var(--text-muted)]" : "bg-[#c7cb2d] text-black"
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {vid.is_active ? "Pause from Rotation" : "Activate in Rotation"}
                </button>
                <button
                  onClick={() => deleteVideo(vid.id)}
                  className="p-1.5 text-[var(--text-dim)] hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {videos.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] py-10 text-center">
            No hero videos uploaded yet. Upload a video on the left to start your homepage playlist.
          </p>
        )}
      </div>
    </div>
  );
}
