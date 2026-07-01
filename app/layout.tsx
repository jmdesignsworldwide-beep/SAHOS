import type { Metadata, Viewport } from 'next';
import { Jost, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

// Fonts (spec §2): Jost carries 95% of the UI; Cormorant is the single couture
// touch reserved for piece names / section titles. Loaded via next/font so
// there is no layout shift and no external font request at runtime.
const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sahos.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SAHOS — The Marilyn Collection',
    template: '%s — SAHOS',
  },
  description: 'Soft glamour, made to be seen. Five pieces — not a wardrobe, a confession.',
  openGraph: {
    title: 'SAHOS — The Marilyn Collection',
    description: 'Soft glamour, made to be seen.',
    type: 'website',
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${cormorant.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
