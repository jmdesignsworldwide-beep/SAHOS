import type { Config } from 'tailwindcss';

// SAHOS design tokens — spec §2. Radical restraint: pure white, discreet ink,
// wine used almost never. Do not add colors here without design approval.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        paper: '#FAFAF9',
        ink: '#1A1A18',
        black: '#000000',
        grey: '#767470',
        greyl: '#A5A29C',
        line: '#ECEBE8',
        wine: '#6B1F2A',
      },
      fontFamily: {
        // Jost — grotesque sans, 300–400. 95% of the type on the site.
        sans: ['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Cormorant — single couture touch for piece names / section titles.
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        luxe: '0.18em',
        wide: '0.08em',
      },
      transitionTimingFunction: {
        // Canonical easings — spec §3.5.
        'image': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        'curtain': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      maxWidth: {
        edge: '1680px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.9s cubic-bezier(0.2,0.7,0.2,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
