/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-card': 'var(--bg-card)',
        'bg-card-hover': 'var(--bg-card-hover)',
        'glass-border': 'var(--glass-border)',
        'glass-border-hover': 'var(--glass-border-hover)',
        red: 'var(--red)',
        'red-soft': 'var(--red-soft)',
        'red-glow': 'var(--red-glow)',
        white: 'var(--white)',
        bright: 'var(--bright)',
        text: 'var(--text)',
        label: 'var(--label)',
        muted: 'var(--muted)',
        subtle: 'var(--subtle)',
        green: 'var(--green)',
        amber: 'var(--amber)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
