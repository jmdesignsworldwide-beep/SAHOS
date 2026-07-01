'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartImage } from '@/components/ui/SmartImage';
import { prefersReducedMotion } from '@/lib/gsap';

// 360 viewer (spec §6). Secondary to the model gallery. Drag to rotate through
// frames, auto-rotate toggle, angle dots. Frame-count agnostic: pass 3 frames
// (front/side/back, cross-faded) or a 24–36-frame turntable and the same drag
// logic scales via `images.length` — no refactor needed.

interface Frame {
  url: string;
  alt: string;
}

export function Product360({ images, label }: { images: Frame[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startIndex: number; dragging: boolean }>({
    startX: 0,
    startIndex: 0,
    dragging: false,
  });

  const n = images.length;
  const wrap = useCallback((i: number) => ((i % n) + n) % n, [n]);

  // Drag → rotate. Sensitivity scales with frame count so a 36-frame turntable
  // feels continuous while a 3-frame set steps cleanly.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || n <= 1) return;

    const pxPerFrame = Math.max(18, stage.clientWidth / Math.max(n, 8));

    const onDown = (clientX: number) => {
      dragState.current = { startX: clientX, startIndex: index, dragging: true };
      setAuto(false);
    };
    const onMove = (clientX: number) => {
      if (!dragState.current.dragging) return;
      const delta = clientX - dragState.current.startX;
      const steps = Math.round(delta / pxPerFrame);
      setIndex(wrap(dragState.current.startIndex + steps));
    };
    const onUp = () => {
      dragState.current.dragging = false;
    };

    const mDown = (e: MouseEvent) => onDown(e.clientX);
    const mMove = (e: MouseEvent) => onMove(e.clientX);
    const tStart = (e: TouchEvent) => onDown(e.touches[0].clientX);
    const tMove = (e: TouchEvent) => onMove(e.touches[0].clientX);

    stage.addEventListener('mousedown', mDown);
    window.addEventListener('mousemove', mMove);
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', tStart, { passive: true });
    stage.addEventListener('touchmove', tMove, { passive: true });
    stage.addEventListener('touchend', onUp);

    return () => {
      stage.removeEventListener('mousedown', mDown);
      window.removeEventListener('mousemove', mMove);
      window.removeEventListener('mouseup', onUp);
      stage.removeEventListener('touchstart', tStart);
      stage.removeEventListener('touchmove', tMove);
      stage.removeEventListener('touchend', onUp);
    };
  }, [index, n, wrap]);

  // Auto-rotate
  useEffect(() => {
    if (!auto || n <= 1 || prefersReducedMotion()) return;
    const speed = n > 12 ? 60 : 900; // fast for turntables, slow crossfade for 3-frame
    const id = setInterval(() => setIndex((i) => wrap(i + 1)), speed);
    return () => clearInterval(id);
  }, [auto, n, wrap]);

  if (n === 0) return null;

  return (
    <div className="viewer">
      <div className="viewer__stage" ref={stageRef} data-cursor="interactive" aria-label={`${label} 360 view`}>
        {images.map((frame, i) => (
          <div key={i} className="viewer__frame" style={{ opacity: i === index ? 1 : 0 }} aria-hidden={i !== index}>
            <SmartImage
              src={frame.url}
              alt={frame.alt}
              fill
              sizes="(max-width: 700px) 90vw, 620px"
              placeholderLabel={label}
              tone="#FAFAF9"
              // only prioritize the first frame
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      <div className="viewer__controls">
        <button className="viewer__auto" onClick={() => setAuto((a) => !a)}>
          {auto ? 'Stop' : 'Auto-rotate'}
        </button>
        <div className="viewer__dots" role="tablist">
          {images.map((_, i) => (
            <button
              key={i}
              className={`viewer__dot ${i === index ? 'is-active' : ''}`}
              onClick={() => {
                setAuto(false);
                setIndex(i);
              }}
              aria-label={`View angle ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <p className="viewer__hint">Drag to rotate</p>
    </div>
  );
}
