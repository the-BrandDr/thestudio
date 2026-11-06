import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Services — Event Branding, Corporate Identity, OOH & Print Production",
  description: "Comprehensive brand execution across Event Branding, Spatial Scenography, Corporate Identity Systems, Event Media, Photography, Souvenirs, Print Production, and OOH Advertising.",
  alternates: {
    canonical: "https://studioslavie.com/services",
  },
  openGraph: {
    title: "Our Services — Event Branding, Corporate Identity, OOH & Print Production | Lavie Studios",
    description: "Comprehensive brand execution across Event Branding, Spatial Scenography, Corporate Identity Systems, Event Media, Photography, Souvenirs, Print Production, and OOH Advertising.",
    url: "https://studioslavie.com/services",
    siteName: "Lavie Studios",
    type: "website",
  },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
