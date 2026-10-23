// Placeholder images: an SVG built as text (so it can be copied or inlined) and, in the page,
// the same design drawn on a canvas for PNG/JPEG/WebP downloads.

export const MAX_SIDE = 4000

export const PRESETS = [
  ['Open Graph', 1200, 630],
  ['Twitter card', 1200, 675],
  ['Instagram post', 1080, 1080],
  ['Story / Reel', 1080, 1920],
  ['HD 1080p', 1920, 1080],
  ['YouTube thumb', 1280, 720],
  ['Avatar', 150, 150],
  ['Banner 728×90', 728, 90],
  ['MPU 300×250', 300, 250],
  ['Skyscraper', 160, 600],
  ['Card 4:3', 800, 600],
  ['Hero 3:1', 1500, 500],
]

export const FONTS = {
  sans: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  serif: 'Georgia, Times New Roman, serif',
}

export function clampSide(n) {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(MAX_SIDE, Math.max(1, v)) : 1
}

// "1200x630", "1200×630", "1200 * 630" or a single "300" (a square); null otherwise.
export function parseSize(text) {
  const m = /^\s*(\d{1,5})\s*(?:[x×*,]\s*(\d{1,5}))?\s*$/i.exec(text)
  if (!m) return null
  return { width: clampSide(m[1]), height: clampSide(m[2] ?? m[1]) }
}

export function normalizeHex(text) {
  const t = text.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(t)) return '#' + t.split('').map((c) => c + c).join('').toLowerCase()
  if (/^[0-9a-f]{6}$/i.test(t)) return '#' + t.toLowerCase()
  return null
}

// Black or white, whichever reads better on the background (WCAG relative luminance).
export function autoTextColor(bg) {
  const hex = normalizeHex(bg) ?? '#cccccc'
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.179 ? '#1f2937' : '#f9fafb'
}

export const defaultLabel = (w, h) => `${w} × ${h}`

// A font size that fits the longest line in about 80% of the width and 50% of the height.
export function fitFontSize(width, height, text) {
  const lines = text.split('\n')
  const longest = Math.max(1, ...lines.map((l) => l.length))
  const byWidth = (width * 0.8) / (longest * 0.6)
  const byHeight = (height * 0.5) / (lines.length * 1.2)
  return Math.max(6, Math.floor(Math.min(byWidth, byHeight, 400)))
}

const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])

// The placeholder as an SVG document.
export function buildSvg({ width, height, bg, fg, text, font = 'sans', fontSize, radius = 0, border = false }) {
  const label = text ?? defaultLabel(width, height)
  const size = fontSize || fitFontSize(width, height, label)
  const lines = label.split('\n')
  const lineHeight = size * 1.2
  const firstY = height / 2 - ((lines.length - 1) * lineHeight) / 2
  const tspans = lines
    .map((l, i) => `<tspan x="50%" y="${+(firstY + i * lineHeight).toFixed(1)}">${escapeXml(l)}</tspan>`)
    .join('')
  const frame = border ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="none" stroke="${fg}" stroke-opacity="0.35"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" rx="${radius}" fill="${bg}"/>${frame}` +
    (label.trim()
      ? `<text fill="${fg}" font-family="${FONTS[font]}" font-size="${size}" font-weight="600" text-anchor="middle" dominant-baseline="central">${tspans}</text>`
      : '') +
    '</svg>'
  )
}

export function svgDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
