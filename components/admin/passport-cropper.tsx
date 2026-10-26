"use client";

import * as React from "react";
import { Camera, ZoomIn, ZoomOut, Check, X, RotateCcw } from "lucide-react";

interface PassportCropperProps {
  value: string | null | undefined;
  onChange: (dataUrl: string) => void;
  initials?: string;
}

export default function PassportCropper({ value, onChange, initials = "LS" }: PassportCropperProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [rawImage, setRawImage] = React.useState<HTMLImageElement | null>(null);
  const [isCropping, setIsCropping] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const CROP_W = 300;
  const CROP_H = 400; // Strict 3:4 Passport Aspect Ratio

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setRawImage(img);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setIsCropping(true);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Pure canvas draw — NEVER draw strokeRect or guide lines on this context!
  React.useEffect(() => {
    if (!isCropping || !rawImage || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CROP_W, CROP_H);
    ctx.fillStyle = "#0c0d0e";
    ctx.fillRect(0, 0, CROP_W, CROP_H);

    const scale = Math.max(CROP_W / rawImage.width, CROP_H / rawImage.height) * zoom;
    const drawW = rawImage.width * scale;
    const drawH = rawImage.height * scale;
    const drawX = (CROP_W - drawW) / 2 + offset.x;
    const drawY = (CROP_H - drawH) / 2 + offset.y;

    // Clean image only
    ctx.drawImage(rawImage, drawX, drawY, drawW, drawH);
  }, [isCropping, rawImage, zoom, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const confirmCrop = () => {
    if (!canvasRef.current) return;
    // Export clean JPEG without any stroke lines
    const croppedDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.92);
    onChange(croppedDataUrl);
    setIsCropping(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Passport Frame with Subtle Hover Trigger */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="group relative w-14 h-[72px] rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
        title="Click to update passport photo"
      >
        {value ? (
          <img src={value} alt="Passport" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-sm font-bold uppercase text-[var(--text-muted)]">
            {initials}
          </span>
        )}

        {/* Hover Edit Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
          <Camera className="w-4 h-4 text-[#c7cb2d]" />
          <span className="text-[8px] font-mono uppercase tracking-wider font-semibold">Edit</span>
        </div>
      </div>

      {/* Cropper Modal */}
      {isCropping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#c7cb2d] font-bold">
                Passport Adjustment (3:4)
              </span>
              <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="p-1 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Container with Pure CSS Visual Guide (Does not touch canvas pixels) */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={CROP_W}
                  height={CROP_H}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="cursor-move block"
                />
                {/* Visual boundary via CSS only — will NEVER be in the exported photo */}
                <div className="pointer-events-none absolute inset-3 border border-white/20 rounded-xl" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Drag to center face within frame
              </p>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-3 bg-[var(--bg-main)] px-3 py-2 rounded-xl">
              <ZoomOut className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#c7cb2d] cursor-pointer"
              />
              <ZoomIn className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <button
                type="button"
                onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="px-4 py-1.5 rounded-full bg-[var(--bg-main)] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                className="px-5 py-1.5 rounded-full bg-[#c7cb2d] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Apply Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
