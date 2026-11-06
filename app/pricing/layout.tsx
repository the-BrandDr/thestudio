import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Pricing & Custom Quote Calculator",
  description: "Estimate your event branding, stage production, corporate identity, or advertising project budget with the Lavie Studios interactive project calculator.",
  alternates: {
    canonical: "https://studioslavie.com/pricing",
  },
  openGraph: {
    title: "Project Pricing & Custom Quote Calculator | Lavie Studios",
    description: "Estimate your event branding, stage production, corporate identity, or advertising project budget with the Lavie Studios interactive project calculator.",
    url: "https://studioslavie.com/pricing",
    siteName: "Lavie Studios",
    type: "website",
  },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
