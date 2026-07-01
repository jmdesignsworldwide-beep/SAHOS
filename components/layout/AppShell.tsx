'use client';

import { type ReactNode } from 'react';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { BagProvider } from '@/components/providers/BagProvider';
import { PageTransition } from '@/components/providers/PageTransition';
import { MagneticCursor } from '@/components/motion/MagneticCursor';
import { Nav } from '@/components/layout/Nav';
import { BagDrawer } from '@/components/bag/BagDrawer';

// Composes every global client concern in the right order:
// smooth scroll → bag state → cursor + nav + drawer + page-transition wrapper.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SmoothScrollProvider>
      <BagProvider>
        <MagneticCursor />
        <Nav />
        <BagDrawer />
        <PageTransition>{children}</PageTransition>
      </BagProvider>
    </SmoothScrollProvider>
  );
}
