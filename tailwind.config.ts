import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDFBF5',
          100: '#FAF5EA',
          200: '#F3E5AB',
          300: '#EBD171',
          400: '#D4AF37',
          500: '#C5A017',
          DEFAULT: '#C5A017',
          600: '#B38B00',
          dark: '#B38B00',
          700: '#8F6F00',
          800: '#6B5300',
          900: '#473700',
          950: '#241C00',
        },
        dark: {
          950: '#0A0D14',
          900: '#121620',
          800: '#1E2330',
          700: '#2A3143',
          600: '#394259',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': `radial-gradient(ellipse at top, #1E2330, transparent), radial-gradient(ellipse at bottom, #0A0D14, #121620)`,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { opacity: '.8', transform: 'scale(1.02)', filter: 'brightness(1.2)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          'from': { backgroundPosition: '200% 0' },
          'to': { backgroundPosition: '-200% 0' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
