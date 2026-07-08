import { NextResponse } from 'next/server';
import { parseContact } from '@/lib/validate';
import { getServiceClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Contact-us (customer service). Server-validated + sanitized + rate-limited.
// Persists ONLY via the service_role client (bypasses RLS); anon has no insert
// policy, so messages can never be written from the client directly. The owner
// reads/answers them in /portal/mensajes. Responds 200 even without a DB so the
// form works in preview.
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`contact:${ip}`, 4, 60_000); // 4 messages / min / IP
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let payload;
  try {
    payload = parseContact(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid request' },
      { status: 400 }
    );
  }

  const supabase = await getServiceClient();
  if (!supabase) {
    // Preview mode — accept gracefully; nothing persisted.
    return NextResponse.json({ ok: true, persisted: false });
  }

  const { error } = await supabase.from('contact_messages').insert({
    name: payload.name || null,
    email: payload.email,
    message: payload.message,
  });
  if (error) {
    console.error('[contact] insert error', error.message);
    return NextResponse.json({ error: 'Could not send your message right now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
