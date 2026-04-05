import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        foreground: '#F5F7FA',
        'surface-primary': '#111827',
        'surface-secondary': '#1A202C',
        'text-primary': '#F5F7FA',
        'text-secondary': '#B0BAC9',
        'accent-blue': '#3B82F6',
        'accent-emerald': '#10B981',
        'accent-amber': '#F59E0B',
        'accent-red': '#EF4444',
        'border-color': '#2D3748',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
