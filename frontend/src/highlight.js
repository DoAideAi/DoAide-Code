// Light syntax highlighting for code blocks: comments, strings, numbers and keywords, plus
// added/removed lines in diffs. Small on purpose: enough to read code at a glance, no library.

const KEYWORDS = new Set(
  `abstract and as async await break case catch class const continue def default del defer do done elif else
  elseif end enum esac except export extends false fi final finally fn for from func function go if impl import in
  interface is lambda let local loop match mod mut new nil none None not null or package pass private
  protected pub public raise repeat return self static struct super switch then this throw true True False try
  type typeof undefined until use var void while with yield`.split(/\s+/),
)

// SQL gets its own keywords (matched in any case), so SELECT and select both colour without
// common words like `on` or `left` lighting up in every other language.
const SQL_KEYWORDS = new Set(
  `add all alter and as asc begin between by cascade case check column commit constraint create cross
  database default delete desc distinct drop else end exists foreign from full group having in index
  inner insert into is join key left like limit not null offset on or order outer primary references
  replace right rollback select set table then transaction trigger union unique update values view
  when where with`.split(/\s+/),
)
const SQL_LANGS = new Set(['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql', 'tsql'])

// Where `#` starts a comment; elsewhere only // and /* */ do (unless the language is unknown).
const HASH_COMMENTS = new Set(['python', 'py', 'sh', 'bash', 'zsh', 'shell', 'yaml', 'yml', 'toml', 'ruby', 'rb', 'r', 'perl', 'make', 'makefile', 'dockerfile', 'conf', 'ini', 'elixir', 'ex', 'exs', 'nim', 'julia', 'jl', 'ps1', 'powershell'])
const SLASH_COMMENTS = new Set(['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript', 'json', 'jsonc', 'c', 'cpp', 'c++', 'h', 'java', 'kotlin', 'kt', 'kts', 'go', 'rust', 'rs', 'swift', 'cs', 'csharp', 'php', 'scala', 'dart', 'css', 'scss', 'zig', 'v'])
// Where `--` starts a comment (never a default: it would swallow x-- in C-family code).
const DASH_COMMENTS = new Set([...SQL_LANGS, 'lua', 'haskell', 'hs', 'elm', 'ada'])

function tokenPattern(lang) {
  const hash = HASH_COMMENTS.has(lang) || (!SLASH_COMMENTS.has(lang) && !DASH_COMMENTS.has(lang))
  const slash = SLASH_COMMENTS.has(lang) || (!HASH_COMMENTS.has(lang) && !DASH_COMMENTS.has(lang))
  const comments = [
    slash && '\\/\\/[^\\n]*',
    slash && '\\/\\*[\\s\\S]*?(?:\\*\\/|$)',
    hash && '#[^\\n]*',
    DASH_COMMENTS.has(lang) && '--[^\\n]*',
    SQL_LANGS.has(lang) && '\\/\\*[\\s\\S]*?(?:\\*\\/|$)',
  ].filter(Boolean)
  // In Rust a single quote is a char ('x') or a lifetime ('a), never a string.
  const single = lang === 'rust' || lang === 'rs' ? "'(?:\\\\.|[^'\\\\\\n])'" : "'(?:\\\\.|[^'\\\\\\n])*'"
  return new RegExp(
    [
      `(${comments.join('|')})`,
      `("""[\\s\\S]*?(?:"""|$)|'''[\\s\\S]*?(?:'''|$)|"(?:\\\\.|[^"\\\\\\n])*"|${single}|\`(?:\\\\.|[^\`\\\\])*\`)`,
      '(\\b0x[\\da-f]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b)',
      '([A-Za-z_$][\\w$]*)',
    ].join('|'),
    'gi',
  )
}

// [{ text, kind }] covering the whole code, kind one of comment | string | number | keyword | added
// | removed | null.
export function highlight(code, lang = '') {
  const language = lang.toLowerCase()
  if (language === 'diff' || language === 'patch') {
    return code.split(/(?<=\n)/).map((line) => ({
      text: line,
      kind: /^\+(?!\+\+)/.test(line) ? 'added' : /^-(?!--)/.test(line) ? 'removed' : null,
    }))
  }
  const tokens = []
  const push = (text, kind) => {
    if (!text) return
    const last = tokens.at(-1)
    if (last && last.kind === kind) last.text += text
    else tokens.push({ text, kind })
  }
  const re = tokenPattern(language)
  let last = 0
  let m
  while ((m = re.exec(code)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++
      continue
    }
    push(code.slice(last, m.index), null)
    const [, comment, string, number, word] = m
    if (comment) push(comment, 'comment')
    else if (string) push(string, 'string')
    else if (number) push(number, 'number')
    else if (SQL_LANGS.has(language)) push(word, SQL_KEYWORDS.has(word.toLowerCase()) ? 'keyword' : null)
    else push(word, KEYWORDS.has(word) ? 'keyword' : null)
    last = re.lastIndex
  }
  push(code.slice(last), null)
  return tokens
}

export const TOKEN_CLASS = {
  comment: 'text-zinc-500 italic',
  string: 'text-emerald-300',
  number: 'text-amber-300',
  keyword: 'text-violet-300',
  added: 'text-emerald-300 bg-emerald-500/10',
  removed: 'text-red-300 bg-red-500/10',
}

// File extension -> the highlighter's language name, where they differ.
const LANGS = { mjs: 'js', cjs: 'js', pyi: 'py', yml: 'yaml', htm: 'html', mk: 'make', psql: 'sql' }

export function langFor(path) {
  const name = path.split('/').pop().toLowerCase()
  if (name === 'dockerfile' || name === 'makefile') return name
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return LANGS[ext] ?? ext
}
