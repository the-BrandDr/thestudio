'use client';

import * as React from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface HeroVideoProps {
  videoUrl?: string;
  posterUrl?: string;
  tagline?: string;
  location?: string;
}

export default function DynamicHeroVideo({
  videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-stage-lights-at-a-music-concert-41380-large.mp4',
  posterUrl = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=2000&q=80',
  tagline = 'Live Event Scenography & Atmosphere Calibration',
  location = 'Lagos • Abuja • Nationwide',
}: HeroVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isMuted, setIsMuted] = React.useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[var(--bg-card)] aspect-[16/9] sm:aspect-[21/9] max-h-[620px] shadow-lg group">
        {/* The Live Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover select-none scale-[1.01] transition-transform duration-700 group-hover:scale-105"
        />

        {/* Ambient Overlay for Typography Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 pointer-events-none" />

        {/* Video Overlay Top Badge */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d] animate-pulse" />
            <span>Spatial Showreel</span>
          </div>
        </div>

        {/* Video Overlay Bottom Controls & Info */}
        <div className="absolute bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-6 z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="max-w-lg">
            <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#c7cb2d]">
              {location}
            </p>
            <h3 className="font-display text-lg sm:text-2xl font-bold text-white mt-1">
              {tagline}
            </h3>
          </div>

          {/* Tactical Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}