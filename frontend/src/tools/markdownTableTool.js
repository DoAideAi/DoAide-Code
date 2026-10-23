// The markdown table generator (/tools/markdown-table): a grid of cells plus per-column
// alignment rendered to a padded GitHub-flavored markdown table, and CSV/TSV/markdown import.

export const MAX_COLS = 12
export const MAX_ROWS = 100
export const ALIGNS = ['none', 'left', 'center', 'right']

// Pipes would end the cell and newlines the row; both are escaped for GFM.
export function escapeCell(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim()
}

function divider(align, width) {
  const w = Math.max(3, width)
  if (align === 'left') return `:${'-'.repeat(w - 1)}`
  if (align === 'right') return `${'-'.repeat(w - 1)}:`
  if (align === 'center') return `:${'-'.repeat(w - 2)}:`
  return '-'.repeat(w)
}

function pad(text, width, align) {
  const gap = width - text.length
  if (gap <= 0) return text
  if (align === 'right') return ' '.repeat(gap) + text
  if (align === 'center') return ' '.repeat(Math.floor(gap / 2)) + text + ' '.repeat(Math.ceil(gap / 2))
  return text + ' '.repeat(gap)
}

// table: { header: string[], rows: string[][], aligns: string[] }. `compact` skips the padding.
export function toMarkdown({ header, rows, aligns }, { compact = false } = {}) {
  const all = [header, ...rows].map((r) => header.map((_, i) => escapeCell(r[i] ?? '')))
  const widths = header.map((_, i) => (compact ? 3 : Math.max(3, ...all.map((r) => r[i].length))))
  const line = (cells) => `| ${cells.map((c, i) => (compact ? c : pad(c, widths[i], aligns[i]))).join(' | ')} |`
  return [line(all[0]), `| ${widths.map((w, i) => divider(aligns[i], w)).join(' | ')} |`, ...all.slice(1).map(line)].join('\n')
}

// Splits one CSV line, honouring "quoted, cells" and "" escapes.
function splitCsvLine(line, sep) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"' && cur === '') quoted = true
    else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function alignFromDivider(cell) {
  const c = cell.trim()
  const l = c.startsWith(':')
  const r = c.endsWith(':')
  return l && r ? 'center' : l ? 'left' : r ? 'right' : 'none'
}

// Parses pasted markdown table, TSV (from a spreadsheet) or CSV into a table; null if empty.
export function parseTable(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return null
  let grid
  let aligns = null
  if (lines[0].trim().startsWith('|')) {
    const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
    grid = lines.map(cells)
    if (grid[1] && grid[1].every((c) => /^:?-+:?$/.test(c))) {
      aligns = grid[1].map(alignFromDivider)
      grid.splice(1, 1)
    }
  } else {
    const sep = lines[0].includes('\t') ? '\t' : ','
    grid = lines.map((l) => splitCsvLine(l, sep))
  }
  const cols = Math.min(MAX_COLS, Math.max(...grid.map((r) => r.length)))
  const fit = (r) => Array.from({ length: cols }, (_, i) => r[i] ?? '')
  return {
    header: fit(grid[0]),
    rows: grid.slice(1, MAX_ROWS + 1).map(fit),
    aligns: Array.from({ length: cols }, (_, i) => aligns?.[i] ?? 'none'),
  }
}

export const DEFAULT_TABLE = {
  header: ['Tool', 'Purpose', 'Free'],
  rows: [
    ['Formatter', 'Pretty-print code', 'Yes'],
    ['Regex tester', 'Test patterns live', 'Yes'],
  ],
  aligns: ['left', 'none', 'center'],
}
