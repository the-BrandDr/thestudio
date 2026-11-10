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
  title: {
    default: "Lavie Studios | Event Branding, Corporate Identity & Advertising Agency",
    template: "%s | Lavie Studios",
  },
  description:
    "Premier creative branding, corporate identity, event scenography, custom craft fabrication, and advertising agency.",
      manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
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