/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Security headers — "Fort Knox" baseline (spec §8.5). Applied to every route.
//
// NOTE: Content-Security-Policy is NOT set here. It requires a per-request
// nonce (for Next.js's inline hydration scripts) and therefore lives in
// middleware.ts. Setting a static, nonce-less CSP here blocks those inline
// scripts and freezes the page. The headers below are static and safe here.
// ---------------------------------------------------------------------------
const securityHeaders = [
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
