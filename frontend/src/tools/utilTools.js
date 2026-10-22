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
    slug: 'cron-builder',
    label: 'Cron builder',
    title: 'Cron Expression Builder',
    heading: 'Build a cron expression',
    description:
      'Type or pick a cron expression and read it back in plain words, with the next five run times in your timezone. Lists, ranges, steps and @daily shortcuts all work. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'base64',
    label: 'Base64',
    title: 'Base64 Encoder & Decoder',
    heading: 'Base64 encode and decode',
    description:
      'Encode text to Base64 or decode it back as you type — UTF-8 safe, URL-safe variant included, forgiving of missing padding. Runs in your browser, nothing is uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'css-gradient',
    label: 'CSS gradient',
    title: 'CSS Gradient Generator',
    heading: 'Build a CSS gradient',
    description:
      'Pick colors and positions, see the gradient live, and copy the CSS — linear, radial or conic, up to six stops, with ready-made presets. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'unit-converter',
    label: 'Unit converter',
    title: 'Developer Unit Converter',
    heading: 'Convert developer units',
    description:
      'px to rem/em at any root font size, bytes in decimal and binary, unix timestamps to dates, and colors between hex, rgb and hsl — all as you type. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'code-screenshot',
    label: 'Screenshot',
    title: 'Code Screenshot Generator',
    heading: 'Turn code into a shareable image',
    description:
      'Paste a snippet and download a polished PNG — gradient backdrop, editor window chrome, syntax colors, five themes. Rendered in your browser, nothing is uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'hash-generator',
    label: 'Hash',
    title: 'SHA Hash Generator',
    heading: 'Generate SHA hashes',
    description:
      'Type text and get its SHA-1, SHA-256, SHA-384 and SHA-512 hex digests live, computed with WebCrypto in your browser — nothing is uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'url-encoder',
    label: 'URL encode',
    title: 'URL Encoder & Decoder',
    heading: 'URL encode and decode',
    description:
      'Percent-encode text for URLs or decode it back as you type — component mode for query values, whole-URL mode that keeps structure, + read as space. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'timestamp-converter',
    label: 'Timestamp',
    title: 'Unix Timestamp Converter',
    heading: 'Convert timestamps',
    description:
      'Paste unix seconds, milliseconds, ISO 8601 or RFC 2822 and get every format back, plus the moment in any timezone — as you type, in your browser. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'lorem-ipsum',
    label: 'Lorem ipsum',
    title: 'Lorem Ipsum Generator',
    heading: 'Generate lorem ipsum text',
    description:
      'Filler text by the word, sentence or paragraph in three styles — classic Latin, tech filler, plain English — copied as text or HTML paragraphs. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'string-utilities',
    label: 'String utils',
    title: 'String Utilities',
    heading: 'Convert, count and slugify strings',
    description:
      'camelCase, snake_case, kebab-case and five more conversions, URL slugs, reversed text, and character/word/line/byte counts — all live as you type. Free, no sign-up.',
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
