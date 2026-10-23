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
    slug: 'text-diff',
    label: 'Text diff',
    title: 'Text Diff Checker',
    heading: 'Compare two texts',
    description:
      'Paste two versions of any text — essays, contracts, configs, lists — and see added, removed and changed lines with the exact words highlighted. Ignore case, whitespace or blank lines. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'html-entities',
    label: 'HTML entities',
    title: 'HTML Entity Encoder & Decoder',
    heading: 'Encode and decode HTML entities',
    description:
      'Escape text for HTML with named (&copy;) or numeric (&#169;) entities, or decode any entity back to characters — with a click-to-copy reference of the common ones. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'ascii-art',
    label: 'ASCII art',
    title: 'ASCII Art Text Generator',
    heading: 'Turn text into ASCII art',
    description:
      'Type a word and get big ASCII art text in 18 FIGlet fonts — Standard, ANSI Shadow, Slant, Doom, Star Wars and more — ready to wrap in a code comment for READMEs, CLIs and source banners. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'uuid-generator',
    label: 'UUID',
    title: 'UUID Generator',
    heading: 'Generate UUIDs',
    description:
      'Generate v4 random, v7 time-ordered or v1 UUIDs — one or a thousand at once — in uppercase, without hyphens or in braces, and decode any UUID’s version and timestamp. Cryptographically random, free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'password-generator',
    label: 'Password',
    title: 'Strong Password Generator',
    heading: 'Generate a strong password',
    description:
      'Create random passwords from 4 to 128 characters with the letters, numbers and symbols you choose, see the entropy and time-to-crack, and check how strong your own password is. Generated in your browser, never sent. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'json-formatter',
    label: 'JSON viewer',
    title: 'JSON Formatter & Validator',
    heading: 'Validate and explore JSON',
    description:
      'Paste JSON to validate, format or minify it, see the exact line of any error, and explore it as a collapsible tree — search keys and values, expand or collapse all, and click any node for its JSONPath. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'api-mocker',
    label: 'API mocker',
    title: 'Mock API Generator',
    heading: 'Mock an API in seconds',
    description:
      'Define REST endpoints — method, path with :params, status code, delay and JSON body — and get a live URL that serves them to your frontend, tests or Postman. CORS open, no sign-up, free.',
    isNew: true,
  },
  {
    slug: 'chmod-calculator',
    label: 'Chmod',
    title: 'Chmod Calculator',
    heading: 'Calculate chmod permissions',
    description:
      'Tick read, write and execute for owner, group and others — or type 755, 0644 or rwxr-xr-x — and get the octal and symbolic chmod commands, special bits (setuid, setgid, sticky) and a plain-English explanation. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'ip-subnet-calculator',
    label: 'IP subnet',
    title: 'IP Subnet Calculator (CIDR)',
    heading: 'IP subnet calculator',
    description:
      'Enter an IPv4 address with a CIDR prefix or netmask and get the network and broadcast address, usable host range, subnet and wildcard masks, binary view, private/public type, a split into smaller subnets and an is-this-IP-in-range check. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'markdown-toc',
    label: 'TOC',
    title: 'Markdown Table of Contents Generator',
    heading: 'Generate a markdown table of contents',
    description:
      'Paste a README or any markdown and get a table of contents with GitHub-compatible anchor links — choose heading levels, bullets or numbers, and insert it straight into the document. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'placeholder-image',
    label: 'Placeholder',
    title: 'Placeholder Image Generator',
    heading: 'Generate placeholder images',
    description:
      'Make placeholder images at any size up to 4000×4000 — Open Graph, Instagram, banner and avatar presets, custom colors, text and font — and download PNG, JPEG, WebP or SVG, or copy a data URI. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'css-animation',
    label: 'CSS animation',
    title: 'CSS Animation Generator',
    heading: 'CSS animation generator',
    description:
      'Build CSS @keyframes visually: pick a preset (bounce, pulse, shake, fade, spin…), edit move, scale, rotate, skew and opacity at each keyframe on a timeline, tune duration, easing with a cubic-bezier curve, iterations and direction, and copy the CSS. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'css-to-tailwind',
    label: 'CSS → Tailwind',
    title: 'CSS to Tailwind Converter',
    heading: 'Convert CSS to Tailwind',
    description:
      'Paste CSS and get Tailwind CSS utility classes for every selector — spacing, sizing, flexbox, grid, typography, colors, borders and shadows — with hover, focus, responsive (sm/md/lg) and dark-mode variants. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'sql-to-mongodb',
    label: 'SQL → MongoDB',
    title: 'SQL to MongoDB Query Converter',
    heading: 'Convert SQL to MongoDB queries',
    description:
      'Paste a SQL query and get the MongoDB shell equivalent — find with filters, projection, sort and limit; countDocuments; distinct; aggregation pipelines for GROUP BY and HAVING; insertMany, updateMany and deleteMany. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'og-preview',
    label: 'OG preview',
    title: 'Open Graph Preview & Checker',
    heading: 'Preview Open Graph link cards',
    description:
      'Paste a page’s HTML or type the og:title, description and image, and see how the link looks on Google, Facebook, X/Twitter, LinkedIn, WhatsApp, Slack and Discord — with checks for missing tags, lengths and image size. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'csv-to-json',
    label: 'CSV → JSON',
    title: 'CSV to JSON & SQL Converter',
    heading: 'Convert CSV to JSON or SQL',
    description:
      'Paste or drop a CSV (or TSV) and convert it to a JSON array, JSON keyed by column, SQL CREATE TABLE and INSERT statements, or back from JSON to CSV — auto-detected delimiter, quoted fields, header row and number/boolean typing. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'yaml-to-json',
    label: 'YAML ↔ JSON',
    title: 'YAML to JSON Converter',
    heading: 'Convert YAML to JSON and back',
    description:
      'Convert YAML to JSON or JSON to YAML as you type, with the exact line of any syntax error, anchors and aliases resolved, multi-document YAML, and indent options. Converted in your browser. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'xml-formatter',
    label: 'XML',
    title: 'XML Formatter & Validator',
    heading: 'Format and validate XML',
    description:
      'Paste XML to pretty-print or minify it, check it is well-formed with the line of any error, and convert it to JSON — attributes, namespaces, CDATA and comments kept. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'csp-generator',
    label: 'CSP',
    title: 'Content Security Policy (CSP) Generator',
    heading: 'Build a Content Security Policy',
    description:
      'Build a Content-Security-Policy header directive by directive — script-src, style-src, img-src, connect-src, frame-ancestors and more — with presets, nonce and hash help, or paste an existing policy to audit it for unsafe-inline, wildcards and missing directives. Copy it as a header, meta tag, nginx, Apache or Express config. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'cors-tester',
    label: 'CORS',
    title: 'CORS Header Tester & Generator',
    heading: 'Test and fix CORS headers',
    description:
      'Describe the request — origin, method, headers, credentials — and paste the server’s response headers to see whether the browser will allow it, why not, and whether a preflight is sent. Then copy the right CORS config for nginx, Express, FastAPI or Apache. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'number-base-converter',
    label: 'Base converter',
    title: 'Number Base Converter (Binary, Hex, Octal)',
    heading: 'Convert binary, hex, octal and decimal',
    description:
      'Convert numbers between binary, octal, decimal, hexadecimal and any base from 2 to 36 — big integers included — see the bits for 8 to 64-bit signed and unsigned types, and run bitwise AND, OR, XOR, NOT and shifts. Free, no sign-up.',
    isNew: true,
  },
]

// The utility living at this path, or null when the path is an AI tool's (or unknown).
export function utilForPath(pathname) {
  const slug = slugForPath(pathname)
  return UTIL_TOOLS.find((t) => t.slug === slug) ?? null
}
