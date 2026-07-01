'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

// next/image with a graceful fallback. The catalog references the final,
// structured photo paths (spec §7) — the photographer's high-res originals drop
// straight into those slots. Until then, a neutral SAHOS placeholder renders so
// preview builds never show a broken image.

type Props = Omit<ImageProps, 'onError'> & {
  /** short label shown on the placeholder, e.g. the piece name */
  placeholderLabel?: string;
  /** background tone for the placeholder */
  tone?: string;
};

export function SmartImage({ placeholderLabel, tone = '#F1EFEC', className, alt, ...props }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`smart-image-fallback ${className ?? ''}`}
        style={{ background: tone }}
        aria-label={alt || placeholderLabel}
        role="img"
      >
        <span className="smart-image-fallback__mark">SAHOS</span>
        {placeholderLabel && <span className="smart-image-fallback__label">{placeholderLabel}</span>}
      </div>
    );
  }

  return <Image alt={alt} {...props} className={className} onError={() => setFailed(true)} />;
}
