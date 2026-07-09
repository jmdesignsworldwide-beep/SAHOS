'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FadeUp } from '@/components/motion/Reveal';

// Minimal newsletter + footer (spec §4.1). Newsletter posts to a rate-limited,
// server-validated endpoint.

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'done' : 'error');
      if (res.ok) setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <footer className="footer" id="newsletter">
      <div className="footer__news">
        <FadeUp as="p" className="footer__eyebrow">
          Newsletter
        </FadeUp>
        <FadeUp as="h2" className="footer__headline" delay={0.05}>
          Soft glamour, made to be seen.
        </FadeUp>
        <form className="footer__form" onSubmit={subscribe}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            aria-label="Email address"
            className="footer__input"
            autoComplete="email"
          />
          <button type="submit" className="footer__submit" disabled={status === 'loading'}>
            {status === 'done' ? 'Thank you' : status === 'loading' ? '…' : 'Sign up'}
          </button>
        </form>
        {status === 'error' && <p className="footer__msg">Please enter a valid email.</p>}
      </div>

      <div className="footer__grid">
        <div>
          <span className="footer__brand">SAHOS</span>
          <p className="footer__tag">The Marilyn Collection</p>
        </div>
        <nav className="footer__links">
          <Link href="/#collection">Collection</Link>
          <Link href="/our-story">Our Story</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="footer__legal">
          <p>© {2026} SAHOS. All rights reserved.</p>
          <p>Made to be seen.</p>
        </div>
      </div>
    </footer>
  );
}
