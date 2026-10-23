// The CSV converter (/tools/csv-to-json): an RFC 4180 parser with delimiter detection, and
// writers for JSON, keyed JSON, SQL (CREATE TABLE + INSERT) and back from JSON to CSV.

export const DELIMITERS = [
  [',', 'Comma'],
  [';', 'Semicolon'],
  ['\t', 'Tab'],
  ['|', 'Pipe'],
]

// The delimiter that splits the first lines most consistently (outside quotes).
export function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10)
  let best = ','
  let bestScore = 0
  for (const [d] of DELIMITERS) {
    const counts = lines.map((l) => countOutsideQuotes(l, d))
    if (!counts.length || counts[0] === 0) continue
    const same = counts.filter((c) => c === counts[0]).length
    const score = same * 100 + counts[0]
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

function countOutsideQuotes(line, d) {
  let n = 0
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === d && !quoted) n++
  }
  return n
}

// CSV text → rows of strings. Quoted fields may hold the delimiter, newlines and "" escapes.
export function parseCsv(text, delimiter = ',') {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let i = 0
  const src = text.replace(/^﻿/, '')
  while (i < src.length) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
      } else field += ch
      i++
      continue
    }
    if (ch === '"' && field === '') quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
    i++
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

// '42' → 42, 'true' → true, '' → null; anything else stays a string. Leading-zero codes like
// '007' and huge integers stay strings so nothing is silently changed.
export function inferValue(s) {
  const t = s.trim()
  if (t === '') return null
  if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true'
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(t)) {
    const n = Number(t)
    if (Number.isFinite(n) && (!Number.isInteger(n) || Number.isSafeInteger(n))) return n
  }
  return s
}

// Header names made unique and non-empty: ['id', '', 'id'] → ['id', 'column_2', 'id_2'].
export function uniqueHeaders(names) {
  const seen = new Map()
  return names.map((raw, i) => {
    const base = raw.trim() || `column_${i + 1}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}_${n}`
  })
}

// rows → { headers, records } where records are arrays of (typed) cells, padded to width.
export function table(rows, { header = true, infer = true } = {}) {
  const width = Math.max(0, ...rows.map((r) => r.length))
  const headers = header && rows.length ? uniqueHeaders([...rows[0], ...Array(width - rows[0].length).fill('')]) : Array.from({ length: width }, (_, i) => `column_${i + 1}`)
  const body = header ? rows.slice(1) : rows
  const records = body.map((r) => Array.from({ length: width }, (_, i) => (infer ? inferValue(r[i] ?? '') : (r[i] ?? ''))))
  return { headers, records }
}

export function toJson({ headers, records }, { header = true, indent = 2 } = {}) {
  const data = header ? records.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))) : records
  return JSON.stringify(data, null, indent)
}

// { [row[key]]: { ...rest } } — later rows with the same key overwrite earlier ones.
export function toKeyedJson({ headers, records }, key, indent = 2) {
  const k = Math.max(0, headers.indexOf(key))
  const out = {}
  for (const r of records) {
    out[String(r[k])] = Object.fromEntries(headers.map((h, i) => [h, r[i]]).filter((_, i) => i !== k))
  }
  return JSON.stringify(out, null, indent)
}

// SQL identifier: snake_case, double-quoted when it still isn't a plain word.
export function sqlIdent(name) {
  const s = name.trim().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '') || 'col'
  return /^[a-z_][a-z0-9_]*$/i.test(s) ? s : `"${s.replace(/"/g, '""')}"`
}

// The narrowest SQL type that fits every non-null value in column i.
export function columnType(records, i) {
  const vals = records.map((r) => r[i]).filter((v) => v !== null && v !== '')
  if (!vals.length) return 'TEXT'
  if (vals.every((v) => typeof v === 'boolean')) return 'BOOLEAN'
  if (vals.every((v) => typeof v === 'number' && Number.isInteger(v))) return 'INTEGER'
  if (vals.every((v) => typeof v === 'number')) return 'REAL'
  return 'TEXT'
}

export function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

// CREATE TABLE plus INSERTs of up to `batch` rows each.
export function toSql({ headers, records }, { tableName = 'my_table', create = true, batch = 100 } = {}) {
  const name = sqlIdent(tableName)
  const cols = headers.map(sqlIdent)
  const parts = []
  if (create) {
    parts.push(`CREATE TABLE ${name} (\n${cols.map((c, i) => `  ${c} ${columnType(records, i)}`).join(',\n')}\n);`)
  }
  for (let i = 0; i < records.length; i += batch) {
    const chunk = records.slice(i, i + batch)
    parts.push(`INSERT INTO ${name} (${cols.join(', ')}) VALUES\n${chunk.map((r) => `  (${r.map(sqlValue).join(', ')})`).join(',\n')};`)
  }
  return parts.join('\n\n')
}

// One CSV cell, quoted when it holds the delimiter, a quote, a newline or edge spaces.
export function csvCell(v, delimiter = ',') {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.includes(delimiter) || /["\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s
}

// JSON text (array of objects or arrays, or one object) → CSV. Throws on bad input.
export function jsonToCsv(text, delimiter = ',') {
  let data = JSON.parse(text)
  if (!Array.isArray(data)) data = [data]
  if (!data.length) return ''
  if (data.every(Array.isArray)) return data.map((r) => r.map((v) => csvCell(v, delimiter)).join(delimiter)).join('\n')
  if (!data.every((r) => r && typeof r === 'object' && !Array.isArray(r))) throw new Error('Expected an array of objects or an array of arrays.')
  const keys = []
  for (const r of data) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k)
  const lines = [keys.map((k) => csvCell(k, delimiter)).join(delimiter)]
  for (const r of data) lines.push(keys.map((k) => csvCell(r[k], delimiter)).join(delimiter))
  return lines.join('\n')
}
