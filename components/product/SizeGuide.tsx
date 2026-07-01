'use client';

import { AnimatePresence, motion } from 'framer-motion';

// Size Guide modal (spec §5). Measurements are placeholders in inches — replace
// each row with the real table from the catalog PDF before launch (TODO).
const ROWS = [
  { size: 'XS', bust: '31–32', waist: '24–25', hip: '34–35' },
  { size: 'S', bust: '33–34', waist: '26–27', hip: '36–37' },
  { size: 'M', bust: '35–36', waist: '28–29', hip: '38–39' },
  { size: 'L', bust: '37–39', waist: '30–32', hip: '40–42' },
];

export function SizeGuide({ open, onClose, pieceName }: { open: boolean; onClose: () => void; pieceName: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-label={`${pieceName} size guide`}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h3 className="modal__title">Size guide — {pieceName}</h3>
              <button className="bag-close" onClick={onClose}>
                Close
              </button>
            </div>
            <table className="size-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Bust (in)</th>
                  <th>Waist (in)</th>
                  <th>Hip (in)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.size}>
                    <td>{r.size}</td>
                    <td>{r.bust}</td>
                    <td>{r.waist}</td>
                    <td>{r.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: '#a5a29c' }}>
              Measurements are indicative. Final guide per piece from the atelier to follow.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
