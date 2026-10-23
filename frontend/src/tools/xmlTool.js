// The XML formatter (/tools/xml-formatter): a small tokenizer that checks well-formedness with
// line:column errors, then pretty-prints, minifies or converts the tree to JSON. No DTD/XSD.

const NAME = /^[A-Za-z_:][\w.:-]*/
const PREDEFINED = new Set(['lt', 'gt', 'amp', 'quot', 'apos'])

export class XmlError extends Error {
  constructor(message, line, col) {
    super(message)
    this.line = line
    this.col = col
  }
}

// Text → node tree: { type: 'element', name, attrs: [[k, v]], children } plus 'text', 'comment',
// 'cdata', 'pi', 'doctype' and 'decl' nodes. Throws XmlError on the first well-formedness error.
export function parseXml(src) {
  let i = 0
  const lineStarts = [0]
  for (let k = 0; k < src.length; k++) if (src[k] === '\n') lineStarts.push(k + 1)
  const pos = (at) => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= at) lo = mid
      else hi = mid - 1
    }
    return [lo + 1, at - lineStarts[lo] + 1]
  }
  const fail = (msg, at = i) => {
    throw new XmlError(msg, ...pos(at))
  }
  const checkEntities = (text, at) => {
    const re = /&([^;\s&<]*);?/g
    let m
    while ((m = re.exec(text))) {
      const ref = m[1]
      const ok = m[0].endsWith(';') && (PREDEFINED.has(ref) || /^#\d+$/.test(ref) || /^#x[0-9a-f]+$/i.test(ref) || NAME.test(ref))
      if (!ok) fail(`Bad entity reference “${m[0]}” — escape a literal & as &amp;`, at + m.index)
    }
  }

  const root = { type: 'root', children: [] }
  const stack = [root]
  let sawRoot = false
  const top = () => stack[stack.length - 1]

  while (i < src.length) {
    if (src.startsWith('<?', i)) {
      const end = src.indexOf('?>', i)
      if (end < 0) fail('Unclosed processing instruction')
      const body = src.slice(i + 2, end)
      const target = body.match(/^\S+/)?.[0] ?? ''
      if (target.toLowerCase() === 'xml') {
        if (i !== 0 || root.children.length) fail('The <?xml ?> declaration must be the very first thing in the document')
        root.children.push({ type: 'decl', value: body.trim() })
      } else top().children.push({ type: 'pi', value: body.trim() })
      i = end + 2
    } else if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4)
      if (end < 0) fail('Unclosed comment')
      const body = src.slice(i + 4, end)
      if (body.includes('--')) fail('“--” is not allowed inside a comment', i + 4 + body.indexOf('--'))
      top().children.push({ type: 'comment', value: body })
      i = end + 3
    } else if (src.startsWith('<![CDATA[', i)) {
      if (stack.length === 1) fail('CDATA outside the root element')
      const end = src.indexOf(']]>', i)
      if (end < 0) fail('Unclosed CDATA section')
      top().children.push({ type: 'cdata', value: src.slice(i + 9, end) })
      i = end + 3
    } else if (src.startsWith('<!DOCTYPE', i)) {
      if (sawRoot) fail('DOCTYPE must come before the root element')
      let depth = 0
      let k = i
      for (; k < src.length; k++) {
        if (src[k] === '[') depth++
        else if (src[k] === ']') depth--
        else if (src[k] === '>' && depth === 0) break
      }
      if (k >= src.length) fail('Unclosed DOCTYPE')
      root.children.push({ type: 'doctype', value: src.slice(i + 2, k) })
      i = k + 1
    } else if (src.startsWith('</', i)) {
      const start = i
      const m = NAME.exec(src.slice(i + 2))
      if (!m) fail('Expected a tag name after </')
      i += 2 + m[0].length
      while (/\s/.test(src[i] ?? '')) i++
      if (src[i] !== '>') fail(`Expected > to close </${m[0]}`)
      i++
      const open = top()
      if (open.type !== 'element') fail(`Closing tag </${m[0]}> has no matching opening tag`, start)
      if (open.name !== m[0]) fail(`Expected </${open.name}> but found </${m[0]}>`, start)
      stack.pop()
    } else if (src[i] === '<') {
      const start = i
      const m = NAME.exec(src.slice(i + 1))
      if (!m) fail('Expected a tag name after <')
      const atTop = stack.length === 1
      if (atTop && sawRoot) fail('Only one root element is allowed', start)
      if (atTop) sawRoot = true
      const el = { type: 'element', name: m[0], attrs: [], children: [] }
      i += 1 + m[0].length
      for (;;) {
        const ws = /^\s*/.exec(src.slice(i))[0].length
        i += ws
        if (src.startsWith('/>', i)) {
          i += 2
          top().children.push(el)
          break
        }
        if (src[i] === '>') {
          i++
          top().children.push(el)
          stack.push(el)
          break
        }
        if (i >= src.length) fail(`Unclosed tag <${el.name}>`, start)
        if (!ws) fail('Expected whitespace between attributes')
        const a = NAME.exec(src.slice(i))
        if (!a) fail(`Unexpected “${src[i]}” in <${el.name}>`)
        const attrAt = i
        i += a[0].length
        while (/\s/.test(src[i] ?? '')) i++
        if (src[i] !== '=') fail(`Attribute ${a[0]} needs a value, like ${a[0]}="…"`)
        i++
        while (/\s/.test(src[i] ?? '')) i++
        const q = src[i]
        if (q !== '"' && q !== "'") fail(`Attribute values must be quoted: ${a[0]}="…"`)
        const end = src.indexOf(q, i + 1)
        if (end < 0) fail(`Unclosed attribute value for ${a[0]}`)
        const value = src.slice(i + 1, end)
        if (value.includes('<')) fail('“<” is not allowed in an attribute value — use &lt;', i + 1 + value.indexOf('<'))
        checkEntities(value, i + 1)
        if (el.attrs.some(([k]) => k === a[0])) fail(`Duplicate attribute ${a[0]}`, attrAt)
        el.attrs.push([a[0], value])
        i = end + 1
      }
    } else {
      const next = src.indexOf('<', i)
      const end = next < 0 ? src.length : next
      const text = src.slice(i, end)
      if (stack.length === 1) {
        if (text.trim()) fail('Text outside the root element', i + text.search(/\S/))
      } else {
        checkEntities(text, i)
        top().children.push({ type: 'text', value: text })
      }
      i = end
    }
  }
  if (stack.length > 1) fail(`<${top().name}> is never closed`, src.length)
  if (!sawRoot) fail('No root element', src.length)
  return root
}

