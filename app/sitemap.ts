import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://studioslavie.com";

function toSlug(row: any): string {
  if (row?.slug && String(row.slug).trim()) {
    return encodeURIComponent(String(row.slug).trim().toLowerCase());
  }
  if (row?.title && String(row.title).trim()) {
    return String(row.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  return row?.id ? String(row.id) : "";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) return staticRoutes;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: caseStudies } = await supabase
      .from("case_studies")
      .select("*")
      .order("created_at", { ascending: false });

    const seenUrls = new Set<string>();
    const portfolioRoutes: MetadataRoute.Sitemap = [];

    for (const cs of caseStudies || []) {
      const slug = toSlug(cs);
      if (!slug) continue;
      const fullUrl = `${BASE_URL}/portfolio/${slug}`;
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      const modDate = cs.updated_at || cs.created_at;
      portfolioRoutes.push({
        url: fullUrl,
        lastModified: modDate ? new Date(modDate) : new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }

    return [...staticRoutes, ...portfolioRoutes];
  } catch (_) {
    return staticRoutes;
  }
}
