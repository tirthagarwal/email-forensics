/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#080d16',
          surface: '#0f1929',
          card:    '#131f30',
          muted:   '#1a2840',
          border:  '#1e3050',
        },
        text: {
          primary:   '#f0f6ff',
          secondary: '#8da4bf',
          muted:     '#4a6480',
        },
        green:  { DEFAULT: '#22d3a6', dark: '#0d9e7a', bg: 'rgba(34,211,166,.1)' },
        amber:  { DEFAULT: '#f59e0b', dark: '#b45309', bg: 'rgba(245,158,11,.1)' },
        red:    { DEFAULT: '#f43f5e', dark: '#be123c', bg: 'rgba(244,63,94,.1)'  },
        blue:   { DEFAULT: '#38bdf8', dark: '#0369a1', bg: 'rgba(56,189,248,.1)' },
        purple: { DEFAULT: '#a78bfa', dark: '#7c3aed', bg: 'rgba(167,139,250,.1)' },
        cyber:  { DEFAULT: '#06d6e0', glow: 'rgba(6,214,224,.25)' },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan':       'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