const attrs = (el) => el.attrs.map(([k, v]) => ` ${k}="${v}"`).join('')

function serialize(node, { indent, minify, keepComments }, depth = 0) {
  const pad = minify ? '' : indent.repeat(depth)
  const nl = minify ? '' : '\n'
  switch (node.type) {
    case 'decl':
      return `${pad}<?${node.value}?>`
    case 'pi':
      return `${pad}<?${node.value}?>`
    case 'doctype':
      return `${pad}<!${node.value}>`
    case 'comment':
      return keepComments ? `${pad}<!--${node.value}-->` : ''
    case 'cdata':
      return `${pad}<![CDATA[${node.value}]]>`
    case 'text': {
      const t = minify ? node.value.replace(/\s+/g, ' ').trim() : node.value.trim()
      return t ? `${pad}${t}` : ''
    }
    default: {
      const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()) && (keepComments || c.type !== 'comment'))
      if (!kids.length) return `${pad}<${node.name}${attrs(node)}/>`
      // A single text/CDATA child stays on the tag's line.
      if (kids.length === 1 && (kids[0].type === 'text' || kids[0].type === 'cdata')) {
        return `${pad}<${node.name}${attrs(node)}>${serialize(kids[0], { indent: '', minify, keepComments })}</${node.name}>`
      }
      const inner = kids.map((c) => serialize(c, { indent, minify, keepComments }, depth + 1)).filter(Boolean)
      return `${pad}<${node.name}${attrs(node)}>${nl}${inner.join(nl)}${nl}${pad}</${node.name}>`
    }
  }
}

// Pretty-print (indent: '  ', '    ' or '\t') or minify. Throws XmlError.
export function formatXml(src, { indent = '  ', minify = false, keepComments = true } = {}) {
  const root = parseXml(src)
  const opts = { indent, minify, keepComments }
  return root.children
    .map((c) => serialize(c, opts, 0))
    .filter(Boolean)
    .join(minify ? '' : '\n')
}

const decode = (s) =>
  s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e) => {
    const map = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
    if (map[e]) return map[e]
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  })

// Element → JSON value: attributes as @name, repeated children as arrays, text-only elements as
// strings, mixed text under #text, empty elements as null.
function toValue(el) {
  const out = {}
  for (const [k, v] of el.attrs) out[`@${k}`] = decode(v)
  const many = new Set()
  const texts = []
  for (const c of el.children) {
    if (c.type === 'text' && c.value.trim()) texts.push(decode(c.value.trim()))
    else if (c.type === 'cdata') texts.push(c.value)
    else if (c.type === 'element') {
      const v = toValue(c)
      if (many.has(c.name)) out[c.name].push(v)
      else if (c.name in out) {
        out[c.name] = [out[c.name], v]
        many.add(c.name)
      } else out[c.name] = v
    }
  }
  const keys = Object.keys(out)
  if (!keys.length) return texts.length ? texts.join(' ') : null
  if (texts.length) out['#text'] = texts.join(' ')
  return out
}

export function xmlToJson(src, indent = 2) {
  const root = parseXml(src)
  const el = root.children.find((c) => c.type === 'element')
  return JSON.stringify({ [el.name]: toValue(el) }, null, indent)
}
