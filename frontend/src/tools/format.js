// The code formatter: pragmatic beautifiers that run in the page, no library and no upload.
// JSON is exact (parse + print). JavaScript and CSS are token-aware reindenters: strings and
// comments pass through untouched, braces and semicolons get their newlines, and every line is
// re-indented by nesting depth. HTML is re-nested tag by tag. Python only gets safe clean-ups,
// because its whitespace is meaning.

export const FORMAT_LANGUAGES = ['JavaScript', 'JSON', 'CSS', 'HTML', 'Python']

// ---- shared tokenizer -------------------------------------------------------------------------

// Split code into { type: 'code' | 'skip', text } tokens; 'skip' is a string or comment that must
// pass through the formatter untouched.
function tokenize(code, { templates = false, hashComments = false } = {}) {
  const tokens = []
  let plain = ''
  const flush = () => {
    if (plain) tokens.push({ type: 'code', text: plain })
    plain = ''
  }
  // Reads from `i` to past the end of a span started by `open` and ended by `close` (respecting
  // backslash escapes), returning the index after it.
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
    if (c === '"' || c === "'") end = span(i, c)
    else if (c === '`' && templates) end = span(i, '`')
    else if (two === '/*') end = span(i + 1, '*/', false)
    else if (two === '//') end = code.indexOf('\n', i) === -1 ? code.length : code.indexOf('\n', i)
    else if (c === '#' && hashComments) end = code.indexOf('\n', i) === -1 ? code.length : code.indexOf('\n', i)
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

// ---- brace-language reindenter (JavaScript, CSS) ----------------------------------------------

const OPENERS = new Set(['{', '[', '('])
const CLOSERS = new Set(['}', ']', ')'])

// Words that keep a `}` company on its own line: `} else {`, `} catch`, ...
const AFTER_BRACE = /^\s*(else|catch|finally|while)\b/

function reindent(code, { unit, breakSemis }) {
  const tokens = tokenize(code, { templates: true })
  // Pass 1: normalize the stream into lines (token-aware newline insertion).
  let text = ''
  tokens.forEach((token, t) => {
    if (token.type === 'skip') {
      text += token.text
      return
    }
    let parens = 0
    // What follows position j, across tokens while the remainder is blank (for `} else` checks).
    const rest = (j) => {
      let after = token.text.slice(j + 1)
      for (let k = t + 1; /^\s*$/.test(after) && k < tokens.length; k++) after += tokens[k].text
      return after
    }
    for (let j = 0; j < token.text.length; j++) {
      const c = token.text[j]
      if (c === '(') parens++
      else if (c === ')') parens = Math.max(0, parens - 1)
      if (c === '{') {
        // `{}` stays together.
        if (/^\s*\}/.test(token.text.slice(j + 1))) text += c
        else text += c + '\n'
      } else if (c === '}') {
        if (!/(^|\n)\s*$/.test(text)) text += '\n'
        text += c
        const after = rest(j)
        if (!AFTER_BRACE.test(after) && !/^\s*[),;:\]}.]/.test(after)) text += '\n'
      } else if (c === ';' && breakSemis && parens === 0) {
        text += c + '\n'
      } else {
        text += c
      }
    }
  })

  // Pass 2: re-indent each line by nesting depth, skipping the inside of multi-line strings and
  // comments (tracked by re-tokenizing the normalized text).
  const spans = tokenize(text, { templates: true })
  let out = ''
  let depth = 0
  let atLineStart = true
  for (const token of spans) {
    if (token.type === 'skip') {
      if (atLineStart) out += ' '.repeat(Math.max(0, depth) * unit)
      out += token.text
      atLineStart = false
      continue
    }
    for (let j = 0; j < token.text.length; j++) {
      const c = token.text[j]
      if (c === '\n') {
        out = out.replace(/[ \t]+$/, '') + '\n'
        atLineStart = true
        continue
      }
      if (atLineStart && (c === ' ' || c === '\t')) continue
      if (atLineStart) {
        out += ' '.repeat(Math.max(0, depth - (CLOSERS.has(c) ? 1 : 0)) * unit)
        atLineStart = false
      }
      if (OPENERS.has(c)) depth++
      else if (CLOSERS.has(c)) depth = Math.max(0, depth - 1)
      out += c
    }
  }
  // At most one blank line in a row, no trailing space.
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '') + '\n'
}

// ---- per-language formatters ------------------------------------------------------------------

function formatJson(code, unit) {
  try {
    return { ok: true, out: JSON.stringify(JSON.parse(code), null, unit) + '\n' }
  } catch (err) {
    return { ok: false, error: `This is not valid JSON: ${String(err.message || err)}` }
  }
}

