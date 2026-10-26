'use client';

import * as React from 'react';
import Image from 'next/image';
import { FeaturedProject } from '@/lib/studio-data';

interface DynamicProjectCardProps {
  project: FeaturedProject;
  intervalMs?: number;
}

export default function DynamicProjectCard({
  project,
  intervalMs = 4500,
}: DynamicProjectCardProps) {
  const images = project.galleryImages && project.galleryImages.length > 0 
    ? project.galleryImages 
    : [project.coverImage];

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);

  // Automatically cycle through images unless user hovers
  React.useEffect(() => {
    if (images.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs, isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group rounded-2xl bg-[var(--bg-card)] overflow-hidden shadow-sm transition hover:shadow-md flex flex-col justify-between"
    >
      {/* Dynamic Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-card-hover)] select-none">
        {images.map((src, idx) => (
          <div
            key={src + idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={src}
              alt={`${project.title} gallery capture ${idx + 1}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={idx === 0}
            />
          </div>
        ))}

        {/* Location Chip */}
        <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-white">
          {project.location}
        </div>

        {/* Subtle Slide Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md">
            {images.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  dotIdx === currentIndex ? 'w-4 bg-[#c7cb2d]' : 'w-1 bg-white/40'
                }`}
                aria-label={`Show slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Project Meta Information */}
      <div className="p-6">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#84871d] dark:text-[#c7cb2d] font-semibold">
          <span>{project.category}</span>
          <span>•</span>
          <span>{project.subCategory}</span>
        </div>
        <h4 className="font-display text-lg font-bold text-[var(--text-primary)] mt-2">
          {project.title}
        </h4>
        <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
          {project.description}
        </p>
      </div>
    </div>
  );
}