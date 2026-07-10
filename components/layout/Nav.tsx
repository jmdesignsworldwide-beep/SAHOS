'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useBag } from '@/components/providers/BagProvider';

// Minimal top navigation. Transparent over the hero, then a hairline-bordered
// white bar once scrolled. The bag count sits at the right.

export function Nav() {
  const { count, open } = useBag();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'nav--solid' : ''}`}>
      <nav className="nav__inner">
        <div className="nav__group">
          <Link href="/#collection" className="nav__link">
            Collection
          </Link>
          <Link href="/our-story" className="nav__link">
            Our Story
          </Link>
        </div>

        <Link href="/" className="nav__brand" aria-label="SAHOS — home">
          <span className="nav__wordmark" aria-hidden />
        </Link>

        <div className="nav__group nav__group--end">
          <Link href="/contact" className="nav__link nav__link--hide-sm">
            Contact
          </Link>
          <button className="nav__link nav__bag" onClick={open} aria-label="Open bag">
            Bag<span className="nav__bag-count">({count})</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
