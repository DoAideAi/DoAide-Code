// The regex tester's engine: run a pattern over a test string and hand back the matches plus
// the text cut into highlightable segments. Everything stays in the page.

export const REGEX_FLAGS = [
  ['g', 'global — find every match'],
  ['i', 'ignore case'],
  ['m', 'multiline — ^ and $ per line'],
  ['s', 'dotall — . matches newlines'],
]

export const MAX_REGEX_TEXT = 50_000
// More matches than anyone reads; also the stop for pathological patterns.
const MAX_MATCHES = 2000

// { ok: false, error } for a bad pattern, else { ok: true, matches, segments }:
//   matches  [{ index, text, groups: [..], named: {..} }]
//   segments [{ text, match: null | match number (0-based) }] covering the whole text
export function runRegex(pattern, flags, text) {
  if (!pattern) return { ok: true, matches: [], segments: [{ text, match: null }] }
  let re
  try {
    // 'g' internally even when off, so exec() walks instead of spinning on index 0.
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
  } catch (err) {
    return { ok: false, error: String(err.message || err) }
  }
  const matches = []
  let m
  while (matches.length < (flags.includes('g') ? MAX_MATCHES : 1) && (m = re.exec(text)) !== null) {
    matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups ? { ...m.groups } : {} })
    if (m[0] === '') re.lastIndex++ // A zero-length match must not loop forever.
  }
  const segments = []
  let last = 0
  matches.forEach((match, n) => {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), match: null })
    segments.push({ text: match.text, match: n })
    last = match.index + match.text.length
  })
  if (last < text.length || segments.length === 0) segments.push({ text: text.slice(last), match: null })
  return { ok: true, matches, segments }
}
