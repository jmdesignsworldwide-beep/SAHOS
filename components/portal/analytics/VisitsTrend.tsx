import type { DayCount } from '@/lib/analytics';

// On-brand visits-over-time bar chart. Pure SVG (no chart library, no client
// JS), CSP-safe and light. Mirrors the dashboard SalesChart visual language.
export function VisitsTrend({ daily, weekly }: { daily: DayCount[]; weekly: boolean }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  const W = 720;
  const H = 180;
  const pad = 8;
  const n = Math.max(1, daily.length);
  const bw = (W - pad * 2) / n;

  const label = (iso?: string) =>
    iso
      ? new Date(iso + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
      : '';

  const first = daily[0]?.day;
  const last = daily[daily.length - 1]?.day;

  return (
    <div className="chart">
      <div className="chart__head">
        <span className="chart__max">
          Máx/{weekly ? 'semana' : 'día'}: {max.toLocaleString('es-DO')}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label={`Visitas por ${weekly ? 'semana' : 'día'}`}
        preserveAspectRatio="none"
      >
        <line x1={pad} y1={H - 18} x2={W - pad} y2={H - 18} className="chart__base" />
        {daily.map((d, i) => {
          const h = Math.max(d.count > 0 ? 2 : 0, ((H - 30) * d.count) / max);
          const x = pad + i * bw + bw * 0.15;
          const y = H - 18 - h;
          return <rect key={d.day} x={x} y={y} width={bw * 0.7} height={h} rx={1.5} className="chart__bar" />;
        })}
      </svg>
      <div className="chart__axis">
        <span>{label(first)}</span>
        <span>{label(last)}</span>
      </div>
    </div>
  );
}
