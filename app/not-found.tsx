import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="page-head"
      style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <p className="page-head__eyebrow label">404</p>
      <h1 className="page-head__title" style={{ marginBottom: '2rem' }}>
        Nothing here.
      </h1>
      <div>
        <Link href="/" className="btn-outline">
          Return home
        </Link>
      </div>
    </main>
  );
}
