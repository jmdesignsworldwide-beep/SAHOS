import type { DailyPoint } from '@/lib/dashboard';

// Minimal, on-brand 30-day sales bar chart. Pure SVG (no chart library, no
// client JS) so it stays light and CSP-safe. Single ink hue, subtle baseline.
export function SalesChart({ daily, currency = 'usd' }: { daily: DailyPoint[]; currency?: string }) {
  const max = Math.max(1, ...daily.map((d) => d.cents));
  const W = 720;
  const H = 180;
  const pad = 8;
  const n = daily.length;
  const bw = (W - pad * 2) / n;

  const fmt = (c: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(
      c / 100
    );

  const first = daily[0]?.day;
  const last = daily[n - 1]?.day;
  const label = (iso?: string) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }) : '';

  return (
    <div className="chart">
      <div className="chart__head">
        <span className="chart__max">Máx/día: {fmt(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" role="img" aria-label="Ventas de los últimos 30 días" preserveAspectRatio="none">
        <line x1={pad} y1={H - 18} x2={W - pad} y2={H - 18} className="chart__base" />
        {daily.map((d, i) => {
          const h = Math.max(d.cents > 0 ? 2 : 0, ((H - 30) * d.cents) / max);
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
