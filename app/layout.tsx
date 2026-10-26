// app/layout.tsx
import { Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { CookieConsent } from '@/components/cookie-consent';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
});

export const metadata = {
  title: 'Lavie Studios | Event Branding & Experience Design',
  description: 'We build immersive spatial experiences that make live events unforgettable.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/apple-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-icon.png',
    },
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          {/* Injected Cookie Consent Banner */}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}