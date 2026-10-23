// The text diff checker (/tools/text-diff): line diff of two prose/plain-text inputs with
// options to ignore case and whitespace, word-level highlights inside changed lines, and counts.
// The line matching itself is the code diff checker's diffLines.

import { diffLines } from './diffLines.js'

// Above this many token pairs a changed line is shown whole instead of word by word.
const MAX_WORD_CELLS = 250_000

export function normalizeLine(line, { ignoreCase = false, ignoreWhitespace = false } = {}) {
  let s = line
  if (ignoreWhitespace) s = s.replace(/\s+/g, ' ').trim()
  if (ignoreCase) s = s.toLowerCase()
  return s
}

// Rows like diffLines', but compared on normalized lines and shown with the original text.
// Blank lines are dropped first when ignoreBlankLines is set.
export function textDiff(oldText, newText, opts = {}) {
  const prep = (t) => {
    const lines = t.replace(/\r\n?/g, '\n').split('\n')
    return opts.ignoreBlankLines ? lines.filter((l) => l.trim()) : lines
  }
  const a = prep(oldText)
  const b = prep(newText)
  const rows = diffLines(a.map((l) => normalizeLine(l, opts)).join('\n'), b.map((l) => normalizeLine(l, opts)).join('\n'))
  return rows.map((r) => ({ ...r, text: r.new != null ? b[r.new - 1] : a[r.old - 1] }))
}

// Words, whitespace runs and single punctuation marks, so a diff reads naturally.
export function tokenize(line) {
  return line.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? []
}

// Two token lists as segments [{ text, changed }] for each side, via LCS.
export function wordDiff(oldLine, newLine) {
  const a = tokenize(oldLine)
  const b = tokenize(newLine)
  if (a.length * b.length > MAX_WORD_CELLS) return { old: [{ text: oldLine, changed: true }], new: [{ text: newLine, changed: true }] }
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const oldSegs = []
  const newSegs = []
  const push = (segs, text, changed) => {
    const last = segs[segs.length - 1]
    if (last && last.changed === changed) last.text += text
    else segs.push({ text, changed })
  }
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      push(oldSegs, a[i++], false)
      push(newSegs, b[j++], false)
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) push(newSegs, b[j++], true)
    else push(oldSegs, a[i++], true)
  }
  return { old: oldSegs, new: newSegs }
}

// Attaches `segs` to deleted/added rows that pair up inside a changed block (1st del ↔ 1st add…).
export function withWordDiffs(rows) {
  const out = rows.map((r) => ({ ...r }))
  let i = 0
  while (i < out.length) {
    if (out[i].kind === 'same') {
      i++
      continue
    }
    const start = i
    while (i < out.length && out[i].kind === 'del') i++
    const dels = out.slice(start, i)
    const addStart = i
    while (i < out.length && out[i].kind === 'add') i++
    const adds = out.slice(addStart, i)
    for (let k = 0; k < Math.min(dels.length, adds.length); k++) {
      const d = wordDiff(dels[k].text, adds[k].text)
      dels[k].segs = d.old
      adds[k].segs = d.new
    }
  }
  return out
}

export function textStats(text) {
  return {
    chars: [...text].length,
    words: (text.match(/\S+/g) ?? []).length,
    lines: text ? text.split(/\r\n?|\n/).length : 0,
  }
}

// The diff as a unified-style patch body: ' ', '-', '+' prefixed lines.
export function toPatch(rows) {
  return rows.map((r) => `${r.kind === 'add' ? '+' : r.kind === 'del' ? '-' : ' '}${r.text}`).join('\n')
}
