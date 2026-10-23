// The free developer utilities: no AI, no server, everything computed in the page. One URL per
// tool for search engines, like the AI tools in codeTools.js.

// The slug parser lives beside the page import map, which the entry also loads.
import { slugForPath } from './pageLoaders.js'
export { slugForPath }

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
    slug: 'json-path-finder',
    label: 'JSON path',
    title: 'JSON Path Finder',
    heading: 'Find the JSONPath of any value',
    description:
      'Paste JSON, click any value in the tree, and copy its JSONPath expression or JavaScript accessor — quoting awkward keys for you. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'html-preview',
    label: 'HTML preview',
    title: 'HTML Preview',
    heading: 'Preview HTML, CSS and JavaScript live',
    description:
      'Type HTML, CSS and JavaScript in three panes and watch the result render live in a sandboxed preview — runtime errors shown inline. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'markdown-to-html',
    label: 'MD → HTML',
    title: 'Markdown to HTML Converter',
    heading: 'Convert Markdown to HTML',
    description:
      'Paste Markdown and get clean HTML with a live preview — headings, lists, tables, fenced code and links, with raw HTML safely escaped. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'image-to-base64',
    label: 'Image → Base64',
    title: 'Image to Base64 Converter',
    heading: 'Convert an image to Base64',
    description:
      'Drop an image and copy it as a Base64 data URL, raw Base64, an <img> tag, CSS background or Markdown. Converted in your browser, never uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'qr-code',
    label: 'QR code',
    title: 'QR Code Generator',
    heading: 'Generate a QR code',
    description:
      'Type text or a URL and download the QR code as a crisp SVG or PNG, with selectable error correction. Generated in your browser, nothing uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'json-schema-generator',
    label: 'JSON Schema',
    title: 'JSON Schema Generator',
    heading: 'Generate a JSON Schema from JSON',
    description:
      'Paste sample JSON and get a draft 2020-12 JSON Schema — types inferred, keys marked required, date/email/URL formats detected, array items merged. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'http-status-codes',
    label: 'HTTP status',
    title: 'HTTP Status Codes Reference',
    heading: 'HTTP status codes, explained',
    description:
      'Every HTTP status code with what it means and when to use it — searchable by number, name or meaning, filterable by 1xx–5xx category. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'meta-tag-generator',
    label: 'Meta tags',
    title: 'Meta Tag Generator',
    heading: 'Generate SEO meta tags',
    description:
      'Fill in your page title, description, URL and social image and copy a complete head block — title, description, canonical, Open Graph and Twitter card tags, with length warnings. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'box-shadow',
    label: 'Box shadow',
    title: 'CSS Box Shadow Generator',
    heading: 'Build a CSS box shadow',
    description:
      'Drag sliders for offset, blur, spread, color and opacity, layer up to six shadows, preview live and copy the CSS — with presets from subtle card to neon glow. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'flexbox-playground',
    label: 'Flexbox',
    title: 'CSS Flexbox Playground',
    heading: 'Flexbox playground',
    description:
      'Flip every flexbox property — direction, justify, align, wrap, gap, per-item grow/shrink/basis — watch the live preview move, and copy clean CSS with only the properties you changed. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'emoji-picker',
    label: 'Emoji',
    title: 'Emoji Picker for Developers',
    heading: 'Emoji picker for developers',
    description:
      'Search 200+ developer-relevant emojis — commit prefixes, status dots, reactions — click to copy, and grab the Unicode codepoint, HTML entity, JS and CSS escapes. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'svg-optimizer',
    label: 'SVG optimizer',
    title: 'SVG Optimizer',
    heading: 'Optimize an SVG',
    description:
      'Paste SVG markup and get a smaller equivalent — comments, metadata and editor junk stripped, coordinates rounded, paths compacted — with a live preview and byte savings shown. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'favicon-generator',
    label: 'Favicon',
    title: 'Favicon Generator',
    heading: 'Generate favicons from an image',
    description:
      'Drop one image and download every favicon a site needs — 16px to 512px PNGs, apple-touch-icon, a real favicon.ico — plus the HTML snippet. Resized in your browser, never uploaded. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'performance-audit',
    label: 'Perf audit',
    title: 'Web Performance Audit',
    heading: 'Audit a page’s performance',
    description:
      'Paste your page’s HTML and get the Core Web Vitals problems visible in the markup — render-blocking scripts, unsized images, missing lazy loading, font gaps — each with the fix. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'css-grid-generator',
    label: 'CSS grid',
    title: 'CSS Grid Generator',
    heading: 'Build a CSS grid layout',
    description:
      'Set column and row tracks, gaps and named template areas, paint areas straight onto a live grid preview, and copy the CSS and HTML. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'color-palette',
    label: 'Palette',
    title: 'Color Palette Generator',
    heading: 'Generate a color palette',
    description:
      'Pick one base color and get harmonious palettes — complementary, analogous, triadic, split, tetradic, monochromatic — with hex, RGB, HSL, contrast ratios and CSS, SCSS, Tailwind or JSON export. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'markdown-table',
    label: 'MD table',
    title: 'Markdown Table Generator',
    heading: 'Generate a markdown table',
    description:
      'Edit cells like a spreadsheet, set left/center/right alignment per column, import from CSV, Excel or an existing table, and copy neatly padded GitHub-flavored markdown. Free, no sign-up.',
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

// The utility living at this path, or null when the path is an AI tool's (or unknown).
export function utilForPath(pathname) {
  const slug = slugForPath(pathname)
  return UTIL_TOOLS.find((t) => t.slug === slug) ?? null
}
