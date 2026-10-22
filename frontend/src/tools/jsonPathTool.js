// The JSON path finder (/tools/json-path-finder): parse JSON and turn any value's location into
// a JSONPath expression and a JavaScript accessor. Runs in the page.

import { parseJson } from './jsonTool.js'

export const MAX_JSONPATH_CHARS = 300_000
// Rendering stops after this many nodes so a huge document cannot freeze the page.
export const MAX_NODES = 3000

// Parsing with a one-line error the page can show; position comes from jsonTool when the
// browser's message has one.
export function parseForPaths(text) {
  const res = parseJson(text)
  if (res.ok) return { value: res.value }
  const where = res.line && !/line \d+/.test(res.error) ? ` (line ${res.line}, column ${res.col})` : ''
  return { error: `Not valid JSON: ${res.error}${where}` }
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const quote = (key) => `'${String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

// A key appended to a JSONPath ($.users[0].name) and to a JS accessor (data.users[0].name).
export function appendKey(paths, key) {
  if (typeof key === 'number') return { jsonPath: `${paths.jsonPath}[${key}]`, js: `${paths.js}[${key}]` }
  if (IDENT.test(key)) return { jsonPath: `${paths.jsonPath}.${key}`, js: `${paths.js}.${key}` }
  return { jsonPath: `${paths.jsonPath}[${quote(key)}]`, js: `${paths.js}[${quote(key)}]` }
}

export const ROOT_PATHS = { jsonPath: '$', js: 'data' }

// One screenful of a leaf value, like "hello…" or 42.
export function preview(value) {
  if (typeof value === 'string') return JSON.stringify(value.length > 40 ? value.slice(0, 40) + '…' : value)
  return JSON.stringify(value)
}

// The document flattened to rows the page renders: depth for indent, paths for the click, and a
// label. Objects/arrays get an opening row; leaves get a value row. Capped at MAX_NODES.
export function flatten(value) {
  const rows = []
  let truncated = false
  const walk = (v, key, paths, depth) => {
    if (rows.length >= MAX_NODES) {
      truncated = true
      return
    }
    const label = key === null ? '$' : String(key)
    if (Array.isArray(v)) {
      rows.push({ label, paths, depth, kind: 'array', size: v.length })
      v.forEach((item, i) => walk(item, i, appendKey(paths, i), depth + 1))
    } else if (v && typeof v === 'object') {
      const keys = Object.keys(v)
      rows.push({ label, paths, depth, kind: 'object', size: keys.length })
      for (const k of keys) walk(v[k], k, appendKey(paths, k), depth + 1)
    } else {
      rows.push({ label, paths, depth, kind: 'leaf', value: preview(v) })
    }
  }
  walk(value, null, ROOT_PATHS, 0)
  return { rows, truncated }
}
