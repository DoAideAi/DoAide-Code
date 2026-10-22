// The Markdown → HTML converter (/tools/markdown-to-html): a small CommonMark-flavored subset —
// headings, lists, quotes, fenced code, rules, tables, and inline bold/italic/strike/code/links/
// images. All input text is escaped, so the generated HTML is safe to preview; javascript: URLs
// are dropped. Runs in the page.

export const MAX_MD_CHARS = 200_000

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// href/src values: escaped, and only http(s), mailto, relative or anchor destinations survive.
function safeUrl(url) {
  const u = url.trim()
  if (/^(https?:|mailto:|\/|\.|#)/i.test(u)) return esc(u)
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return esc(u)
  return ''
}

// Inline markdown inside already-escaped text: code first (its contents stay literal), then
// images, links, bold, italic, strikethrough.
export function inlineHtml(raw) {
  let text = esc(raw)
  const stash = []
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    stash.push(`<code>${code}</code>`)
    return `\u0000${stash.length - 1}\u0000`
  })
  // The URL may hold one level of parentheses, like en.wikipedia.org/wiki/X_(Y).
  const URL_PART = /([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)/
  const IMG = new RegExp(`!\\[([^\\]]*)\\]\\(${URL_PART.source}\\)`, 'g')
  const LINK = new RegExp(`\\[([^\\]]+)\\]\\(${URL_PART.source}\\)`, 'g')
  text = text.replace(IMG, (_, alt, url) => {
    const src = safeUrl(url)
    return src ? `<img src="${src}" alt="${alt}" />` : alt
  })
  text = text.replace(LINK, (_, label, url) => {
    const href = safeUrl(url)
    return href ? `<a href="${href}">${label}</a>` : label
  })
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)])
}

const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^ {0,3}([-*_])( *\1){2,} *$/
const QUOTE = /^ {0,3}> ?(.*)$/
const BULLET = /^(\s*)[-*+]\s+(.*)$/
const NUMBERED = /^(\s*)\d{1,9}[.)]\s+(.*)$/
const FENCE = /^ {0,3}```\s*(\S*)\s*$/
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/

const cells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

// The whole document converted to an HTML string.
export function markdownToHtml(text) {
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const fence = FENCE.exec(line)
    if (fence) {
      const code = []
      i++
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++])
      i++ // Closing fence (or end of input).
      const lang = fence[1] ? ` class="language-${esc(fence[1])}"` : ''
      out.push(`<pre><code${lang}>${esc(code.join('\n'))}</code></pre>`)
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      out.push(`<h${heading[1].length}>${inlineHtml(heading[2])}</h${heading[1].length}>`)
      i++
      continue
    }
    if (RULE.test(line)) {
      out.push('<hr />')
      i++
      continue
    }
    if (QUOTE.test(line)) {
      const quoted = []
      while (i < lines.length && QUOTE.test(lines[i])) quoted.push(QUOTE.exec(lines[i++])[1])
      out.push(`<blockquote>${markdownToHtml(quoted.join('\n'))}</blockquote>`)
      continue
    }
    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line)
      const re = ordered ? NUMBERED : BULLET
      const items = []
      while (i < lines.length && re.test(lines[i])) items.push(re.exec(lines[i++])[2])
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</${tag}>`)
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]))
      const tr = (row, tag) => `<tr>${row.map((c) => `<${tag}>${inlineHtml(c)}</${tag}>`).join('')}</tr>`
      out.push(`<table><thead>${tr(head, 'th')}</thead><tbody>${rows.map((r) => tr(r, 'td')).join('')}</tbody></table>`)
      continue
    }
    const para = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i]) &&
      !FENCE.test(lines[i])
    )
      para.push(lines[i++])
    out.push(`<p>${inlineHtml(para.join('\n'))}</p>`)
  }
  return out.join('\n')
}

export const SAMPLE_MD = `# Markdown to HTML

Type **Markdown** on the left, get *clean HTML* on the right.

- Headings, lists and quotes
- \`inline code\` and fenced blocks
- [Links](https://code.doaide.com) and tables

| Feature | Works |
| ------- | ----- |
| Tables  | yes   |

> Nothing you type leaves this page.
`
