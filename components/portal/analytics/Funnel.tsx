import type { FunnelStep } from '@/lib/insights';

// The conversion funnel — the module's centerpiece. Each step shows its label +
// count above a bar whose width is its share of the top step; between steps we
// show the step-to-step pass-through, and the SINGLE biggest drop-off is called
// out ("mayor fuga") so the owner sees where she's losing people. Labels sit
// above the bar (always legible, whatever the fill width).
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) return null;

  // Biggest leak: the step (after the first) with the lowest pass-through, only
  // considered once there's traffic flowing into it.
  let worst = -1;
  let worstPct = 101;
  for (let i = 1; i < steps.length; i++) {
    if (steps[i - 1].count > 0 && steps[i].pctOfPrev < worstPct) {
      worstPct = steps[i].pctOfPrev;
      worst = i;
    }
  }

  return (
    <div className="funnel">
      {steps.map((s, i) => (
        <div key={s.key} className="funnel__step">
          {i > 0 && (
            <div className={`funnel__drop ${i === worst ? 'is-worst' : ''}`}>
              <span className="funnel__droparrow" aria-hidden>↓</span>
              <span className={`funnel__droppct ${s.pctOfPrev < 40 ? 'is-weak' : ''}`}>{s.pctOfPrev}% continúa</span>
              {i === worst && <span className="funnel__leak">mayor fuga</span>}
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
