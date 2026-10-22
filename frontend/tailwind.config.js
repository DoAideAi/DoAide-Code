/** @type {import('tailwindcss').Config} */

// Themed colors come from CSS variables (index.css), so one class works in dark and light mode.
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`
const ZINC = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The page background, hairline borders and dark tints (code blocks, chips).
        surface: themed('surface'),
        line: themed('line'),
        shade: themed('shade'),
        zinc: Object.fromEntries(ZINC.map((n) => [n, themed(`zinc-${n}`)])),
        // Pale accent text: dark-mode shades that would wash out on white.
        red: { 200: themed('red-200'), 300: themed('red-300') },
        amber: { 300: themed('amber-300') },
        sky: { 200: themed('sky-200'), 300: themed('sky-300') },
        emerald: { 300: themed('emerald-300') },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
