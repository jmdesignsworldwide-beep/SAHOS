import type { Metadata } from 'next';
import './portal.css';

// The admin portal is private: never indexed, never linked from the store.
export const metadata: Metadata = {
  title: 'SAHOS — Portal',
  robots: { index: false, follow: false, nocache: true },
};

// Auth + config depend on per-request state.
export const dynamic = 'force-dynamic';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal">{children}</div>;
}
