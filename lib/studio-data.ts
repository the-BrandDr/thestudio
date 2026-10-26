// lib/studio-data.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export interface StudioMediaSettings {
  videoUrl: string;
  posterUrl: string;
  tagline: string;
  location: string;
}

export interface FeaturedProject {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory: string;
  location: string;
  coverImage: string;
  galleryImages: string[];
  description: string;
}

export async function getHeroMediaSettings(): Promise<StudioMediaSettings> {
  'use cache';
    const fallback: StudioMediaSettings = {
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stage-lights-at-a-music-concert-41380-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=2000&q=80',
    tagline: "NABIS '25 & Live Summit Scenography",
    location: 'Lagos • Abuja • Nationwide',
  };

  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('featured_video_url, featured_video_poster, hero_tagline, hero_location')
      .eq('id', 'global_config')
      .single();

    if (error || !data) return fallback;

    return {
      videoUrl: data.featured_video_url || fallback.videoUrl,
      posterUrl: data.featured_video_poster || fallback.posterUrl,
      tagline: data.hero_tagline || fallback.tagline,
      location: data.hero_location || fallback.location,
    };
  } catch {
    return fallback;
  }
}

export async function getFeaturedProjects(): Promise<FeaturedProject[]> {
  'use cache';
    const fallbacks: FeaturedProject[] = [
    {
      id: '1',
      title: "NABIS '25 Annual Summit",
      slug: 'nabis-25',
      category: 'Stage Scenography',
      subCategory: 'Spatial Build',
      location: 'Oyo State',
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      galleryImages: [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'
      ],
      description: 'Stage scenography, entrance tunnel experience, attendee registration hubs, and environmental graphics for 1,000+ delegates.',
    },
    {
      id: '2',
      title: 'Reavent Ng Experience Platform',
      slug: 'reavent-ng',
      category: 'Brand Experience',
      subCategory: 'Arrival Sets',
      location: 'Lagos',
      coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
      galleryImages: [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80'
      ],
      description: 'Unified visual architecture connecting digital event platforms with corporate visual identity guidelines and collateral assets.',
    },
    {
      id: '3',
      title: 'Hult Prize Innovation Showcase',
      slug: 'hult-prize',
      category: 'Experiential Zone',
      subCategory: 'Lighting',
      location: 'Abuja',
      coverImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
      galleryImages: [
        'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80'
      ],
      description: 'Illuminated exhibition booths, custom keynote staging, motion loops, and live pitch environment for creative founders.',
    },
  ];

  if (!supabase) return fallbacks;

  try {
    const { data, error } = await supabase
      .from('case_studies')
      .select('id, title, slug, category, sub_category, location, cover_image, gallery_images, description')
      .eq('is_featured_home', true)
      .order('sort_order', { ascending: true })
      .limit(3);

    if (error || !data || data.length === 0) return fallbacks;

    return data.map((item, idx) => {
      // Parse gallery_images if stored as JSONB/Array or fallback to cover_image + alternates
      let images: string[] = [];
      if (Array.isArray(item.gallery_images) && item.gallery_images.length > 0) {
        images = item.gallery_images;
      } else if (item.cover_image) {
        images = [item.cover_image, ...(fallbacks[idx]?.galleryImages || [])];
      } else {
        images = fallbacks[idx]?.galleryImages || [];
      }

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        category: item.category || 'Event Experience',
        subCategory: item.sub_category || 'Production',
        location: item.location || 'Nationwide',
        coverImage: item.cover_image || images[0],
        galleryImages: images,
        description: item.description || '',
      };
    });
  } catch {
    return fallbacks;
  }
}