// The .env diff (/tools/env-diff): a dotenv-style parser (export, quotes, multi-line values,
// comments), a key-by-key comparison of two files, masking, and .env.example generation.

const KEY = /^[A-Za-z_][A-Za-z0-9_.-]*$/

// Text → { vars: Map(key → { value, line }), duplicates: [{ key, line }], errors: [{ line, text }] }.
// Later duplicates win, as with dotenv.
export function parseEnv(text) {
  const vars = new Map()
  const duplicates = []
  const errors = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const raw = lines[i]
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const body = line.replace(/^export\s+/, '')
    const eq = body.indexOf('=')
    if (eq < 0) {
      errors.push({ line: lineNo, text: `Missing “=”: ${line}` })
      continue
    }
    const key = body.slice(0, eq).trim()
    if (!KEY.test(key)) {
      errors.push({ line: lineNo, text: `Invalid key name “${key}”` })
      continue
    }
    let rest = body.slice(eq + 1).trimStart()
    let value
    const q = rest[0]
    if (q === '"' || q === "'" || q === '`') {
      // Quoted: may span lines until the closing quote.
      let acc = rest.slice(1)
      let end = findClose(acc, q)
      while (end < 0 && i + 1 < lines.length) {
        i++
        acc += `\n${lines[i]}`
        end = findClose(acc, q)
      }
      if (end < 0) {
        errors.push({ line: lineNo, text: `Unclosed ${q} quote for ${key}` })
        continue
      }
      value = acc.slice(0, end)
      if (q === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    } else {
      // Unquoted: an inline comment starts at whitespace + #.
      const hash = rest.search(/\s#/)
      value = (hash >= 0 ? rest.slice(0, hash) : rest).trim()
    }
    if (vars.has(key)) duplicates.push({ key, line: lineNo, first: vars.get(key).line })
    vars.set(key, { value, line: lineNo })
  }
  return { vars, duplicates, errors }
}

function findClose(s, q) {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && q === '"') i++
    else if (s[i] === q) return i
  }
  return -1
}

export const CATEGORIES = [
  ['missing', 'Missing on the right'],
  ['extra', 'Only on the right'],
  ['changed', 'Different values'],
  ['same', 'Identical'],
]

// Rows for every key in either file, left file order first: { key, status, left, right, empty }.
export function diffEnv(leftText, rightText) {
  const left = parseEnv(leftText)
  const right = parseEnv(rightText)
  const rows = []
  const keys = [...left.vars.keys(), ...[...right.vars.keys()].filter((k) => !left.vars.has(k))]
  for (const key of keys) {
    const l = left.vars.get(key)
    const r = right.vars.get(key)
    const status = !r ? 'missing' : !l ? 'extra' : l.value === r.value ? 'same' : 'changed'
    rows.push({ key, status, left: l ?? null, right: r ?? null, empty: Boolean((l && l.value === '') || (r && r.value === '')) })
  }
  const counts = Object.fromEntries(CATEGORIES.map(([c]) => [c, rows.filter((r) => r.status === c).length]))
  return { rows, counts, left, right }
}

// 'sk_live_abc123' → 'sk_•••••' (first 3 characters, then dots); short values are fully masked.
export function mask(value) {
  if (value === '') return ''
  if (value.length <= 4) return '•'.repeat(value.length)
  return `${value.slice(0, 3)}${'•'.repeat(Math.min(8, value.length - 3))}`
}

// The file with every value blanked; comments, blank lines, export and order kept.
export function toExample(text) {
  const out = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const m = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_.-]*)(\s*)=(\s*)(.*)$/.exec(raw)
    if (!m || raw.trim().startsWith('#')) {
      out.push(raw)
      continue
    }
    const rest = m[5]
    const q = rest[0]
    // Skip the continuation lines of a multi-line quoted value.
    if ((q === '"' || q === "'" || q === '`') && findClose(rest.slice(1), q) < 0) {
      while (i + 1 < lines.length && findClose(lines[i + 1], q) < 0) i++
      i++
    }
    const comment = q === '"' || q === "'" || q === '`' ? '' : (/\s#.*$/.exec(rest)?.[0] ?? '')
    out.push(`${m[1]}${m[2]}=${comment}`)
  }
  return out.join('\n')
}
