// A small Markdown renderer for replies: headings, paragraphs, lists, quotes, rules, and inline
// code, bold, italic, strikethrough and links. Fenced code is split out before this (splitFences);
// no HTML is ever interpreted, so a reply cannot inject markup.

const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^ {0,3}([-*_])( *\1){2,} *$/
const QUOTE = /^ {0,3}> ?(.*)$/
const BULLET = /^(\s*)[-*+]\s+(.*)$/
const NUMBERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/

// Lines to blocks: { type: 'heading', level, text } | { type: 'rule' } | { type: 'quote', text }
// | { type: 'list', ordered, start, items: [{ text, depth }] } | { type: 'paragraph', text }.
export function parseBlocks(text) {
  const blocks = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      i++
      continue
    }
    if (RULE.test(line)) {
      blocks.push({ type: 'rule' })
      i++
      continue
    }
    if (QUOTE.test(line)) {
      const quoted = []
      while (i < lines.length && QUOTE.test(lines[i])) quoted.push(QUOTE.exec(lines[i++])[1])
      blocks.push({ type: 'quote', text: quoted.join('\n') })
      continue
    }
    const first = BULLET.exec(line) ?? NUMBERED.exec(line)
    if (first) {
      const ordered = !BULLET.test(line)
      const base = first[1].length
      const items = []
      while (i < lines.length && lines[i].trim()) {
        const item = BULLET.exec(lines[i]) ?? NUMBERED.exec(lines[i])
        if (item) {
          items.push({ text: item.at(-1), depth: Math.min(3, Math.floor(Math.max(0, item[1].length - base) / 2)) })
        } else if (items.length && /^\s+/.test(lines[i])) {
          // An indented line continues the item above it.
          items.at(-1).text += `\n${lines[i].trim()}`
        } else break
        i++
      }
      blocks.push({ type: 'list', ordered, start: ordered ? Number(NUMBERED.exec(line)[2]) : 1, items })
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
      !NUMBERED.test(lines[i])
    ) {
      para.push(lines[i++])
    }
    blocks.push({ type: 'paragraph', text: para.join('\n') })
  }
  return blocks
}

// Only these open from a link: never javascript: or data:.
export function safeHref(url) {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null
}

const INLINE = new RegExp(
  [
    '`[^`\\n]+`', // code
    '\\*\\*[^*\\n]+\\*\\*', // bold
    '__[^_\\n]+__', // bold
    '~~[^~\\n]+~~', // strikethrough
    '\\[[^\\]\\n]+\\]\\([^)\\s]+\\)', // [label](url)
    'https?:\\/\\/[^\\s<>()]*[^\\s<>().,;:!?\'"]', // a bare link, without trailing punctuation
    '\\*[^*\\s](?:[^*\\n]*[^*\\s])?\\*', // italic: *not spaced out*, so 2 * 3 * 4 stays maths
    '(?<!\\w)_[^_\\s](?:[^_\\n]*[^_\\s])?_(?!\\w)', // italic: _word_, but never snake_case
  ].join('|'),
  'g',
)

// Inline Markdown to React nodes.
export function Inline({ text }) {
  return text.split(new RegExp(`(${INLINE.source})`, 'g')).map((piece, i) => {
    if (i % 2 === 0) return piece
    if (piece.startsWith('`'))
      return (
        <code key={i} className="rounded-md bg-shade/30 px-1.5 py-0.5 font-mono text-[0.88em] text-sky-200">
          {piece.slice(1, -1)}
        </code>
      )
    if (piece.startsWith('**') || piece.startsWith('__'))
      return (
        <strong key={i} className="font-semibold text-zinc-50">
          <Inline text={piece.slice(2, -2)} />
        </strong>
      )
    if (piece.startsWith('~~'))
      return (
        <s key={i} className="text-zinc-400">
          <Inline text={piece.slice(2, -2)} />
        </s>
      )
    if (piece.startsWith('[')) {
      const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece)
      const href = safeHref(url)
      return href ? (
        <Link key={i} href={href}>
          <Inline text={label} />
        </Link>
      ) : (
        <Inline key={i} text={label} />
      )
    }
    if (/^https?:/i.test(piece))
      return (
        <Link key={i} href={piece}>
          {piece}
        </Link>
      )
    return (
      <em key={i} className="italic">
        <Inline text={piece.slice(1, -1)} />
      </em>
    )
  })
}

function Link({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:decoration-sky-300 [overflow-wrap:anywhere]">
      {children}
    </a>
  )
}

const HEADING_CLASS = ['text-lg', 'text-base', 'text-[15px]', 'text-[15px]', 'text-sm', 'text-sm']

export function Markdown({ text }) {
  return parseBlocks(text).map((block, i) => {
    if (block.type === 'heading') {
      const Tag = `h${Math.min(block.level + 2, 6)}`
      return (
        <Tag key={i} className={`mb-1 mt-3 font-semibold text-zinc-50 first:mt-0 ${HEADING_CLASS[block.level - 1]}`}>
          <Inline text={block.text} />
        </Tag>
      )
    }
    if (block.type === 'rule') return <hr key={i} className="my-3 border-line/[0.12]" />
    if (block.type === 'quote')
      return (
        <blockquote key={i} className="my-2 whitespace-pre-wrap border-l-2 border-zinc-600 pl-3 text-zinc-300">
          <Inline text={block.text} />
        </blockquote>
      )
    if (block.type === 'list') {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag
          key={i}
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          className={`my-1.5 space-y-0.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-zinc-500`}
        >
          {block.items.map((item, j) => (
            <li key={j} className="whitespace-pre-wrap break-words pl-0.5" style={item.depth ? { marginLeft: `${item.depth * 1.25}rem` } : undefined}>
              <Inline text={item.text} />
            </li>
          ))}
        </Tag>
      )
    }
    return (
      <p key={i} className="my-1.5 whitespace-pre-wrap break-words first:mt-0 last:mb-0">
        <Inline text={block.text} />
      </p>
    )
  })
}
