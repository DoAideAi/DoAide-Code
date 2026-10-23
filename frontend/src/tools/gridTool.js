// The CSS grid generator (/tools/css-grid-generator): column and row tracks, gaps and named
// template areas described as data, rendered to container + item CSS. All in the browser.

export const MIN_TRACKS = 1
export const MAX_TRACKS = 8

export const DEFAULT_GRID = {
  columns: ['1fr', '1fr', '1fr'],
  rows: ['auto', '1fr', 'auto'],
  columnGap: 16,
  rowGap: 16,
  areas: [
    ['header', 'header', 'header'],
    ['sidebar', 'main', 'main'],
    ['footer', 'footer', 'footer'],
  ],
}

export const TRACK_PRESETS = ['1fr', '2fr', 'auto', 'min-content', 'max-content', '100px', '200px', 'minmax(100px, 1fr)']

// A track size is a CSS length, fr, keyword, minmax()/fit-content(), or a % — rejects typos early.
const TRACK_RE = /^(auto|min-content|max-content|\d+(\.\d+)?(fr|px|%|rem|em|vw|vh|ch)|(minmax|fit-content)\(.+\))$/
export function isValidTrack(size) {
  return TRACK_RE.test(size.trim())
}

// Area names must be CSS identifiers; '.' marks an unnamed cell.
export function cleanAreaName(name) {
  const n = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '')
  return /^[a-z_]/.test(n) ? n : n ? `a-${n}` : '.'
}

// "1fr 1fr 1fr" → "repeat(3, 1fr)"; mixed tracks stay as written.
export function trackList(tracks) {
  const t = tracks.map((s) => s.trim())
  if (t.length > 1 && t.every((s) => s === t[0])) return `repeat(${t.length}, ${t[0]})`
  return t.join(' ')
}

// Resizes the areas matrix to rows × cols, keeping what still fits and filling with '.'.
export function resizeAreas(areas, rows, cols) {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => areas[r]?.[c] ?? '.'))
}

// Names used in the areas matrix, in first-seen order.
export function areaNames(areas) {
  return [...new Set(areas.flat().filter((n) => n !== '.'))]
}

// Names whose cells do not form a single filled rectangle — CSS rejects the whole template then.
export function invalidAreas(areas) {
  const bad = []
  for (const name of areaNames(areas)) {
    let r0 = Infinity, r1 = -1, c0 = Infinity, c1 = -1, count = 0
    areas.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== name) return
        count++
        r0 = Math.min(r0, r); r1 = Math.max(r1, r)
        c0 = Math.min(c0, c); c1 = Math.max(c1, c)
      }),
    )
    if (count !== (r1 - r0 + 1) * (c1 - c0 + 1)) bad.push(name)
  }
  return bad
}

// The container rule plus one rule per named area. Areas are left out while any is invalid.
export function gridCss({ columns, rows, columnGap, rowGap, areas }) {
  const lines = ['.grid {', '  display: grid;', `  grid-template-columns: ${trackList(columns)};`, `  grid-template-rows: ${trackList(rows)};`]
  lines.push(columnGap === rowGap ? `  gap: ${columnGap}px;` : `  gap: ${rowGap}px ${columnGap}px;`)
  const names = areaNames(areas)
  const useAreas = names.length > 0 && invalidAreas(areas).length === 0
  if (useAreas) {
    const width = Math.max(...areas.flat().map((n) => n.length))
    lines.push('  grid-template-areas:')
    areas.forEach((row, i) => {
      const cells = row.map((n) => n.padEnd(width)).join(' ').trimEnd()
      lines.push(`    "${cells}"${i === areas.length - 1 ? ';' : ''}`)
    })
  }
  lines.push('}')
  if (useAreas) for (const n of names) lines.push('', `.${n} { grid-area: ${n}; }`)
  return lines.join('\n')
}

// Matching HTML skeleton: one div per named area, or plain numbered cells without areas.
export function gridHtml({ columns, rows, areas }) {
  const names = invalidAreas(areas).length ? [] : areaNames(areas)
  const children = names.length
    ? names.map((n) => `  <div class="${n}">${n}</div>`)
    : Array.from({ length: columns.length * rows.length }, (_, i) => `  <div>${i + 1}</div>`)
  return ['<div class="grid">', ...children, '</div>'].join('\n')
}
