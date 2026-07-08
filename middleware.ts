import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env, hasSupabasePublic } from '@/lib/env';

// ---------------------------------------------------------------------------
// One middleware, two jobs:
//
// 1) Content-Security-Policy with a per-request nonce (Fort Knox, spec §8.5).
//    Next.js App Router injects inline hydration scripts; a nonce-less strict
//    script-src blocks them and freezes the page. We mint a nonce per request,
//    forward it on the REQUEST header (Next stamps it onto its inline scripts)
//    and enforce it on the RESPONSE header.
//
// 2) Supabase Auth session refresh + /portal/* gating. The admin portal is
//    protected server-side here — no valid session → redirect to the login.
//    This is the real gate; the UI is never trusted on its own (spec §5.5).
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ''} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
    // Portal-managed site videos stream from Supabase Storage; blob: covers the
    // portal's local preview (URL.createObjectURL) before upload.
    "media-src 'self' blob: https://*.supabase.co",
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

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);

  const path = request.nextUrl.pathname;
  const isPortal = path === '/portal' || path.startsWith('/portal/');

  // Auth is only relevant when Supabase is configured. Without it, the portal
  // shows a "not configured" notice and the public store is unaffected. Send any
  // inner portal page back to the login so it never hits an unconfigured client.
  if (!hasSupabasePublic()) {
    if (isPortal && path !== '/portal' && path !== '/portal/') {
      const url = request.nextUrl.clone();
      url.pathname = '/portal';
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set('content-security-policy', csp);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any));
      },
    },
  });

  // IMPORTANT: getUser() validates the JWT and refreshes the session cookies.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null; // Supabase unreachable → treat as signed-out; store still works
  }

  if (isPortal) {
    const isLogin = path === '/portal' || path === '/portal/';
    if (!user && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = '/portal';
      return NextResponse.redirect(url);
    }
    if (user && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = '/portal/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Documents only. Skip static assets, the image optimizer, API routes and
  // public product files so they keep their own headers and stay cacheable.
  matcher: ['/((?!_next/static|_next/image|api/|favicon.ico|robots.txt|sitemap.xml|products/).*)'],
};
