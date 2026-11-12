import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

async function getPortfolioProject(rawSlug: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";
    if (!supabaseUrl || !supabaseKey) return null;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { data: allRows } = await supabase
      .from("case_studies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!allRows || allRows.length === 0) return null;
    const decoded = decodeURIComponent(rawSlug || "").toLowerCase();

    return (
      allRows.find((r) => String(r.slug || "").toLowerCase() === decoded) ||
      allRows.find((r) => String(r.id || "").toLowerCase() === decoded) ||
      allRows.find(
        (r) =>
          String(r.title || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") === decoded
      ) ||
      null
    );
  } catch (_) {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const project = await getPortfolioProject(slug);

  if (!project) {
    return {
      title: "Portfolio Case Study | Lavie Studios",
      description:
        "Explore event branding, corporate identity, and experiential production case studies by Lavie Studios.",
    };
  }

  const title = `${project.title} — ${project.client || project.category || "Case Study"}`;
  const description =
    project.summary ||
    project.description ||
    `${project.title} executed for ${project.client || "our client"} by Lavie Studios (${project.category || "Branding & Production"}).`;
  const canonicalUrl = `https://studioslavie.com/portfolio/${encodeURIComponent(
    project.slug || slug
  )}`;
  const ogImages = project.cover_image
    ? [{ url: project.cover_image, width: 1200, height: 630, alt: project.title }]
    : [{ url: "/opengraph-image", width: 1200, height: 630, alt: project.title }];

  return {
    title,
    description,
    keywords: [
      project.title,
      project.client,
      project.category,
      "Lavie Studios Portfolio",
      "Event Branding Nigeria",
      "Corporate Branding Nigeria",
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} | Lavie Studios`,
      description,
      url: canonicalUrl,
      siteName: "Lavie Studios",
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Lavie Studios`,
      description,
      images: project.cover_image ? [project.cover_image] : ["/twitter-image"],
    },
  };
}

export default function PortfolioSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
