// The SQL formatter and validator (/tools/sql-formatter): a pragmatic pretty-printer and sanity
// checker that run in the page, no library and no upload. Strings and comments pass through
// untouched; keywords are uppercased; each major clause starts its own line, indented by
// subquery depth. The validator catches the mistakes people actually paste: unbalanced
// parentheses, unterminated strings, trailing commas, and empty input.

export const MAX_SQL_CHARS = 50_000

// Words always written in caps. Multi-word clauses are handled as phrases below.
const KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'ilike', 'between',
  'exists', 'case', 'when', 'then', 'else', 'end', 'as', 'on', 'using', 'join', 'inner', 'left',
  'right', 'full', 'outer', 'cross', 'union', 'all', 'distinct', 'group', 'by', 'order', 'having',
  'limit', 'offset', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table',
  'alter', 'drop', 'index', 'view', 'primary', 'key', 'foreign', 'references', 'unique', 'default',
  'constraint', 'asc', 'desc', 'with', 'returning', 'count', 'sum', 'avg', 'min', 'max',
])

// Phrases that start a new line at their clause's depth.
const CLAUSE_STARTS = [
  'select', 'from', 'where', 'group by', 'order by', 'having', 'limit', 'offset', 'union all',
  'union', 'left join', 'left outer join', 'right join', 'right outer join', 'inner join',
  'full join', 'full outer join', 'cross join', 'join', 'insert into', 'values', 'update',
  'set', 'delete from', 'returning', 'with', 'on',
]

// Lines starting with these are indented one step past their clause (they continue one).
const CONTINUATIONS = new Set(['and', 'or', 'on', 'when', 'then', 'else'])

// Split SQL into { type: 'code' | 'skip', text } tokens; 'skip' is a string, quoted identifier
// or comment that must pass through untouched.
export function tokenizeSql(sql) {
  const tokens = []
  let plain = ''
  const flush = () => {
    if (plain) tokens.push({ type: 'code', text: plain })
    plain = ''
  }
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const two = sql.slice(i, i + 2)
    let end = null
    if (c === "'" || c === '"' || c === '`') {
      // SQL escapes a quote by doubling it ('it''s'); backslashes pass through.
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === c && sql[j + 1] === c) j += 2
        else if (sql[j] === c) { j++; break }
        else j++
      }
      end = j
    } else if (two === '--') {
      const nl = sql.indexOf('\n', i)
      end = nl === -1 ? sql.length : nl
    } else if (two === '/*') {
      const close = sql.indexOf('*/', i + 2)
      end = close === -1 ? sql.length : close + 2
    }
    if (end !== null) {
      flush()
      tokens.push({ type: 'skip', text: sql.slice(i, end) })
      i = end
    } else {
      plain += c
      i++
    }
  }
  flush()
  return tokens
}

// Uppercases keywords in a code span, leaving identifiers and numbers alone.
function upcaseKeywords(text) {
  return text.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (w) => (KEYWORDS.has(w.toLowerCase()) ? w.toUpperCase() : w))
}

