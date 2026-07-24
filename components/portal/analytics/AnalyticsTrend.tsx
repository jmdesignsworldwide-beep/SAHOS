import type { TrendPoint } from '@/lib/insights';

// Visitors (bars) with revenue (gold line) over the period. Pure SVG, no chart
// library, CSP-safe. Mirrors the dashboard chart language.
export function AnalyticsTrend({ trend }: { trend: TrendPoint[] }) {
  const n = Math.max(1, trend.length);
  const maxV = Math.max(1, ...trend.map((t) => t.visitors));
  const maxR = Math.max(1, ...trend.map((t) => t.revenueCents));
  const W = 720;
  const H = 200;
  const pad = 10;
  const baseY = H - 22;
  const bw = (W - pad * 2) / n;

  const label = (iso?: string) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }) : '';

  const pts = trend.map((t, i) => {
    const x = pad + i * bw + bw / 2;
    const y = pad + (baseY - pad) * (1 - t.revenueCents / maxR);
    return `${x},${y}`;
  });
  const hasRevenue = trend.some((t) => t.revenueCents > 0);

  return (
    <div className="chart">
      <div className="chart__head">
        <span className="chart__max">Máx/día: {maxV.toLocaleString('es-DO')} visitantes</span>
        {hasRevenue && <span className="chart__legend chart__legend--gold">— ingresos</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" role="img" aria-label="Visitantes e ingresos por día" preserveAspectRatio="none">
        <line x1={pad} y1={baseY} x2={W - pad} y2={baseY} className="chart__base" />
        {trend.map((t, i) => {
          const h = Math.max(t.visitors > 0 ? 2 : 0, ((baseY - pad) * t.visitors) / maxV);
          const x = pad + i * bw + bw * 0.2;
          const y = baseY - h;
          return <rect key={t.day} x={x} y={y} width={bw * 0.6} height={h} rx={1.5} className="chart__bar" />;
        })}
        {hasRevenue && n > 1 && <polyline points={pts.join(' ')} className="chart__line" fill="none" />}
      </svg>
      <div className="chart__axis">
        <span>{label(trend[0]?.day)}</span>
        <span>{label(trend[trend.length - 1]?.day)}</span>
      </div>
    </div>
  );
}
