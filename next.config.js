/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Security headers — "Fort Knox" baseline (spec §8.5). Applied to every route.
// CSP is intentionally strict; extend the allow-lists here (never inline in
// components) when adding a new third-party (Stripe, Supabase, fonts, etc.).
// ---------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for its runtime style injection; GSAP/Framer
  // are bundled so no external script host is needed beyond Stripe.
  `script-src 'self' ${isDev ? "'unsafe-eval'" : ''} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.ingest.sentry.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
