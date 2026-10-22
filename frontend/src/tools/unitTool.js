// The developer unit converter (/tools/unit-converter): px/rem/em, bytes (decimal and binary),
// unix timestamps and color formats, all converted in the page as you type.

// --- px / rem / em ------------------------------------------------------------------------

// Round to at most 4 decimals without trailing zeros.
export function trim(n) {
  return String(Number(n.toFixed(4)))
}

// value in `unit` ('px' | 'rem' | 'em') at a root font size → { px, rem, em } as strings.
export function pxConvert(value, unit, base = 16) {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base <= 0) return null
  const px = unit === 'px' ? value : value * base
  return { px: trim(px), rem: trim(px / base), em: trim(px / base) }
}

// --- bytes --------------------------------------------------------------------------------

const DECIMAL = [['KB', 1e3], ['MB', 1e6], ['GB', 1e9], ['TB', 1e12]]
const BINARY = [['KiB', 2 ** 10], ['MiB', 2 ** 20], ['GiB', 2 ** 30], ['TiB', 2 ** 40]]
export const BYTE_UNITS = ['B', ...DECIMAL.map(([u]) => u), ...BINARY.map(([u]) => u)]

// value in `unit` → total bytes (null when the unit is unknown or the value isn't a number).
export function toBytes(value, unit) {
  if (!Number.isFinite(value)) return null
  const factor = unit === 'B' ? 1 : [...DECIMAL, ...BINARY].find(([u]) => u === unit)?.[1]
  return factor ? value * factor : null
}

// Total bytes → every unit, decimal first: [{ unit, value }].
export function byteRows(bytes) {
  const rows = [{ unit: 'B', value: trim(bytes) }]
  for (const [unit, factor] of [...DECIMAL, ...BINARY]) rows.push({ unit, value: trim(bytes / factor) })
  return rows
}

// --- timestamps ---------------------------------------------------------------------------

// 'now', unix seconds, unix milliseconds, or anything Date.parse reads (ISO above all) → ms.
export function parseTime(input, now = Date.now()) {
  const text = input.trim()
  if (!text || text.toLowerCase() === 'now') return { ms: now }
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const n = Number(text)
    // 13+ digits is clearly milliseconds; anything shorter reads as seconds.
    return { ms: Math.abs(n) >= 1e12 ? Math.round(n) : Math.round(n * 1000) }
  }
  const parsed = Date.parse(text)
  if (Number.isNaN(parsed)) return { error: 'Not a timestamp I recognize — try unix seconds, milliseconds or an ISO date.' }
  return { ms: parsed }
}

// --- colors -------------------------------------------------------------------------------

// '#rgb', '#rrggbb', 'rgb(r, g, b)' or 'hsl(h, s%, l%)' → { r, g, b } (0–255), or null.
export function parseColor(text) {
  const t = text.trim().toLowerCase()
  let m = t.match(/^#([0-9a-f]{3})$/)
  if (m) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16))
    return { r, g, b }
  }
  m = t.match(/^#([0-9a-f]{6})$/)
  if (m) {
    return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) }
  }
  m = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,[^)]*)?\)$/)
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number)
    return r <= 255 && g <= 255 && b <= 255 ? { r, g, b } : null
  }
  m = t.match(/^hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,[^)]*)?\)$/)
  if (m) return hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]))
  return null
}

export function hslToRgb(h, s, l) {
  if (s > 100 || l > 100) return null
  ;[s, l] = [s / 100, l / 100]
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

export function rgbToHsl({ r, g, b }) {
  ;[r, g, b] = [r / 255, g / 255, b / 255]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60)
  if (h < 0) h += 360
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

// Any supported color text → its three formats, or { error }.
export function colorFormats(text) {
  const rgb = parseColor(text)
  if (!rgb) return { error: 'Not a color I recognize — try #22c55e, rgb(34, 197, 94) or hsl(142, 71%, 45%).' }
  const hex = '#' + [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('')
  const { h, s, l } = rgbToHsl(rgb)
  return {
    hex,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${h}, ${s}%, ${l}%)`,
  }
}
