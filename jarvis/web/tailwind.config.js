/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f17',
        panel: '#111826',
        line: '#1e2a3a',
        text: '#d7e2f0',
        muted: '#7c8aa0',
        accent: '#4fc3f7',
        ok: '#2ecc71',
        err: '#e74c3c',
      },
      fontFamily: {
        mono: ['Cascadia Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
