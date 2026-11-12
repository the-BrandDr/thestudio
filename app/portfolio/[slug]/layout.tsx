import type { Metadata } from "next";
import * as React from "react";
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
        "Explore event branding, corporate identity, and experiential production case studies by Lavie Studios in Ogbomoso and across Nigeria.",
    };
  }

  const clientPart = project.client ? ` for ${project.client}` : "";
  const catPart = project.category || "Event Branding & Corporate Identity";
  const title = `${project.title}${clientPart} — ${catPart}`;
  const description =
    project.summary ||
    project.description ||
    `Official case study of ${project.title}${clientPart}, featuring ${catPart} executed by Lavie Studios in Ogbomoso / Nigeria.`;

  const canonicalSlug = encodeURIComponent(
    String(project.slug || slug).toLowerCase()
  );
  const canonicalUrl = `https://studioslavie.com/portfolio/${canonicalSlug}`;
  const coverImg =
    project.cover_image || "https://studioslavie.com/opengraph-image?v=2026.2";

  const deliverableKeywords = Array.isArray(project.deliverables)
    ? project.deliverables
    : typeof project.deliverables === "string"
    ? project.deliverables.split(",").map((s: string) => s.trim())
    : [];

  return {
    title,
    description,
    keywords: [
      project.title,
      project.client,
      project.category,
      project.sub_category,
      ...deliverableKeywords,
      "Lavie Studios",
      "Events in Ogbomoso",
      "Events in Nigeria",
      "Event Branding in Ogbomoso",
      "Event Branding in Nigeria",
      "Corporate Branding Nigeria",
      "Event Media Coverage",
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} | Lavie Studios`,
      description,
      url: canonicalUrl,
      siteName: "Lavie Studios",
      locale: "en_NG",
      type: "article",
      images: [
        {
          url: coverImg,
          width: 1200,
          height: 630,
          alt: `${project.title} — ${project.client || "Lavie Studios Case Study"}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Lavie Studios`,
      description,
      images: [coverImg],
    },
  };
}

export default async function PortfolioSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const project = await getPortfolioProject(slug);

  if (!project) return <>{children}</>;

  const canonicalUrl = `https://studioslavie.com/portfolio/${encodeURIComponent(
    String(project.slug || slug).toLowerCase()
  )}`;
  const allImages = [
    project.cover_image,
    ...(Array.isArray(project.images) ? project.images : []),
    ...(Array.isArray(project.gallery_media) ? project.gallery_media : []),
  ].filter(Boolean);

  const projectSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${canonicalUrl}#case-study`,
        name: project.title,
        headline: `${project.title} — ${project.client || project.category || "Lavie Studios"}`,
        description: project.summary || project.description || project.title,
        url: canonicalUrl,
        image: allImages.length > 0 ? allImages : ["https://studioslavie.com/opengraph-image?v=2026.2"],
        dateCreated: project.year || project.created_at,
        genre: project.category || "Event Branding & Corporate Identity",
        creator: {
          "@type": "Organization",
          "@id": "https://studioslavie.com/#organization",
          name: "Lavie Studios Ltd",
          url: "https://studioslavie.com",
        },
        about: {
          "@type": "Thing",
          name: project.client || project.title,
        },
        locationCreated: {
          "@type": "Place",
          name: "Ogbomoso, Oyo State, Nigeria",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Lavie Studios",
            item: "https://studioslavie.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Portfolio & Case Studies",
            item: "https://studioslavie.com/portfolio",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: project.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectSchema) }}
      />
      {/* Server-rendered semantic summary so Googlebot indexes the full project story in initial HTML */}
      <article className="sr-only">
        <h1>
          {project.title} — {project.client} ({project.category}) | Lavie Studios
        </h1>
        <p>{project.summary}</p>
        <p>{project.description}</p>
        <p>
          Executed by Lavie Studios Ltd — Event Branding, Corporate Branding, Design & Event Media Agency in Ogbomoso, Oyo State, Nigeria.
        </p>
      </article>
      {children}
    </>
  );
}
