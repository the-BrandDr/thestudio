import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://studioslavie.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) return staticRoutes;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: caseStudies } = await supabase
      .from("case_studies")
      .select("slug, updated_at, created_at")
      .order("created_at", { ascending: false });

    const portfolioRoutes: MetadataRoute.Sitemap = (caseStudies || [])
      .filter((cs) => cs.slug)
      .map((cs) => ({
        url: `${BASE_URL}/portfolio/${cs.slug}`,
        lastModified: cs.updated_at ? new Date(cs.updated_at) : cs.created_at ? new Date(cs.created_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.85,
      }));

    return [...staticRoutes, ...portfolioRoutes];
  } catch (_) {
    return staticRoutes;
  }
}
