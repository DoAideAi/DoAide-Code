// Markdown table of contents: find the headings (skipping fenced code), build GitHub-style
// anchor slugs, and render a nested list — optionally inserted back into the document.

export const TOC_START = '<!-- toc -->'
export const TOC_END = '<!-- tocstop -->'

// The heading's visible text: links, images, code spans, emphasis and inline HTML unwrapped.
export function plainText(md) {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // Underscores only emphasise at word edges, so snake_case survives.
    .replace(/(^|\W)__(.+?)__(?!\w)/g, '$1$2')
    .replace(/(^|\W)_(.+?)_(?!\w)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .trim()
}

// GitHub's anchor rule: lowercase, drop punctuation except - and _, spaces become hyphens.
export function githubSlug(text) {
  return plainText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-')
}

// [{ level, text, slug, line }] for every heading outside fenced code and the TOC block itself.
export function extractHeadings(md) {
  const lines = md.split(/\r?\n/)
  const headings = []
  const seen = new Map()
  let fence = null
  let inToc = false
  // YAML front matter (--- … --- at the very top) holds no headings.
  const frontEnd = lines[0] === '---' ? lines.indexOf('---', 1) : -1
  const add = (level, raw, line) => {
    const text = plainText(raw)
    if (!text) return
    const base = githubSlug(raw)
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    headings.push({ level, text, slug: n ? `${base}-${n}` : base, line })
  }
  lines.forEach((line, i) => {
    if (i <= frontEnd) return
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null
      return
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      return
    }
    if (line.trim() === TOC_START) inToc = true
    if (line.trim() === TOC_END) inToc = false
    if (inToc) return
    const atx = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line)
    if (atx) return add(atx[1].length, atx[2], i)
    const next = lines[i + 1]
    if (next !== undefined && line.trim() && !/^ {0,3}([-*_>]|\d+\.|\|)/.test(line)) {
      if (/^ {0,3}=+[ \t]*$/.test(next)) add(1, line.trim(), i)
      else if (/^ {0,3}-+[ \t]*$/.test(next)) add(2, line.trim(), i)
    }
  })
  return headings
}

// The TOC as markdown. Options: minLevel, maxLevel, ordered, indent (spaces), links.
export function buildToc(headings, { minLevel = 2, maxLevel = 3, ordered = false, indent = 2, links = true } = {}) {
  const shown = headings.filter((h) => h.level >= minLevel && h.level <= maxLevel)
  if (!shown.length) return ''
  const top = Math.min(...shown.map((h) => h.level))
  const counters = []
  return shown
    .map((h) => {
      const depth = h.level - top
      counters.length = depth + 1
      counters[depth] = (counters[depth] ?? 0) + 1
      const bullet = ordered ? `${counters[depth]}.` : '-'
      const label = links ? `[${h.text.replace(/([[\]])/g, '\\$1')}](#${h.slug})` : h.text
      return `${' '.repeat(depth * (ordered ? Math.max(indent, 3) : indent))}${bullet} ${label}`
    })
    .join('\n')
}

// The document with the TOC between <!-- toc --> markers: replacing an existing block, else
// placed after the first H1 (or at the top).
export function insertToc(md, toc) {
  const block = `${TOC_START}\n\n${toc}\n\n${TOC_END}`
  const start = md.indexOf(TOC_START)
  const end = md.indexOf(TOC_END)
  if (start >= 0 && end > start) return md.slice(0, start) + block + md.slice(end + TOC_END.length)
  const h1 = extractHeadings(md).find((h) => h.level === 1)
  if (!h1) return `${block}\n\n${md}`
  const lines = md.split('\n')
  const after = /^ {0,3}=+\s*$/.test(lines[h1.line + 1] ?? '') ? h1.line + 2 : h1.line + 1
  const rest = lines.slice(after)
  while (rest.length && !rest[0].trim()) rest.shift()
  return [...lines.slice(0, after), '', block, '', ...rest].join('\n')
}
