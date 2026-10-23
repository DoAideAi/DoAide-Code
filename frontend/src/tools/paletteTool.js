// The color palette generator (/tools/color-palette): harmonious five-color palettes from one
// base color by color-wheel rules, plus contrast checks and exports. All in the browser.

// Each scheme is five [hue offset°, lightness delta %] pairs applied to the base color.
export const SCHEMES = {
  complementary: { label: 'Complementary', steps: [[0, 0], [0, -18], [0, 22], [180, 0], [180, 22]] },
  analogous: { label: 'Analogous', steps: [[-40, 0], [-20, 0], [0, 0], [20, 0], [40, 0]] },
  triadic: { label: 'Triadic', steps: [[0, 0], [120, 0], [240, 0], [0, 25], [120, 25]] },
  'split-complementary': { label: 'Split complementary', steps: [[0, 0], [150, 0], [210, 0], [150, 22], [210, 22]] },
  tetradic: { label: 'Tetradic (square)', steps: [[0, 0], [90, 0], [180, 0], [270, 0], [0, 25]] },
  monochromatic: { label: 'Monochromatic', steps: [[0, -32], [0, -16], [0, 0], [0, 16], [0, 32]] },
}

export function normalizeHex(input) {
  let h = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(h)) h = [...h].map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

// [h 0–360, s 0–100, l 0–100]
export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

export function hslToHex([h, s, l]) {
  const hue = ((h % 360) + 360) % 360
  const sat = s / 100
  const lig = l / 100
  const k = (n) => (n + hue / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255])
}

// Five hex colors for the scheme; lightness is clamped so no swatch collapses to pure black/white.
export function palette(baseHex, scheme) {
  const [h, s, l] = hexToHsl(baseHex)
  return SCHEMES[scheme].steps.map(([dh, dl]) => (dh === 0 && dl === 0 ? baseHex : hslToHex([h + dh, s, Math.min(92, Math.max(8, l + dl))])))
}

// WCAG relative luminance and contrast ratio.
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Black or white, whichever reads better on the swatch.
export function textColorFor(hex) {
  return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#000000' : '#ffffff'
}

export function randomHex(rand = Math.random) {
  return hslToHex([rand() * 360, 55 + rand() * 30, 40 + rand() * 20])
}

export const EXPORTS = {
  css: (colors) => `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`,
  scss: (colors) => colors.map((c, i) => `$color-${i + 1}: ${c};`).join('\n'),
  tailwind: (colors) => `colors: {\n  palette: {\n${colors.map((c, i) => `    ${(i + 1) * 100}: '${c}',`).join('\n')}\n  },\n},`,
  json: (colors) => JSON.stringify(colors, null, 2),
}
