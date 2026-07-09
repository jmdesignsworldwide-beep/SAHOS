import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { getStripe } from '@/lib/stripe';
import { syncOrderFromSession } from '@/lib/orders';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Post-checkout confirmation. As a robust fallback to the webhook, this page
// itself creates the order from the paid Checkout Session (looked up by its
// session_id) — so the order reaches /portal/pedidos the moment the customer
// lands here, even if the Stripe webhook endpoint is misconfigured. Idempotent,
// so a refresh never duplicates it.
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  let orderRef: string | null = null;

  if (sessionId) {
    try {
      const stripe = await getStripe();
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const res = await syncOrderFromSession(session);
        if (res.ok && res.orderId) {
          orderRef = (session.payment_intent as string | null)?.slice(-8).toUpperCase() ?? null;
        }
      }
    } catch (e) {
      // Never block the thank-you page on reconciliation; the webhook remains a
      // second path. Log for diagnosis.
      console.error('[checkout/success] order sync failed', e instanceof Error ? e.message : e);
    }
  }

  return (
    <>
      <main
        className="page-head"
        style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <p className="page-head__eyebrow label">Order received</p>
        <h1 className="page-head__title" style={{ marginBottom: '2rem' }}>
          Thank you.
        </h1>
        {orderRef && (
          <p style={{ color: '#1a1a18', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            Order #{orderRef}
          </p>
        )}
        <p style={{ color: '#767470', maxWidth: '46ch', margin: '0 auto 2.5rem' }}>
          Your confirmation is on its way. Each piece is prepared by hand and dispatched on a velvet
          hanger, inside SAHOS packaging made to be opened slowly.
        </p>
        <div>
          <Link href="/#collection" className="btn-outline">
            Continue
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
