import type { Metadata, Viewport } from 'next';
import { Jost, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { SITE_URL, SITE_NAME, OG_IMAGE } from '@/lib/seo';

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

// The nav wordmark is the real SAHOS logotype, rendered from the logo art as a
// CSS mask (see .nav__wordmark) — no web font approximates it, so none is loaded.

// The nonce-based CSP (middleware.ts) requires per-request rendering so Next
// can stamp the request's nonce onto its inline hydration scripts. Without
// this, statically prerendered HTML carries nonce-less scripts that the CSP
// blocks — freezing the page. Small pages, so the dynamic cost is negligible.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SAHOS — The Marilyn Collection | Luxury Womenswear',
    template: '%s — SAHOS',
  },
  description:
    'SAHOS — luxury womenswear. The Marilyn Collection: five satin evening pieces where Old Hollywood glamour meets vintage allure. Soft glamour, made to be seen.',
  keywords: [
    'SAHOS',
    'luxury womenswear',
    'luxury dresses',
    'satin dress',
    'evening dress',
    'Old Hollywood glamour',
    'corset dress',
    'The Marilyn Collection',
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    siteName: SITE_NAME,
    title: 'SAHOS — The Marilyn Collection | Luxury Womenswear',
    description:
      'The Marilyn Collection — five satin evening pieces where Old Hollywood glamour meets vintage allure.',
    type: 'website',
    url: SITE_URL,
    locale: 'en_US',
    images: [{ url: OG_IMAGE, alt: 'SAHOS — The Marilyn Collection' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAHOS — The Marilyn Collection | Luxury Womenswear',
    description: 'Luxury womenswear. Old Hollywood glamour meets vintage allure.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
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
