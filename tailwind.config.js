/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './main.jsx', './app.jsx'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Titan One"', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
