// The JSON Schema generator (/tools/json-schema-generator): paste JSON, get a draft 2020-12
// schema inferred from it — types, required keys, string formats, merged array item schemas.
// Everything runs in the browser.

export const MAX_SCHEMA_INPUT = 200_000

const FORMATS = [
  ['date-time', /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})?$/],
  ['date', /^\d{4}-\d{2}-\d{2}$/],
  ['time', /^\d{2}:\d{2}:\d{2}(\.\d+)?$/],
  ['email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/],
  ['uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
  ['uri', /^https?:\/\/\S+$/],
  ['ipv4', /^(\d{1,3}\.){3}\d{1,3}$/],
]

// The detected format of a string, or null when it is just text.
export function stringFormat(value) {
  for (const [name, re] of FORMATS) if (re.test(value)) return name
  return null
}

// Infers the schema of one parsed JSON value.
function schemaOf(value, opts) {
  if (value === null) return { type: 'null' }
  if (Array.isArray(value)) {
    const schema = { type: 'array' }
    if (value.length) schema.items = value.map((v) => schemaOf(v, opts)).reduce(merge)
    return schema
  }
  switch (typeof value) {
    case 'boolean':
      return { type: 'boolean' }
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number' }
    case 'string': {
      const schema = { type: 'string' }
      if (opts.formats) {
        const format = stringFormat(value)
        if (format) schema.format = format
      }
      return schema
    }
    default: {
      const properties = {}
      const keys = Object.keys(value)
      for (const key of keys) properties[key] = schemaOf(value[key], opts)
      const schema = { type: 'object', properties }
      if (opts.required && keys.length) schema.required = keys
      return schema
    }
  }
}

// Merges two inferred schemas into one that accepts both: same-type schemas deepen (object
// properties union, required intersect, array items merge), different types become an anyOf.
export function merge(a, b) {
  if (deepEqual(a, b)) return a
  if (a.type !== b.type || a.anyOf || b.anyOf) {
    const variants = [...(a.anyOf ?? [a]), ...(b.anyOf ?? [b])]
    const unique = variants.filter((v, i) => variants.findIndex((w) => deepEqual(v, w)) === i)
    // integer is a subset of number: collapse the pair instead of keeping both.
    const types = unique.map((v) => v.type)
    if (unique.length === 2 && types.includes('integer') && types.includes('number')) return { type: 'number' }
    return unique.length === 1 ? unique[0] : { anyOf: unique }
  }
  if (a.type === 'object') {
    const properties = { ...a.properties }
    for (const [key, schema] of Object.entries(b.properties ?? {})) {
      properties[key] = key in properties ? merge(properties[key], schema) : schema
    }
    const out = { type: 'object', properties }
    const required = (a.required ?? []).filter((k) => (b.required ?? []).includes(k))
    if (required.length) out.required = required
    return out
  }
  if (a.type === 'array') {
    if (a.items && b.items) return { type: 'array', items: merge(a.items, b.items) }
    return { type: 'array', ...((a.items || b.items) && { items: a.items ?? b.items }) }
  }
  if (a.type === 'string') return a.format === b.format ? a : { type: 'string' }
  return a
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// JSON text in, a complete JSON Schema document out. Throws with a readable message on bad JSON.
export function generateSchema(text, { formats = true, required = true, title = '' } = {}) {
  if (!text.trim()) throw new Error('Paste some JSON first.')
  if (text.length > MAX_SCHEMA_INPUT) throw new Error(`Too long: this tool takes up to ${MAX_SCHEMA_INPUT.toLocaleString()} characters.`)
  let value
  try {
    value = JSON.parse(text)
  } catch (e) {
    throw new Error(`Not valid JSON: ${e.message}`)
  }
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...(title && { title }),
    ...schemaOf(value, { formats, required }),
  }
}
