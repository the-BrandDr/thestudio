import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio & Case Studies — Event Branding, Corporate Identity & Production",
  description: "Explore recent event branding, stage scenography, corporate brand identity systems, OOH campaigns, and experiential productions executed by Lavie Studios across Nigeria.",
  alternates: {
    canonical: "https://studioslavie.com/portfolio",
  },
  openGraph: {
    title: "Portfolio & Case Studies — Event Branding, Corporate Identity & Production | Lavie Studios",
    description: "Explore recent event branding, stage scenography, corporate brand identity systems, OOH campaigns, and experiential productions executed by Lavie Studios across Nigeria.",
    url: "https://studioslavie.com/portfolio",
    siteName: "Lavie Studios",
    type: "website",
  },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
