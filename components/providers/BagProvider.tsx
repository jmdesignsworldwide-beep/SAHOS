'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { BagItem, Size } from '@/lib/types';

// Client-side bag state. Persisted to localStorage for continuity, but note:
// prices here are display-only — the server ALWAYS recomputes authoritative
// amounts against the DB before creating a PaymentIntent (spec §8.3).

interface BagState {
  items: BagItem[];
}

type Action =
  | { type: 'add'; item: BagItem }
  | { type: 'remove'; slug: string; size: Size }
  | { type: 'qty'; slug: string; size: Size; qty: number }
  | { type: 'clear' }
  | { type: 'hydrate'; items: BagItem[] };

const STORAGE_KEY = 'sahos_bag_v1';

function reducer(state: BagState, action: Action): BagState {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items };
    case 'add': {
      const idx = state.items.findIndex((i) => i.slug === action.item.slug && i.size === action.item.size);
      if (idx >= 0) {
        const items = [...state.items];
        items[idx] = { ...items[idx], qty: items[idx].qty + action.item.qty };
        return { items };
      }
      return { items: [...state.items, action.item] };
    }
    case 'remove':
      return { items: state.items.filter((i) => !(i.slug === action.slug && i.size === action.size)) };
    case 'qty':
      return {
        items: state.items
          .map((i) => (i.slug === action.slug && i.size === action.size ? { ...i, qty: Math.max(1, action.qty) } : i))
          .filter((i) => i.qty > 0),
      };
    case 'clear':
      return { items: [] };
    default:
      return state;
  }
}

interface BagContextValue {
  items: BagItem[];
  count: number;
  subtotalCents: number | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: BagItem) => void;
  remove: (slug: string, size: Size) => void;
  setQty: (slug: string, size: Size, qty: number) => void;
  clear: () => void;
}

const BagContext = createContext<BagContextValue | null>(null);

export function useBag(): BagContextValue {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error('useBag must be used within BagProvider');
  return ctx;
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const [isOpen, setOpen] = useState(false);

  // hydrate from storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: 'hydrate', items: JSON.parse(raw) as BagItem[] });
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      /* storage may be unavailable */
    }
  }, [state.items]);

  const value = useMemo<BagContextValue>(() => {
    const count = state.items.reduce((n, i) => n + i.qty, 0);
    const anyUnpriced = state.items.some((i) => i.priceCents == null);
    const subtotalCents = anyUnpriced
      ? null
      : state.items.reduce((sum, i) => sum + (i.priceCents ?? 0) * i.qty, 0);
    return {
      items: state.items,
      count,
      subtotalCents,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add: (item) => {
        dispatch({ type: 'add', item });
        setOpen(true);
      },
      remove: (slug, size) => dispatch({ type: 'remove', slug, size }),
      setQty: (slug, size, qty) => dispatch({ type: 'qty', slug, size, qty }),
      clear: () => dispatch({ type: 'clear' }),
    };
  }, [state.items, isOpen]);

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}
