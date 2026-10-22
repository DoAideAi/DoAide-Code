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
