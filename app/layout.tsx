import type { Metadata, Viewport } from 'next';
import { Jost, Cormorant_Garamond, Poiret_One } from 'next/font/google';
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

// The brand wordmark. The SAHOS logo is thin, wide-tracked Art-Deco geometric
// lettering; Poiret One is the closest web face and is reserved ONLY for the
// centered nav wordmark so it reads as the brand mark, not UI text.
const poiret = Poiret_One({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-wordmark',
  display: 'swap',
});

// The nonce-based CSP (middleware.ts) requires per-request rendering so Next
// can stamp the request's nonce onto its inline hydration scripts. Without
// this, statically prerendered HTML carries nonce-less scripts that the CSP
// blocks — freezing the page. Small pages, so the dynamic cost is negligible.
export const dynamic = 'force-dynamic';

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
    <html lang="en" className={`${jost.variable} ${cormorant.variable} ${poiret.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
