// The SVG optimizer (/tools/svg-optimizer): paste SVG markup, get a smaller equivalent — comments,
// metadata and editor junk removed, numbers rounded, whitespace collapsed. DOM-based (parse,
// clean, serialize), so structure is never guessed at with regexes. All in the browser.

export const MAX_SVG_INPUT = 500_000

const EDITOR_PREFIXES = ['inkscape', 'sodipodi', 'sketch', 'figma', 'illustrator', 'serif']
const STRIP_TAGS = new Set(['metadata'])
const NUMERIC_ATTRS = new Set([
  'd', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'transform', 'viewBox', 'stroke-width', 'stroke-dashoffset',
  'stroke-dasharray', 'offset', 'stdDeviation', 'dx', 'dy', 'opacity',
  'fill-opacity', 'stroke-opacity', 'stroke-miterlimit', 'gradientTransform', 'patternTransform',
])

const roundNumbers = (value, precision) =>
  value.replace(/-?\d+\.\d+(e-?\d+)?/gi, (n) => {
    const r = Number(Number(n).toFixed(precision))
    return String(r)
  })

function clean(el, opts) {
  for (const child of [...el.childNodes]) {
    if (child.nodeType === 8) {
      child.remove() // comment
    } else if (child.nodeType === 3) {
      if (!child.nodeValue.trim()) child.remove()
    } else if (child.nodeType === 1) {
      const tag = child.localName
      if (STRIP_TAGS.has(tag) || (opts.removeTitles && (tag === 'title' || tag === 'desc'))) {
        child.remove()
        continue
      }
      if (EDITOR_PREFIXES.some((p) => child.nodeName.startsWith(`${p}:`))) {
        child.remove()
        continue
      }
      clean(child, opts)
      // Empty groups and defs contribute nothing once their children are gone.
      if ((tag === 'g' || tag === 'defs') && !child.childNodes.length && !child.attributes.length) child.remove()
    }
  }
  for (const attr of [...el.attributes]) {
    const name = attr.name
    if (EDITOR_PREFIXES.some((p) => name === `xmlns:${p}` || name.startsWith(`${p}:`)) || name === 'xml:space') {
      el.removeAttribute(name)
      continue
    }
    if (NUMERIC_ATTRS.has(name)) {
      let v = roundNumbers(attr.value, opts.precision)
      if (name === 'd' || name === 'points') v = v.replace(/\s+/g, ' ').replace(/ ?([MLHVCSQTAZmlhvcsqtaz,]) ?/g, '$1').trim()
      el.setAttribute(name, v)
    }
  }
}

// SVG text in, { svg, before, after, saved } out. Throws with a readable message on bad input.
export function optimizeSvg(text, { precision = 2, removeTitles = true } = {}) {
  const input = text.trim()
  if (!input) throw new Error('Paste some SVG markup first.')
  if (input.length > MAX_SVG_INPUT) throw new Error(`Too long: this tool takes up to ${MAX_SVG_INPUT.toLocaleString()} characters.`)
  // The prolog and doctype are legal but useless for inline/embedded SVG.
  const body = input.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/g, '').trim()
  const doc = new DOMParser().parseFromString(body, 'image/svg+xml')
  const error = doc.querySelector('parsererror')
  if (error || doc.documentElement.localName !== 'svg') {
    throw new Error('Not valid SVG: the markup could not be parsed. Check for unclosed tags or a missing <svg> root.')
  }
  clean(doc.documentElement, { precision, removeTitles })
  let out = new XMLSerializer().serializeToString(doc.documentElement)
  out = out.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ')
  return { svg: out, before: input.length, after: out.length, saved: Math.max(0, input.length - out.length) }
}

// "12.4 KB → 8.1 KB (35% smaller)" for the result banner.
export function savingsLabel({ before, after, saved }) {
  const kb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`)
  const pct = before ? Math.round((saved / before) * 100) : 0
  return `${kb(before)} → ${kb(after)} (${pct}% smaller)`
}
