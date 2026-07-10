'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useBag } from '@/components/providers/BagProvider';

// Smart top navigation. Over the hero photo the whole nav is WHITE; over cream
// content (scrolled past the hero, or any page without one) it's dark on a soft
// bar, with a smooth colour transition.
//
// The switch is driven by an IntersectionObserver on the hero — NOT a scroll
// listener. That's the robust fix: it fires regardless of the scroll driver
// (Lenis intercepts native scroll, and window 'scroll' can be unreliable),
// handles resize/anchor jumps, and needs no polling. The state is seeded from
// the route (only the home has a hero) so there is no first-paint flash.
export function Nav() {
  const { count, open } = useBag();
  const pathname = usePathname();
  const [overHero, setOverHero] = useState(pathname === '/');

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('.hero');
    if (!hero) {
      setOverHero(false); // no hero on this page → dark nav over cream
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      // Shrink the root by ~the nav height so the nav flips to dark exactly as
      // the hero stops covering the fixed bar and cream slides underneath.
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  return (
    <header className={`nav ${overHero ? 'nav--hero' : 'nav--solid'}`}>
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
