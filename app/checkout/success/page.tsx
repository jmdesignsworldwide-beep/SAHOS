import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

// Post-checkout confirmation. The order is confirmed asynchronously by the
// verified Stripe webhook — this page only thanks the customer.
export default function CheckoutSuccessPage() {
  return (
    <>
      <main className="page-head" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="page-head__eyebrow label">Order received</p>
        <h1 className="page-head__title" style={{ marginBottom: '2rem' }}>
          Thank you.
        </h1>
        <p style={{ color: '#767470', maxWidth: '46ch', margin: '0 auto 2.5rem' }}>
          Your confirmation is on its way. Each piece is prepared by hand and dispatched on a velvet
          hanger, inside SAHOS packaging made to be opened slowly.
        </p>
        <div>
          <Link href="/collection" className="btn-outline">
            Continue
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
