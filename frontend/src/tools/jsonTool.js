// The JSON viewer's engine: parse with a useful error position, and a couple of stats for the
// header line. Everything stays in the page.

export const MAX_JSON_CHARS = 500_000

// { ok: true, value } or { ok: false, error, line, col } (line/col 1-based, null when the
// browser's message gives no position).
export function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (err) {
    const message = String(err.message || err)
    let line = null
    let col = null
    // V8: "... at position 12 (line 2 column 3)" or just "... at position 12"; Safari gives none.
    const lineCol = /line (\d+) column (\d+)/.exec(message)
    const position = /position (\d+)/.exec(message)
    if (lineCol) {
      line = Number(lineCol[1])
      col = Number(lineCol[2])
    } else if (position) {
      const before = text.slice(0, Number(position[1]))
      line = before.split('\n').length
      col = before.length - before.lastIndexOf('\n')
    }
    return { ok: false, error: message, line, col }
  }
}

// How big the parsed value is: { values, keys, depth }.
export function jsonStats(value) {
  let values = 0
  let keys = 0
  let depth = 0
  const walk = (v, d) => {
    values++
    depth = Math.max(depth, d)
    if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1))
    else if (v && typeof v === 'object') {
      keys += Object.keys(v).length
      Object.values(v).forEach((x) => walk(x, d + 1))
    }
  }
  walk(value, 1)
  return { values, keys, depth }
}

// JSONPath for a path of keys/indexes: $.users[0].name, $['odd key'].
export function jsonPath(path) {
  return '$' + path.map((k) => (typeof k === 'number' ? `[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `['${k.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`)).join('')
}

// The same path as JavaScript property access on a variable called `data`.
export function jsAccessor(path) {
  return 'data' + path.map((k) => (typeof k === 'number' ? `[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`)).join('')
}

export const pathKey = (path) => JSON.stringify(path)
export const MAX_MATCHES = 1000

// Paths whose key or scalar value contains the query (case-insensitive), plus every ancestor
// of a match so the tree can open down to it: { matches, open, count }.
export function searchJson(value, query) {
  const q = query.trim().toLowerCase()
  const matches = new Set()
  const open = new Set()
  if (!q) return { matches, open, count: 0 }
  let count = 0
  const walk = (v, path) => {
    if (count >= MAX_MATCHES) return
    const key = path.at(-1)
    const scalar = v === null || typeof v !== 'object'
    const hit = (typeof key === 'string' && key.toLowerCase().includes(q)) || (scalar && String(v).toLowerCase().includes(q))
    if (hit) {
      count++
      matches.add(pathKey(path))
      for (let i = 0; i < path.length; i++) open.add(pathKey(path.slice(0, i)))
    }
    if (!scalar) for (const [k, child] of Array.isArray(v) ? v.map((x, i) => [i, x]) : Object.entries(v)) walk(child, [...path, k])
  }
  walk(value, [])
  return { matches, open, count }
}