export function formatSql(sql) {
  // Pass 1: one long line per statement — collapse whitespace, uppercase keywords.
  let flat = ''
  for (const token of tokenizeSql(sql)) {
    if (token.type === 'skip') {
      // Keep line comments on their own line so they don't swallow what follows.
      flat += token.text.startsWith('--') ? `\n${token.text}\n` : token.text
    } else {
      flat += upcaseKeywords(token.text.replace(/\s+/g, ' '))
    }
  }

  // Pass 2: break before clause starts and after top-level commas and semicolons.
  const breakBefore = new RegExp(
    `\\b(${CLAUSE_STARTS.map((p) => p.toUpperCase().replace(/ /g, '\\s+')).join('|')})\\b`,
    'g',
  )
  let broken = ''
  let parens = 0 // commas split lines only outside parentheses, so COUNT(a, b) stays together
  for (const token of tokenizeSql(flat)) {
    if (token.type === 'skip') {
      broken += token.text
      continue
    }
    const text = token.text.replace(breakBefore, '\n$1').replace(/\(\s*\n?(SELECT)\b/g, '(\n$1')
    for (const ch of text) {
      broken += ch
      if (ch === '(') parens++
      else if (ch === ')') parens = Math.max(0, parens - 1)
      else if ((ch === ',' && parens === 0) || ch === ';') broken += '\n'
    }
  }

  // Pass 3: indent each line by its parenthesis depth, continuations one step deeper.
  const lines = broken.split('\n').map((l) => l.trim()).filter((l) => l !== '')
  const out = []
  let depth = 0
  for (const line of lines) {
    const closes = (line.match(/^\)+/) || [''])[0].length
    const lineDepth = Math.max(0, depth - closes)
    const firstWord = (line.match(/^[a-zA-Z]+/) || [''])[0].toLowerCase()
    // Clause starters sit at their subquery's depth; everything else (list items, conditions
    // continued by AND/OR/ON, comments) one step deeper; closing parens back at depth.
    const isClause = CLAUSE_STARTS.some((p) => line.toLowerCase().startsWith(p)) && !CONTINUATIONS.has(firstWord)
    const indent = lineDepth + (line.startsWith(')') || isClause ? 0 : 1)
    out.push('  '.repeat(indent) + line)
    for (const ch of line) {
      if (ch === '(') depth++
      else if (ch === ')') depth = Math.max(0, depth - 1)
    }
  }
  return out.join('\n').trim() + '\n'
}

// Problems worth flagging before anyone runs the query. Each is { message, hint? }.
export function validateSql(sql) {
  const problems = []
  if (!sql.trim()) return [{ message: 'Paste a SQL statement first.' }]

  let depth = 0
  let unbalancedClose = false
  for (const token of tokenizeSql(sql)) {
    if (token.type === 'skip') {
      const q = token.text[0]
      if ((q === "'" || q === '"' || q === '`') && (token.text.length < 2 || token.text[token.text.length - 1] !== q)) {
        problems.push({ message: `Unterminated ${q === "'" ? 'string' : 'quoted identifier'} starting with ${token.text.slice(0, 20)}…` })
      }
      if (token.text.startsWith('/*') && !token.text.endsWith('*/')) {
        problems.push({ message: 'Unclosed block comment (/* without */).' })
      }
      continue
    }
    for (const ch of token.text) {
      if (ch === '(') depth++
      else if (ch === ')') {
        depth--
        if (depth < 0) unbalancedClose = true
      }
    }
    if (/,\s*(FROM|WHERE|GROUP|ORDER|HAVING|LIMIT|\))/i.test(token.text)) {
      problems.push({ message: 'Trailing comma before a clause or closing parenthesis.' })
    }
  }
  if (depth > 0) problems.push({ message: `${depth} unclosed parenthes${depth === 1 ? 'is' : 'es'}.` })
  if (unbalancedClose) problems.push({ message: 'A closing parenthesis has no matching opening one.' })

  const flat = tokenizeSql(sql)
    .filter((t) => t.type === 'code')
    .map((t) => t.text)
    .join(' ')
  if (/\bSELECT\b/i.test(flat) && !/\bFROM\b/i.test(flat) && /\b[a-z_]+\.[a-z_]+\b/i.test(flat)) {
    problems.push({ message: 'SELECT references table columns but has no FROM clause.' })
  }
  if (/\bDELETE\s+FROM\b/i.test(flat) && !/\bWHERE\b/i.test(flat)) {
    problems.push({ message: 'DELETE without a WHERE clause removes every row.', hint: 'warning' })
  }
  if (/\bUPDATE\b/i.test(flat) && /\bSET\b/i.test(flat) && !/\bWHERE\b/i.test(flat)) {
    problems.push({ message: 'UPDATE without a WHERE clause changes every row.', hint: 'warning' })
  }
  return problems
}