function formatCss(code, unit) {
  const tokens = tokenize(code)
  let text = ''
  for (const token of tokens) {
    if (token.type === 'skip') {
      text += token.text
      continue
    }
    text += token.text
      .replace(/\s+/g, ' ')
      .replace(/\s*\{\s*/g, ' {\n')
      .replace(/\s*;\s*/g, ';\n')
      .replace(/\s*\}\s*/g, '\n}\n')
      .replace(/,\s*/g, ', ')
  }
  let depth = 0
  const lines = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('}')) depth = Math.max(0, depth - 1)
    lines.push(' '.repeat(depth * unit) + line)
    // The leading } was already counted; the rest of the line moves the depth for what follows.
    const net = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length + (line.startsWith('}') ? 1 : 0)
    depth = Math.max(0, depth + net)
  }
  return { ok: true, out: lines.join('\n') + '\n' }
}

// Elements with no closing tag, and elements whose content must not be touched.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', '!doctype'])
const RAW = new Set(['script', 'style', 'pre', 'textarea'])

function formatHtml(code, unit) {
  const out = []
  let depth = 0
  const push = (line) => out.push(' '.repeat(depth * unit) + line)
  let i = 0
  while (i < code.length) {
    if (code.startsWith('<!--', i)) {
      const stop = code.indexOf('-->', i)
      const end = stop === -1 ? code.length : stop + 3
      push(code.slice(i, end).trim())
      i = end
      continue
    }
    if (code[i] === '<') {
      const end = code.indexOf('>', i)
      if (end === -1) {
        push(code.slice(i).trim())
        break
      }
      const tag = code.slice(i, end + 1)
      const name = (/^<\/?([a-zA-Z0-9!-]+)/.exec(tag)?.[1] ?? '').toLowerCase()
      const closing = tag.startsWith('</')
      if (closing) depth = Math.max(0, depth - 1)
      push(tag.replace(/\s+/g, ' '))
      i = end + 1
      if (!closing && RAW.has(name)) {
        depth++
        const stop = code.toLowerCase().indexOf(`</${name}`, i)
        const inner = code.slice(i, stop === -1 ? code.length : stop)
        if (inner.trim()) out.push(inner.replace(/^\n+|\s+$/g, ''))
        i = stop === -1 ? code.length : stop
        continue
      }
      if (!closing && !VOID.has(name) && !tag.endsWith('/>') && !tag.startsWith('<!')) depth++
    } else {
      const stop = code.indexOf('<', i)
      const textEnd = stop === -1 ? code.length : stop
      const value = code.slice(i, textEnd).replace(/\s+/g, ' ').trim()
      if (value) push(value)
      i = textEnd
    }
  }
  return { ok: true, out: out.join('\n') + '\n' }
}

function formatPython(code) {
  const out = code
    .replace(/\t/g, '    ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\s+$/g, '')
  return {
    ok: true,
    out: out + '\n',
    note: 'Python indentation is meaning, so only safe clean-ups are applied: tabs to 4 spaces, trailing whitespace and extra blank lines removed.',
  }
}

// ---- entry points -----------------------------------------------------------------------------

// { ok: true, out, note? } or { ok: false, error }.
export function formatCode(language, code, { indent = 2 } = {}) {
  if (!code.trim()) return { ok: false, error: 'Paste some code first.' }
  try {
    if (language === 'JSON') return formatJson(code, indent)
    if (language === 'CSS') return formatCss(code, indent)
    if (language === 'HTML') return formatHtml(code, indent)
    if (language === 'Python') return formatPython(code)
    return { ok: true, out: reindent(code, { unit: indent, breakSemis: true }) }
  } catch (err) {
    return { ok: false, error: `Could not format this as ${language}: ${String(err.message || err)}` }
  }
}

// A good guess at which formatter fits this paste.
export function detectFormatLanguage(code) {
  const text = code.trim()
  if (/^[{[]/.test(text)) {
    try {
      JSON.parse(text)
      return 'JSON'
    } catch {
      // Braces but not JSON: fall through.
    }
  }
  if (/^<[!a-zA-Z]/.test(text)) return 'HTML'
  if (/^\s*(def |class |import |from )\S/m.test(text) && !/[;{]/.test(text)) return 'Python'
  if (/^[^{}<>]*\{[^{}]*:[^{}]*(;[^{}]*)*\}/.test(text) && !/\b(function|=>|const |let |var )/.test(text)) return 'CSS'
  return 'JavaScript'
}
