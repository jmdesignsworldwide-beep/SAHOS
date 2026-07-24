import { PortalHeader } from '@/components/portal/PortalHeader';

// Shown while the analytics data loads (Next.js Suspense boundary). Mirrors the
// real layout with shimmer blocks — never a bare spinner.
export default function AnalyticsLoading() {
  return (
    <>
      <PortalHeader />
      <main className="pwrap pwrap--wide" aria-busy="true">
        <div className="an__head">
          <div>
            <div className="skel skel--title" />
            <div className="skel skel--line" style={{ width: '22rem', marginTop: 10 }} />
          </div>
          <div className="skel skel--pill" />
        </div>
        <div className="kpis">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="kpi">
              <div className="skel skel--line" style={{ width: '60%' }} />
              <div className="skel skel--num" />
              <div className="skel skel--line" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
        <div className="an__grid an__grid--62">
          <section className="an__card"><div className="skel skel--block" style={{ height: 320 }} /></section>
          <section className="an__card"><div className="skel skel--block" style={{ height: 320 }} /></section>
        </div>
        <section className="an__card"><div className="skel skel--block" style={{ height: 240 }} /></section>
      </main>
    </>
  );
}
