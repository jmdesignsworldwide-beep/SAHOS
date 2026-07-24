import type { FunnelStep } from '@/lib/insights';

// The conversion funnel — the module's centerpiece. Each step shows its label +
// count above a bar whose width is its share of the top step; between steps we
// show the step-to-step pass-through so the biggest drop-off is obvious at a
// glance. Labels sit above the bar (always legible, whatever the fill width).
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="funnel">
      {steps.map((s, i) => (
        <div key={s.key} className="funnel__step">
          {i > 0 && (
            <div className="funnel__drop" aria-hidden>
              <span className="funnel__droparrow">↓</span>
              <span className={`funnel__droppct ${s.pctOfPrev < 40 ? 'is-weak' : ''}`}>{s.pctOfPrev}% continúa</span>
            </div>
          )}
          <div className="funnel__row">
            <span className="funnel__label">{s.label}</span>
            <span className="funnel__count">
              {s.count.toLocaleString('es-DO')} <span className="funnel__of">· {s.pctOfTop}%</span>
            </span>
          </div>
          <div className="funnel__bar">
            <div className="funnel__fill" style={{ width: `${Math.max(3, s.pctOfTop)}%` }} data-step={i} />
          </div>
        </div>
      ))}
    </div>
  );
}
