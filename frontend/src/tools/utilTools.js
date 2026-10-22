// The free developer utilities: no AI, no server, everything computed in the page. One URL per
// tool for search engines, like the AI tools in codeTools.js.

export const UTIL_TOOLS = [
  {
    slug: 'diff-checker',
    label: 'Diff checker',
    title: 'Code Diff Checker',
    heading: 'Compare two versions of your code',
    description:
      'Paste two versions of a file and see every added, removed and changed line side by side. Free online diff checker, no sign-up.',
    isNew: true,
  },
  {
    slug: 'code-formatter',
    label: 'Formatter',
    title: 'Code Formatter',
    heading: 'Format messy code',
    description:
      'Beautify JavaScript, JSON, CSS, HTML or Python: consistent indentation, right in your browser. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'regex-tester',
    label: 'Regex tester',
    title: 'Regex Tester',
    heading: 'Test regular expressions',
    description:
      'Type a regex and a test string and see every match and capture group highlighted as you type. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'embed-code',
    label: 'Embed widget',
    title: 'Embeddable Code Widget',
    heading: 'Embed a code snippet on your site',
    description:
      'Paste code and get an iframe snippet for your blog, docs or README site. Readers see the snippet and open it in the free AI tools with one click. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'share-code',
    label: 'Share code',
    title: 'Share Code Snippets',
    heading: 'Share code with a short link',
    description:
      'Paste code and get a short link anyone can open: syntax highlighted, up to 20,000 characters, no sign-up. Share snippets on WhatsApp, Slack or anywhere.',
    isNew: true,
  },
  {
    slug: 'code-playground',
    label: 'Playground',
    title: 'Code Playground',
    heading: 'Run JavaScript or Python in your browser',
    description:
      'Type code and run it instantly in a sandboxed frame: JavaScript natively, Python on WebAssembly. Nothing is uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'sql-formatter',
    label: 'SQL formatter',
    title: 'SQL Formatter & Validator',
    heading: 'Format and validate SQL',
    description:
      'Paste a SQL query to format it — one clause per line, keywords uppercased — and catch unbalanced parentheses, unterminated strings and missing WHERE clauses. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'code-templates',
    label: 'Templates',
    title: 'Code Templates Library',
    heading: 'Start from a code template',
    description:
      'Pre-built templates for the patterns you write over and over: React components and hooks, Express and FastAPI endpoints, Python classes and CLIs, SQL CRUD, Go servers. Copy and go. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'code-complexity',
    label: 'Complexity',
    title: 'Code Complexity Analyzer',
    heading: 'Measure code complexity',
    description:
      'Paste code and get cyclomatic complexity per function, lines of code, comment ratio and nesting depth — with the functions worth refactoring flagged first. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'markdown-editor',
    label: 'Markdown',
    title: 'Markdown Editor & Preview',
    heading: 'Write Markdown, preview it live',
    description:
      'Type Markdown and see it rendered side by side: headings, lists, links and syntax-highlighted code blocks. Copy the HTML or download the .md file. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'jwt-decoder',
    label: 'JWT decoder',
    title: 'JWT Decoder',
    heading: 'Decode a JWT',
    description:
      'Paste a JWT to see the decoded header and payload, every registered claim explained, and whether the token is expired. Runs in your browser — the token is never uploaded or stored. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'json-formatter',
    label: 'JSON viewer',
    title: 'JSON Formatter & Validator',
    heading: 'Validate and explore JSON',
    description:
      'Paste JSON to validate it, see the exact line of any error, and explore it as a collapsible tree. Free, no sign-up.',
    isNew: true,
  },
]

// The slug in a path like /tools/diff-checker ('' for /tools).
export function slugForPath(pathname) {
  return pathname.replace(/^\/tools\/?/, '').replace(/\/$/, '')
}

// The utility living at this path, or null when the path is an AI tool's (or unknown).
export function utilForPath(pathname) {
  const slug = slugForPath(pathname)
  return UTIL_TOOLS.find((t) => t.slug === slug) ?? null
}
