// Minimal, dependency-free input validation (spec §8.4). Every server endpoint
// validates and narrows untrusted input here before it touches the DB/Stripe.

import type { Size } from '@/lib/types';

const SIZES: Size[] = ['XS', 'S', 'M', 'L'];
const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CleanLine {
  slug: string;
  size: Size;
  qty: number;
}

export function parseBag(input: unknown): CleanLine[] {
  if (typeof input !== 'object' || input === null) throw new Error('Invalid payload');
  const items = (input as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) throw new Error('Bag is empty');
  if (items.length > 20) throw new Error('Too many items');

  return items.map((raw) => {
    if (typeof raw !== 'object' || raw === null) throw new Error('Invalid item');
    const { slug, size, qty } = raw as Record<string, unknown>;
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error('Invalid slug');
    if (typeof size !== 'string' || !SIZES.includes(size as Size)) throw new Error('Invalid size');
    const q = Number(qty);
    if (!Number.isInteger(q) || q < 1 || q > 10) throw new Error('Invalid quantity');
    return { slug, size: size as Size, qty: q };
  });
}

export function parseEmail(input: unknown): string {
  if (typeof input !== 'object' || input === null) throw new Error('Invalid payload');
  const email = (input as { email?: unknown }).email;
  if (typeof email !== 'string') throw new Error('Invalid email');
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254 || !EMAIL_RE.test(trimmed)) throw new Error('Invalid email');
  return trimmed;
}

export interface CleanContact {
  name: string;
  email: string;
  message: string;
}

/** Drop NUL bytes (rejected by Postgres text) + trim. React escapes on render,
 *  so no further stripping is needed to store/display the message safely. */
function sanitizeText(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/\0/g, '').trim();
}

// Contact-us message (customer service). Server-side validated + sanitized
// before it ever reaches the DB. Name is optional; email + message required.
export function parseContact(input: unknown): CleanContact {
  if (typeof input !== 'object' || input === null) throw new Error('Invalid payload');
  const { name, email, message } = input as Record<string, unknown>;

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) throw new Error('Invalid email');

  const cleanMessage = typeof message === 'string' ? sanitizeText(message) : '';
  if (cleanMessage.length < 2) throw new Error('Message is too short');
  if (cleanMessage.length > 4000) throw new Error('Message is too long');

  const cleanName = typeof name === 'string' ? sanitizeText(name).slice(0, 120) : '';

  return { name: cleanName, email: cleanEmail, message: cleanMessage };
}
