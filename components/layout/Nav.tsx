'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useBag } from '@/components/providers/BagProvider';
import { useLenis } from '@/components/providers/SmoothScrollProvider';

// Smart top navigation. Over the hero photo the whole nav is WHITE; over cream
// content (scrolled past the hero, or any page without one) it's dark on a soft
// bar, with a smooth colour transition.
//
// The switch is driven by an IntersectionObserver on the hero — NOT a scroll
// listener. That's the robust fix: it fires regardless of the scroll driver
// (Lenis intercepts native scroll, and window 'scroll' can be unreliable),
// handles resize/anchor jumps, and needs no polling. The state is seeded from
// the route (only the home has a hero) so there is no first-paint flash.
//
// On desktop the links sit inline. On phones/small tablets they collapse behind
// a hamburger (the burger + wordmark inherit the smart-header colour so they
// stay legible over the hero); tapping it opens a full-screen cream menu.
export function Nav() {
  const { count, open } = useBag();
  const pathname = usePathname();
  const { lenis } = useLenis();
  const [overHero, setOverHero] = useState(pathname === '/');
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the mobile menu whenever the route changes (link tap / back button).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // While the menu is open: freeze the smooth scroll behind it and allow Escape
  // to close it. Restored on close/unmount.
  useEffect(() => {
    if (!menuOpen) return;
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      lenis?.start();
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, lenis]);

  return (
    <>
      <header className={`nav ${overHero ? 'nav--hero' : 'nav--solid'}`}>
        <nav className="nav__inner">
          <div className="nav__group">
            <button
              className="nav__burger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <Link href="/#collection" className="nav__link nav__link--desk">
              Collection
            </Link>
            <Link href="/our-story" className="nav__link nav__link--desk">
              Our Story
            </Link>
          </div>

          <Link href="/" className="nav__brand" aria-label="SAHOS — home">
            <span className="nav__wordmark" aria-hidden />
          </Link>

          <div className="nav__group nav__group--end">
            <Link href="/contact" className="nav__link nav__link--desk">
              Contact
            </Link>
            <button className="nav__link nav__bag" onClick={open} aria-label="Open bag">
              Bag<span className="nav__bag-count">({count})</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen mobile menu. Inert on desktop (the burger never opens it). */}
      <div id="mobile-menu" className="navmenu" data-open={menuOpen ? '' : undefined} aria-hidden={!menuOpen}>
        <div className="navmenu__top">
          <Link href="/" className="nav__brand" aria-label="SAHOS — home" onClick={() => setMenuOpen(false)}>
            <span className="nav__wordmark" aria-hidden />
          </Link>
          <button className="navmenu__close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <span />
            <span />
          </button>
        </div>

        <nav className="navmenu__links">
          <Link href="/#collection" onClick={() => setMenuOpen(false)}>
            Collection
          </Link>
          <Link href="/our-story" onClick={() => setMenuOpen(false)}>
            Our Story
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </nav>
      </div>
    </>
  );
}
