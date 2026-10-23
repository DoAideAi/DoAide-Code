// The YAML ↔ JSON converter (/tools/yaml-to-json), on the `yaml` package: YAML 1.2 core schema,
// anchors/aliases and << merge keys resolved, several --- documents become a JSON array.

import { parseAllDocuments, stringify } from 'yaml'

// First line of a yaml/JSON error message plus { line, col } when known.
function yamlError(e) {
  const pos = e.linePos?.[0]
  return { message: e.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, ''), line: pos?.line ?? null, col: pos?.col ?? null }
}

// YAML text → { json } or { error: { message, line, col } }.
export function yamlToJson(text, indent = 2) {
  const docs = parseAllDocuments(text, { merge: true, prettyErrors: true })
  const list = Array.isArray(docs) ? docs : []
  for (const d of list) if (d.errors.length) return { error: yamlError(d.errors[0]) }
  if (!list.length) return { json: '' }
  try {
    const values = list.map((d) => d.toJS({ maxAliasCount: 1000 }))
    return { json: JSON.stringify(values.length === 1 ? values[0] : values, null, indent) ?? 'null', documents: values.length }
  } catch (e) {
    return { error: { message: e.message, line: null, col: null } }
  }
}

// Line and column of a JSON.parse error, from either "position N" or "line L column C".
export function jsonErrorPos(message, text) {
  const lc = /line (\d+) column (\d+)/.exec(message)
  if (lc) return { line: Number(lc[1]), col: Number(lc[2]) }
  const p = /position (\d+)/.exec(message)
  if (!p) return { line: null, col: null }
  const before = text.slice(0, Number(p[1])).split('\n')
  return { line: before.length, col: before[before.length - 1].length + 1 }
}

// JSON text → { yaml } or { error }. A top-level array can be split into --- documents.
export function jsonToYaml(text, { indent = 2, multiDoc = false } = {}) {
  if (!text.trim()) return { yaml: '' }
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    return { error: { message: e.message, ...jsonErrorPos(e.message, text) } }
  }
  const opts = { indent, lineWidth: 0, aliasDuplicateObjects: false }
  if (multiDoc && Array.isArray(data)) return { yaml: data.map((d) => stringify(d, opts)).join('---\n') }
  return { yaml: stringify(data, opts) }
}
