import { NextResponse } from 'next/server';
import { parseEmail } from '@/lib/validate';
import { getServiceClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Newsletter sign-up (spec §4.1, §8.4, §8.6). Validated + rate-limited. Upserts
// so re-subscribing is idempotent and never errors. Responds 200 even when the
// DB is not configured so the marketing UI works in preview.
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`newsletter:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  }

  let email: string;
  try {
    email = parseEmail(await req.json());
  } catch {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
  }

  const supabase = await getServiceClient();
  if (!supabase) {
    // Preview mode — accept gracefully; nothing persisted.
    return NextResponse.json({ ok: true, persisted: false });
  }

  const { error } = await supabase.from('newsletter').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) {
    console.error('[newsletter] insert error', error.message);
    return NextResponse.json({ error: 'Could not subscribe right now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
