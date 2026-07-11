import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { FadeUp } from '@/components/motion/Reveal';
import { ContactForm } from '@/components/contact/ContactForm';
import { SITE_URL, SITE_NAME, OG_IMAGE } from '@/lib/seo';

// Per-request render so the nonce-based CSP (middleware.ts) can stamp its nonce.
export const dynamic = 'force-dynamic';

const description = 'Questions about your order or a piece? Write to SAHOS — we answer every note personally.';

export const metadata: Metadata = {
  title: 'Contact',
  description,
  alternates: { canonical: '/contact' },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    url: `${SITE_URL}/contact`,
    title: 'Contact — SAHOS',
    description,
    images: [{ url: OG_IMAGE, alt: 'SAHOS — Contact' }],
  },
  twitter: { card: 'summary_large_image', title: 'Contact — SAHOS', description, images: [OG_IMAGE] },
};

// Contact us (customer service) — distinct from the marketing newsletter in the
// footer. Email + message, persisted for the owner to answer from the portal.
export default function ContactPage() {
  return (
    <>
      <header className="page-head">
        <FadeUp as="p" className="page-head__eyebrow label">
          Contact
        </FadeUp>
        <FadeUp as="h1" className="page-head__title page-head__title--collection" delay={0.05}>
          We answer every note personally
        </FadeUp>
      </header>

      <main className="contact">
        <FadeUp as="p" className="contact__intro">
          For questions about your order, sizing, or a piece — send us a message and we&rsquo;ll get
          back to you. For promotions and new arrivals, join the newsletter below.
        </FadeUp>
        <ContactForm />
      </main>

      <Footer />
    </>
  );
}
