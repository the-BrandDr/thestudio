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
    default: "Lavie Studios | Event Branding, Corporate Identity & Advertising Agency",
    template: "%s | Lavie Studios",
  },
  description:
    "Premier event branding, corporate identity, stage scenography, custom craft fabrication, event media, and out-of-home (OOH) advertising agency in Nigeria.",
  keywords: [
    "Lavie Studios",
    "Event Branding Nigeria",
    "Corporate Branding Agency Nigeria",
    "Stage Design and Scenography",
    "Custom Craft Fabrication",
    "Out of Home Advertising Nigeria",
    "Corporate Identity Design",
    "Event Production Lagos Abuja Ibadan Ogbomoso",
  ],
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://studioslavie.com",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://studioslavie.com",
    siteName: "Lavie Studios",
    title: "Lavie Studios | Event Branding, Corporate Identity & Advertising Agency",
    description:
      "Premier creative branding, corporate identity, event scenography, custom craft fabrication, and advertising agency across Nigeria.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Lavie Studios — Event Branding, Corporate Identity & Advertising Agency",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lavie Studios | Event Branding, Corporate Identity & Advertising Agency",
    description:
      "Premier creative branding, corporate identity, event scenography, custom craft fabrication, and advertising agency across Nigeria.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: ["/icon"],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
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