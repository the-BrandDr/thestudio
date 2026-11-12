import { StudioStructuredData } from "@/components/seo/structured-data";
// app/layout.tsx
import { Analytics } from "@vercel/analytics/next";
import { Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { CookieConsent } from '@/components/cookie-consent';
import "./globals.css";
import { PublicPushInitializer } from "@/components/notifications/studio-notification-hub";

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
});

export const metadata = {
  metadataBase: new URL("https://studioslavie.com"),
  title: {
    default:
      "Lavie Studios | #1 Event Branding, Corporate Branding, Design & Event Media Agency in Ogbomoso & Nigeria",
    template: "%s | Lavie Studios",
  },
  description:
    "Lavie Studios Ltd is Nigeria's premier event branding, corporate branding, stage design, custom fabrication, event media, design, and advertising agency in Ogbomoso, Oyo State, serving events and businesses across Nigeria.",
  applicationName: "Lavie Studios",
  authors: [{ name: "Lavie Studios Ltd", url: "https://studioslavie.com" }],
  creator: "Lavie Studios Ltd",
  publisher: "Lavie Studios Ltd",
  category: "Event Branding, Corporate Branding, Design & Media Agency",
  keywords: [
    "Lavie Studios",
    "Studios Lavie",
    "Event Branding",
    "Event Branding in Ogbomoso",
    "Event Branding in Nigeria",
    "Events in Ogbomoso",
    "Events in Nigeria",
    "Ogbomoso Events",
    "Ogbomoso Creatives",
    "Corporate Branding",
    "Corporate Branding Agency in Nigeria",
    "Branding Agency in Ogbomoso",
    "Branding Agency in Oyo State",
    "Branding Agency in Ibadan Lagos Abuja",
    "Business Branding Nigeria",
    "Design Agency in Ogbomoso",
    "Graphic Design and Print Production Ogbomoso",
    "Event Media",
    "Event Media and Photography in Ogbomoso",
    "Event Videography and Documentary Nigeria",
    "Stage Design and Scenography Nigeria",
    "Custom Craft Fabrication and Exhibition Booths",
    "Corporate Souvenirs and Merch Nigeria",
    "Out of Home Advertising OOH Nigeria",
    "Billboard and Signage Agency Ogbomoso",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://studioslavie.com",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://studioslavie.com",
    siteName: "Lavie Studios",
    title:
      "Lavie Studios | Event Branding, Corporate Identity, Design & Event Media Agency in Ogbomoso & Nigeria",
    description:
      "Transforming events and businesses across Ogbomoso and Nigeria through world-class event branding, corporate identity systems, stage scenography, custom craft fabrication, event media, and advertising.",
    images: [
      {
        url: "https://studioslavie.com/opengraph-image?v=2026.2",
        width: 1200,
        height: 630,
        alt: "Lavie Studios — Event Branding, Corporate Identity & Advertising Agency in Ogbomoso, Nigeria",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Lavie Studios | Event Branding, Corporate Identity & Event Media Agency in Nigeria",
    description:
      "Premier event branding, corporate branding, stage scenography, custom fabrication, and event media agency in Ogbomoso and across Nigeria.",
    images: ["https://studioslavie.com/twitter-image?v=2026.2"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48 64x64", type: "image/x-icon" },
      { url: "/icon", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "geo.region": "NG-OY",
    "geo.placename": "Ogbomoso, Oyo State, Nigeria",
    "geo.position": "8.1333;4.2500",
    ICBM: "8.1333, 4.2500",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={spaceGrotesk.variable}>
      <body className={`${spaceGrotesk.className} antialiased bg-[var(--bg-main)] text-[var(--text-primary)]`}>
        <StudioStructuredData />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          {/* Injected Cookie Consent Banner */}
          <CookieConsent />
        </ThemeProvider>
        <PublicPushInitializer />
      </body>
    </html>
  );
}