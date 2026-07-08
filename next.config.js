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
  experimental: {
    // Raise the Server Action body cap (default 1MB) so product-photo uploads
    // (which still post the file through a Server Action) accept normal photos.
    // NOTE: site images (/portal/imagenes) bypass this entirely — they upload
    // straight to Storage via a signed URL — so they aren't bound by the ~4.5MB
    // Vercel function-body ceiling either.
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // The product route scans public/products/<slug>/ with fs to auto-detect
    // model-N.jpg photos. On Vercel those public files must be traced into the
    // route's serverless function so fs.existsSync can see them at runtime.
    outputFileTracingIncludes: {
      '/product/[slug]': ['./public/products/**/*'],
    },
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
