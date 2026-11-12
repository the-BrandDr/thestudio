import type { Metadata } from "next";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title:
    "Portfolio & Event Case Studies — Event Branding, Corporate Branding & Event Media in Ogbomoso & Nigeria",
  description:
    "Explore major events in Ogbomoso and across Nigeria branded and produced by Lavie Studios — including stage scenography, corporate branding, custom fabrication, event media coverage, and OOH advertising.",
  keywords: [
    "Lavie Studios Portfolio",
    "Events in Ogbomoso",
    "Event Branding Case Studies Nigeria",
    "Corporate Branding Projects Nigeria",
    "Stage Design Portfolio Nigeria",
    "Event Media Coverage Ogbomoso",
    "Ogbomoso Conferences and Events",
    "Experiential Event Production Nigeria",
  ],
  alternates: {
    canonical: "https://studioslavie.com/portfolio",
  },
  openGraph: {
    title:
      "Portfolio & Case Studies — Event Branding, Corporate Identity & Event Media | Lavie Studios",
    description:
      "Discover how Lavie Studios brings life to major events, conferences, and corporate brands in Ogbomoso, Oyo State, and across Nigeria.",
    url: "https://studioslavie.com/portfolio",
    siteName: "Lavie Studios",
    type: "website",
    images: [
      {
        url: "https://studioslavie.com/opengraph-image?v=2026.2",
        width: 1200,
        height: 630,
        alt: "Lavie Studios Portfolio — Event Branding & Corporate Identity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio & Event Case Studies | Lavie Studios",
    description:
      "Explore recent event branding, stage scenography, corporate identity, and event media projects executed by Lavie Studios.",
    images: ["https://studioslavie.com/twitter-image?v=2026.2"],
  },
};

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

async function getAllPortfolioItemsForSEO() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";
    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { data } = await supabase
      .from("case_studies")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  } catch (_) {
    return [];
  }
}

export default async function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = await getAllPortfolioItemsForSEO();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://studioslavie.com/portfolio#collection",
    name: "Lavie Studios Portfolio — Event Branding, Corporate Identity & Event Media Projects",
    url: "https://studioslavie.com/portfolio",
    description:
      "Official portfolio of event branding, stage scenography, corporate branding, custom fabrication, and event media projects executed by Lavie Studios in Ogbomoso and across Nigeria.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: projects.map((p: any, idx: number) => {
        const slug = toSlug(p);
        const itemUrl = `https://studioslavie.com/portfolio/${slug}`;
        return {
          "@type": "ListItem",
          position: idx + 1,
          url: itemUrl,
          item: {
            "@type": "CreativeWork",
            name: p.title,
            headline: `${p.title} — ${p.client || p.category || "Lavie Studios Case Study"}`,
            description:
              p.summary ||
              p.description ||
              `${p.title} executed by Lavie Studios for ${p.client || "Client"}.`,
            url: itemUrl,
            image: p.cover_image || "https://studioslavie.com/opengraph-image?v=2026.2",
            creator: {
              "@type": "Organization",
              name: "Lavie Studios Ltd",
              url: "https://studioslavie.com",
            },
            keywords: [
              p.title,
              p.client,
              p.category,
              "Ogbomoso Events",
              "Event Branding Nigeria",
              "Lavie Studios",
            ]
              .filter(Boolean)
              .join(", "),
          },
        };
      }),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      {/* Server-rendered crawlable index for search engine bots (visually hidden so UI is untouched) */}
      <nav aria-label="Portfolio Case Studies Index" className="sr-only">
        <h2>Lavie Studios Event Branding, Corporate Identity & Event Media Portfolio in Ogbomoso & Nigeria</h2>
        <ul>
          {projects.map((p: any) => {
            const slug = toSlug(p);
            return (
              <li key={p.id || slug}>
                <a href={`/portfolio/${slug}`}>
                  {p.title} — {p.client} ({p.category}) | Event Branding & Corporate Branding by Lavie Studios
                </a>
                <p>{p.summary || p.description}</p>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </>
  );
}
