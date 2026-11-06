import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Lavie Studios — Start Your Branding or Event Production Project",
  description: "Get in touch with Lavie Studios Ltd for event branding, corporate identity design, stage scenography, and advertising execution across Lagos, Abuja, Ibadan, Ogbomoso, and nationwide.",
  alternates: {
    canonical: "https://studioslavie.com/contact",
  },
  openGraph: {
    title: "Contact Lavie Studios — Start Your Branding or Event Production Project | Lavie Studios",
    description: "Get in touch with Lavie Studios Ltd for event branding, corporate identity design, stage scenography, and advertising execution across Lagos, Abuja, Ibadan, Ogbomoso, and nationwide.",
    url: "https://studioslavie.com/contact",
    siteName: "Lavie Studios",
    type: "website",
  },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
