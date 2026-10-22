// The code complexity analyzer (/tools/code-complexity): line metrics, per-function cyclomatic
// complexity and nesting depth, computed in the page with the usual pragmatic tokenizer (strings
// and comments never count as code). Tuned for JavaScript/TypeScript-style brace languages and
// Python; other languages get the same counts via the shared heuristics.

export const MAX_COMPLEXITY_CHARS = 100_000

// Decision points that each add one path through the code (cyclomatic complexity = 1 + these).
const DECISIONS = /\b(if|elif|for|while|case|when|catch|except)\b|&&|\|\||\?\?|(?<=\s)\?(?=[^.?:]|$)/g
const WORD_OPS = /\b(and|or)\b/g

// Split code into { type: 'code' | 'skip', text }; 'skip' is a string or comment.
export function tokenize(code) {
  const tokens = []
  let plain = ''
  const flush = () => {
    if (plain) tokens.push({ type: 'code', text: plain })
    plain = ''
  }
  const span = (i, close, escapes = true) => {
    let j = i + 1
    while (j < code.length) {
      if (escapes && code[j] === '\\') j += 2
      else if (code.startsWith(close, j)) return j + close.length
      else j++
    }
    return j
  }
  let i = 0
  while (i < code.length) {
    const c = code[i]
    const two = code.slice(i, i + 2)
    let end = null
    if (c === '"' || c === "'" || c === '`') end = span(i, c)
    else if (two === '/*') end = span(i + 1, '*/', false)
    else if (two === '//' || c === '#') end = code.indexOf('\n', i) === -1 ? code.length : code.indexOf('\n', i)
    if (end !== null) {
      flush()
      tokens.push({ type: 'skip', text: code.slice(i, end) })
      i = end
    } else {
      plain += c
      i++
    }
  }
  flush()
  return tokens
}

// The same text with strings and comments blanked out (newlines kept), so regexes and brace
// counting only ever see real code.
export function blankSkips(code) {
  return tokenize(code)
    .map((t) => (t.type === 'code' ? t.text : t.text.replace(/[^\n]/g, ' ')))
    .join('')
}

// Cyclomatic complexity of one stretch of (already blanked) code.
export function cyclomatic(code, { wordOps = false } = {}) {
  const decisions = (code.match(DECISIONS) || []).length
  const words = wordOps ? (code.match(WORD_OPS) || []).length : 0
  return 1 + decisions + words
}

export function complexityBand(score) {
  if (score <= 5) return { label: 'simple', tone: 'good' }
  if (score <= 10) return { label: 'moderate', tone: 'ok' }
  if (score <= 20) return { label: 'complex', tone: 'warn' }
  return { label: 'very complex', tone: 'bad' }
}

// Function definitions worth reporting on, with the body found by brace matching (brace
// languages) or indentation (Python).
const FN_PATTERNS = [
  /(?:^|\s)(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g, // function declarations
  /(?:^|[\s;])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)\n]*\)|[A-Za-z_$][\w$]*)\s*=>/g, // arrows
  /^[ \t]*(?:async[ \t]+)?def[ \t]+([A-Za-z_]\w*)\s*\(/gm, // python
]

function pythonBody(code, defStart) {
  const lines = code.slice(defStart).split('\n')
  const indent = /^\s*/.exec(lines[0])[0].length
  let end = 1
  while (end < lines.length) {
    const line = lines[end]
    if (line.trim() !== '' && /^\s*/.exec(line)[0].length <= indent) break
    end++
  }
  return lines.slice(0, end).join('\n')
}

function braceBody(code, matchStart) {
  const open = code.indexOf('{', matchStart)
  // An arrow with an expression body: take its line.
  if (open === -1) return code.slice(matchStart, code.indexOf('\n', matchStart) === -1 ? code.length : code.indexOf('\n', matchStart))
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}' && --depth === 0) return code.slice(matchStart, i + 1)
  }
  return code.slice(matchStart)
}

// Deepest block nesting in (blanked) code: braces for brace languages, indentation for Python.
export function maxNesting(code, python = false) {
  if (python) {
    let deepest = 0
    for (const line of code.split('\n')) {
      if (!line.trim()) continue
      deepest = Math.max(deepest, Math.floor(/^[ \t]*/.exec(line)[0].replace(/\t/g, '    ').length / 4))
    }
    return deepest
  }
  let depth = 0
  let deepest = 0
  for (const ch of code) {
    if (ch === '{') deepest = Math.max(deepest, ++depth)
    else if (ch === '}') depth = Math.max(0, depth - 1)
  }
  return deepest
}

export function analyze(code) {
  const blanked = blankSkips(code)
  const rawLines = code.split('\n')
  const blankedLines = blanked.split('\n')
  let blank = 0
  let comment = 0
  let codeLines = 0
  rawLines.forEach((raw, i) => {
    if (!raw.trim()) blank++
    else if (!blankedLines[i].trim()) comment++
    else codeLines++
  })

  const looksPython = /^\s*def\s+\w+\s*\(.*\)\s*:/m.test(blanked) || /^\s*(import|from)\s+\w+/m.test(code)

  const functions = []
  const seen = new Set()
  for (const pattern of FN_PATTERNS) {
    pattern.lastIndex = 0
    for (let m; (m = pattern.exec(blanked)); ) {
      const name = m[1]
      const start = m.index
      if (seen.has(start)) continue
      seen.add(start)
      const isDef = /\bdef\s/.test(m[0])
      const body = isDef ? pythonBody(blanked, start) : braceBody(blanked, start)
      functions.push({
        name,
        // The declaration patterns may start on the delimiter before the name's line.
        line: blanked.slice(0, start + m[0].search(/\S/)).split('\n').length,
        lines: body.split('\n').length,
        complexity: cyclomatic(body, { wordOps: isDef || looksPython }),
      })
    }
  }
  functions.sort((a, b) => b.complexity - a.complexity || a.line - b.line)

  return {
    totalLines: rawLines.length,
    codeLines,
    commentLines: comment,
    blankLines: blank,
    commentRatio: codeLines + comment === 0 ? 0 : comment / (codeLines + comment),
    fileComplexity: cyclomatic(blanked, { wordOps: looksPython }),
    maxNesting: maxNesting(blanked, looksPython),
    functions,
  }
}
