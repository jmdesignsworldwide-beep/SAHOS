import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Content-Security-Policy with a per-request nonce (spec §8.5, Fort Knox).
//
// Next.js App Router injects inline bootstrap scripts for hydration. A strict
// `script-src` without a nonce blocks them, which kills client JS entirely
// (frozen page). Instead of weakening the policy with 'unsafe-inline', we mint
// a fresh nonce per request here and expose it two ways:
//   * on the RESPONSE header → the browser enforces it
//   * on the forwarded REQUEST header → Next.js reads it and stamps the nonce
//     onto its own inline scripts automatically
// This keeps the policy strict AND lets the app hydrate. Nonces opt pages into
// dynamic rendering, which is an acceptable trade for correct, secure CSP.
// ---------------------------------------------------------------------------
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    "default-src 'self'",
    // 'self' covers our bundled chunk files; the nonce covers Next's inline
    // hydration scripts; js.stripe.com for Stripe.js.
    `script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ''} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ]
    .filter(Boolean)
    .join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  // Apply to document requests only. Skip static assets, the image optimizer and
  // API routes so they keep their own headers and are never disturbed.
  matcher: ['/((?!_next/static|_next/image|api/|favicon.ico|robots.txt|sitemap.xml|products/).*)'],
};
