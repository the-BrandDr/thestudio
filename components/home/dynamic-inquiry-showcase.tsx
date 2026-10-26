'use client';

import * as React from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface InquiryShowcaseProps {
  images: string[];
}

export default function DynamicInquiryShowcase({ images }: InquiryShowcaseProps) {
  const displayImages = images.length > 0 ? images : [
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
  ];

  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (displayImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayImages.length]);

  return (
    <div className="lg:col-span-5 relative flex flex-col rounded-3xl overflow-hidden bg-[var(--bg-card)] shadow-sm min-h-[380px] lg:min-h-full">
      <div className="relative w-full h-full min-h-[360px] overflow-hidden select-none">
        {displayImages.map((src, idx) => (
          <div
            key={src + idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={src}
              alt="Lavie Studios Spatial Venue Engineering"
              fill
              className="object-cover scale-[1.02] transition-transform duration-1000"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority={idx === 0}
            />
          </div>
        ))}

        {/* Soft vignette gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-20 pointer-events-none" />

        {/* Bottom micro-tag */}
        <div className="absolute bottom-5 inset-x-5 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-white/90">
            <MapPin className="w-3.5 h-3.5 text-[#c7cb2d]" />
            <span>Spatial Venue Engineering</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[#c7cb2d] text-[10px] font-mono tracking-wider font-semibold">
            VERIFIED
          </span>
        </div>
      </div>
    </div>
  );
}