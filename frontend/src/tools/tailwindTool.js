// CSS → Tailwind (v3) utility classes. Known properties map to scale classes when the value is
// on Tailwind's default scale and to arbitrary values (w-[13px]) when not; anything else
// becomes an arbitrary property ([mask-type:alpha]), so every declaration converts.

const SPACING = { 0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3', 14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10', 44: '11', 48: '12', 56: '14', 64: '16', 80: '20', 96: '24', 112: '28', 128: '32', 144: '36', 160: '40', 176: '44', 192: '48', 208: '52', 224: '56', 240: '60', 256: '64', 288: '72', 320: '80', 384: '96' }
const FONT_SIZE = { 12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl', 30: '3xl', 36: '4xl', 48: '5xl', 60: '6xl', 72: '7xl', 96: '8xl', 128: '9xl' }
const RADIUS = { 0: 'none', 2: 'sm', 4: '', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl', 24: '3xl', 9999: 'full' }
const WEIGHT = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black', normal: 'normal', bold: 'bold' }
const LEADING = { 1: 'none', 1.25: 'tight', 1.375: 'snug', 1.5: 'normal', 1.625: 'relaxed', 2: 'loose' }
const TRACKING = { '-0.05em': 'tighter', '-0.025em': 'tight', '0': 'normal', '0em': 'normal', '0.025em': 'wide', '0.05em': 'wider', '0.1em': 'widest' }
const OPACITY = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
const Z = [0, 10, 20, 30, 40, 50]
const SCREENS = { 640: 'sm', 768: 'md', 1024: 'lg', 1280: 'xl', 1536: '2xl' }
const PSEUDO = ['hover', 'focus', 'active', 'visited', 'disabled', 'focus-visible', 'focus-within', 'first-child', 'last-child', 'checked', 'placeholder', 'before', 'after']
const PSEUDO_PREFIX = { 'first-child': 'first', 'last-child': 'last' }
const MAX_W = { 320: 'xs', 384: 'sm', 448: 'md', 512: 'lg', 576: 'xl', 672: '2xl', 768: '3xl', 896: '4xl', 1024: '5xl', 1152: '6xl', 1280: '7xl' }

const KEYWORDS = {
  display: { block: 'block', 'inline-block': 'inline-block', inline: 'inline', flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid', none: 'hidden', contents: 'contents', table: 'table', 'list-item': 'list-item' },
  position: { static: 'static', relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky' },
  'flex-direction': { row: 'flex-row', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' },
  'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' },
  'justify-content': { 'flex-start': 'justify-start', start: 'justify-start', 'flex-end': 'justify-end', end: 'justify-end', center: 'justify-center', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly', normal: 'justify-normal', stretch: 'justify-stretch' },
  'align-items': { 'flex-start': 'items-start', start: 'items-start', 'flex-end': 'items-end', end: 'items-end', center: 'items-center', baseline: 'items-baseline', stretch: 'items-stretch' },
  'align-self': { auto: 'self-auto', 'flex-start': 'self-start', 'flex-end': 'self-end', center: 'self-center', stretch: 'self-stretch', baseline: 'self-baseline' },
  'align-content': { 'flex-start': 'content-start', 'flex-end': 'content-end', center: 'content-center', 'space-between': 'content-between', 'space-around': 'content-around', 'space-evenly': 'content-evenly', stretch: 'content-stretch' },
  'justify-items': { start: 'justify-items-start', end: 'justify-items-end', center: 'justify-items-center', stretch: 'justify-items-stretch' },
  'place-items': { center: 'place-items-center', start: 'place-items-start', end: 'place-items-end', stretch: 'place-items-stretch' },
  'text-align': { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify', start: 'text-start', end: 'text-end' },
  'text-transform': { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' },
  'text-decoration': { underline: 'underline', 'line-through': 'line-through', none: 'no-underline', overline: 'overline' },
  'text-decoration-line': { underline: 'underline', 'line-through': 'line-through', none: 'no-underline', overline: 'overline' },
  'font-style': { italic: 'italic', normal: 'not-italic' },
  'white-space': { normal: 'whitespace-normal', nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-line': 'whitespace-pre-line', 'pre-wrap': 'whitespace-pre-wrap', 'break-spaces': 'whitespace-break-spaces' },
  'word-break': { 'break-all': 'break-all', 'keep-all': 'break-keep', normal: 'break-normal' },
  'overflow-wrap': { anywhere: 'break-words', 'break-word': 'break-words' },
  'text-overflow': { ellipsis: 'text-ellipsis', clip: 'text-clip' },
  overflow: { auto: 'overflow-auto', hidden: 'overflow-hidden', visible: 'overflow-visible', scroll: 'overflow-scroll', clip: 'overflow-clip' },
  'overflow-x': { auto: 'overflow-x-auto', hidden: 'overflow-x-hidden', visible: 'overflow-x-visible', scroll: 'overflow-x-scroll' },
  'overflow-y': { auto: 'overflow-y-auto', hidden: 'overflow-y-hidden', visible: 'overflow-y-visible', scroll: 'overflow-y-scroll' },
  cursor: { pointer: 'cursor-pointer', default: 'cursor-default', 'not-allowed': 'cursor-not-allowed', wait: 'cursor-wait', text: 'cursor-text', move: 'cursor-move', grab: 'cursor-grab', auto: 'cursor-auto', 'zoom-in': 'cursor-zoom-in', help: 'cursor-help' },
  'object-fit': { contain: 'object-contain', cover: 'object-cover', fill: 'object-fill', none: 'object-none', 'scale-down': 'object-scale-down' },
  'border-style': { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted', double: 'border-double', none: 'border-none', hidden: 'border-hidden' },
  visibility: { visible: 'visible', hidden: 'invisible', collapse: 'collapse' },
  'pointer-events': { none: 'pointer-events-none', auto: 'pointer-events-auto' },
  'user-select': { none: 'select-none', text: 'select-text', all: 'select-all', auto: 'select-auto' },
  'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
  'list-style-type': { none: 'list-none', disc: 'list-disc', decimal: 'list-decimal' },
  'list-style': { none: 'list-none', disc: 'list-disc', decimal: 'list-decimal' },
  'vertical-align': { top: 'align-top', middle: 'align-middle', bottom: 'align-bottom', baseline: 'align-baseline', 'text-top': 'align-text-top', 'text-bottom': 'align-text-bottom' },
  float: { left: 'float-left', right: 'float-right', none: 'float-none' },
  clear: { left: 'clear-left', right: 'clear-right', both: 'clear-both', none: 'clear-none' },
  'box-shadow': { none: 'shadow-none' },
  'flex-grow': { 0: 'grow-0', 1: 'grow' },
  'flex-shrink': { 0: 'shrink-0', 1: 'shrink' },
  flex: { 1: 'flex-1', '1 1 0%': 'flex-1', '1 1 0': 'flex-1', auto: 'flex-auto', '1 1 auto': 'flex-auto', initial: 'flex-initial', '0 1 auto': 'flex-initial', none: 'flex-none' },
  'aspect-ratio': { '1 / 1': 'aspect-square', '1/1': 'aspect-square', 1: 'aspect-square', '16 / 9': 'aspect-video', '16/9': 'aspect-video', auto: 'aspect-auto' },
  isolation: { isolate: 'isolate', auto: 'isolation-auto' },
  resize: { none: 'resize-none', both: 'resize', vertical: 'resize-y', horizontal: 'resize-x' },
  'transition-property': { none: 'transition-none', all: 'transition-all' },
}

const arb = (v) => `[${v.trim().replace(/\s+/g, '_')}]`

// px for "12px", "0.75rem"/"0.75em"→12 (16px base), "0"→0; null for anything else.
export function toPx(value) {
  const m = /^(-?\d*\.?\d+)(px|rem)?$/.exec(value.trim())
  if (!m) return null
  if (!m[2] && Number(m[1]) !== 0) return null
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
}

// A spacing-scale suffix ("4", "px", "[13px]", "auto", "full", "1/2") for one length value.
function spacing(value, { allowFraction = false } = {}) {
  const v = value.trim()
  if (v === 'auto') return 'auto'
  if (allowFraction) {
    if (v === '100%') return 'full'
    const pct = { '50%': '1/2', '33.333333%': '1/3', '33.3333%': '1/3', '66.666667%': '2/3', '25%': '1/4', '75%': '3/4', '20%': '1/5', '40%': '2/5', '60%': '3/5', '80%': '4/5' }[v]
    if (pct) return pct
    if (v === '100vw') return 'screen'
    if (v === '100vh') return 'screen'
    if (['min-content', 'max-content', 'fit-content'].includes(v)) return v.replace('-content', '')
  }
  const px = toPx(v)
  if (px !== null && SPACING[Math.abs(px)] !== undefined) return SPACING[Math.abs(px)]
  return arb(v)
}

function signed(prefix, value, opts) {
  const v = value.trim()
  const neg = v.startsWith('-') && toPx(v) !== null && SPACING[Math.abs(toPx(v))] !== undefined
  return `${neg ? '-' : ''}${prefix}-${spacing(neg ? v.slice(1) : v, opts)}`
}

// Splits "1px solid #ccc" style values on spaces outside parentheses.
export function splitValue(value) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const ch of value.trim()) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (/\s/.test(ch) && depth === 0) {
      if (cur) parts.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur) parts.push(cur)
  return parts
}

function boxSides(prefix, value) {
  const p = splitValue(value)
  const [t, r = t, b = t, l = r] = p
  if (t === r && r === b && b === l) return [signed(prefix, t)]
  if (t === b && r === l) return [signed(`${prefix}y`, t), signed(`${prefix}x`, r)]
  return [signed(`${prefix}t`, t), signed(`${prefix}r`, r), signed(`${prefix}b`, b), signed(`${prefix}l`, l)]
}

function color(prefix, value) {
  const v = value.trim().toLowerCase()
  if (['transparent', 'black', 'white', 'inherit'].includes(v)) return `${prefix}-${v}`
  if (v === 'currentcolor') return `${prefix}-current`
  if (v === '#fff' || v === '#ffffff') return `${prefix}-white`
  if (v === '#000' || v === '#000000') return `${prefix}-black`
  return `${prefix}-${arb(value)}`
}

const isColor = (v) => /^(#|rgb|hsl|oklch|lab|lch|color\(|transparent$|currentcolor$|[a-z]+$)/i.test(v) && !/^(solid|dashed|dotted|double|none|hidden|thin|medium|thick)$/i.test(v)

function border(prefix, value) {
  const out = []
  for (const part of splitValue(value)) {
    if (/^(solid|dashed|dotted|double|none|hidden)$/.test(part)) {
      if (part !== 'solid') out.push(`border-${part}`)
    } else if (toPx(part) !== null) {
      const px = toPx(part)
      out.push(px === 1 ? prefix : [0, 2, 4, 8].includes(px) ? `${prefix}-${px}` : `${prefix}-${arb(part)}`)
    } else if (isColor(part)) out.push(color('border', part))
  }
  return out
}

function radius(prefix, value) {
  const v = value.trim()
  const px = v === '50%' ? null : toPx(v)
  if (px !== null && RADIUS[px] !== undefined) return RADIUS[px] ? `${prefix}-${RADIUS[px]}` : prefix
  if (px !== null && px >= 9999) return `${prefix}-full`
  return `${prefix}-${arb(v)}`
}

// Tailwind classes for one declaration.
export function convertDeclaration(prop, rawValue) {
  const p = prop.trim().toLowerCase()
  const value = rawValue.replace(/\s*!important\s*$/i, '').trim()
  const important = /!important\s*$/i.test(rawValue)
  const classes = convertValue(p, value)
  return important ? classes.map((c) => `!${c}`) : classes
}

function convertValue(p, value) {
  const v = value.toLowerCase()
  if (KEYWORDS[p]?.[v] !== undefined) return [KEYWORDS[p][v]]
  switch (p) {
    case 'margin':
      return boxSides('m', value)
    case 'padding':
      return boxSides('p', value)
    case 'margin-top': case 'margin-right': case 'margin-bottom': case 'margin-left':
      return [signed(`m${p[7]}`, value)]
    case 'padding-top': case 'padding-right': case 'padding-bottom': case 'padding-left':
      return [signed(`p${p[8]}`, value)]
    case 'margin-inline': return [signed('mx', value)]
    case 'margin-block': return [signed('my', value)]
    case 'padding-inline': return [signed('px', value)]
    case 'padding-block': return [signed('py', value)]
    case 'top': case 'right': case 'bottom': case 'left':
      return [signed(p, value, { allowFraction: true })]
    case 'inset':
      return [signed('inset', value, { allowFraction: true })]
    case 'width': return [`w-${spacing(value, { allowFraction: true })}`]
    case 'height': return [`h-${spacing(value, { allowFraction: true })}`]
    case 'min-width': return [`min-w-${spacing(value, { allowFraction: true })}`]
    case 'min-height': return [`min-h-${spacing(value, { allowFraction: true })}`]
    case 'max-height': return [`max-h-${spacing(value, { allowFraction: true })}`]
    case 'max-width': {
      const px = toPx(value)
      if (px !== null && MAX_W[px]) return [`max-w-${MAX_W[px]}`]
      if (v === 'none' || v === '100%') return [`max-w-${v === 'none' ? 'none' : 'full'}`]
      return [`max-w-${arb(value)}`]
    }
    case 'gap': {
      const [row, col = row] = splitValue(value)
      return row === col ? [`gap-${spacing(row)}`] : [`gap-y-${spacing(row)}`, `gap-x-${spacing(col)}`]
    }
    case 'row-gap': return [`gap-y-${spacing(value)}`]
    case 'column-gap': return [`gap-x-${spacing(value)}`]
    case 'flex-basis': return [`basis-${spacing(value, { allowFraction: true })}`]
    case 'flex-grow': return [`grow-${arb(value)}`]
    case 'order': return [/^-?\d+$/.test(v) && Math.abs(v) <= 12 ? `${v < 0 ? '-' : ''}order-${Math.abs(v)}` : `order-${arb(value)}`]
    case 'grid-template-columns':
    case 'grid-template-rows': {
      const pre = p.endsWith('columns') ? 'grid-cols' : 'grid-rows'
      const m = /^repeat\(\s*(\d+)\s*,\s*(minmax\(\s*0\s*,\s*1fr\s*\)|1fr)\s*\)$/.exec(v)
      if (m && Number(m[1]) <= 12) return [`${pre}-${m[1]}`]
      if (v === 'none') return [`${pre}-none`]
      return [`${pre}-${arb(value)}`]
    }
    case 'grid-column': {
      const m = /^span\s+(\d+)\s*\/\s*span\s+\1$/.exec(v) || /^span\s+(\d+)$/.exec(v)
      if (m) return [`col-span-${m[1]}`]
      if (v === '1 / -1') return ['col-span-full']
      return [`col-[${value.replace(/\s+/g, '')}]`]
    }
    case 'font-size': {
      const px = toPx(value)
      return [px !== null && FONT_SIZE[px] ? `text-${FONT_SIZE[px]}` : `text-${arb(value)}`]
    }
    case 'font-weight': return [WEIGHT[v] ? `font-${WEIGHT[v]}` : `font-${arb(value)}`]
    case 'font-family': {
      if (/monospace|mono|consolas|menlo/.test(v)) return ['font-mono']
      if (/serif/.test(v) && !/sans-serif/.test(v)) return ['font-serif']
      if (/sans-serif|system-ui/.test(v)) return ['font-sans']
      return [`font-${arb(value.replace(/["']/g, ''))}`]
    }
    case 'line-height': {
      if (LEADING[v]) return [`leading-${LEADING[v]}`]
      const px = toPx(value)
      const scale = { 12: '3', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10' }
      if (px !== null && /px|rem/.test(value) && scale[px]) return [`leading-${scale[px]}`]
      return [`leading-${arb(value)}`]
    }
    case 'letter-spacing': return [TRACKING[v] ? `tracking-${TRACKING[v]}` : `tracking-${arb(value)}`]
    case 'color': return [color('text', value)]
    case 'background-color': return [color('bg', value)]
    case 'background':
      return isColor(value) && splitValue(value).length === 1 ? [color('bg', value)] : [`bg-${arb(value)}`]
    case 'border': return v === 'none' || v === '0' ? ['border-0'] : border('border', value)
    case 'border-top': case 'border-right': case 'border-bottom': case 'border-left':
      return border(`border-${p[7]}`, value)
    case 'border-width': {
      const px = toPx(value)
      return [px === 1 ? 'border' : [0, 2, 4, 8].includes(px) ? `border-${px}` : `border-${arb(value)}`]
    }
    case 'border-color': return [color('border', value)]
    case 'border-radius': {
      const parts = splitValue(value)
      return parts.length === 1 ? [radius('rounded', value)] : [`rounded-${arb(value)}`]
    }
    case 'border-top-left-radius': return [radius('rounded-tl', value)]
    case 'border-top-right-radius': return [radius('rounded-tr', value)]
    case 'border-bottom-left-radius': return [radius('rounded-bl', value)]
    case 'border-bottom-right-radius': return [radius('rounded-br', value)]
    case 'opacity': {
      const n = Math.round(Number(value) * 100)
      return [OPACITY.includes(n) ? `opacity-${n}` : `opacity-${arb(value)}`]
    }
    case 'z-index': return [Z.includes(Number(v)) ? `z-${v}` : v === 'auto' ? 'z-auto' : `z-${arb(value)}`]
    case 'box-shadow': return [`shadow-${arb(value)}`]
    case 'transition': {
      if (v === 'none') return ['transition-none']
      const out = ['transition-all']
      const dur = /(\d*\.?\d+)(m?s)/.exec(v)
      if (dur) out.push(`duration-${dur[2] === 's' ? Math.round(Number(dur[1]) * 1000) : dur[1]}`)
      if (/ease-in-out/.test(v)) out.push('ease-in-out')
      else if (/ease-in/.test(v)) out.push('ease-in')
      else if (/ease-out/.test(v)) out.push('ease-out')
      else if (/linear/.test(v)) out.push('ease-linear')
      return out
    }
    case 'content':
      return [`content-[${value.replace(/\s+/g, '_')}]`]
    case 'transform':
      return v === 'none' ? ['transform-none'] : [`[transform:${value.replace(/\s+/g, '_')}]`]
    default:
      return [`[${p}:${value.replace(/\s+/g, '_')}]`]
  }
}

// [{ selector, media, classes }] parsed from CSS. Bare declarations (no braces) count as one
// rule with an empty selector. Pseudo-classes and min-width media queries become variants.
export function convertCss(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  if (!clean.includes('{')) return clean.trim() ? [{ selector: '', classes: convertBlock(clean, []) }] : []
  const rules = []
  const walk = (text, variants) => {
    const re = /([^{}]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g
    let m
    while ((m = re.exec(text))) {
      const head = m[1].trim()
      if (head.startsWith('@media')) {
        const mw = /min-width:\s*(\d+)px/.exec(head)
        const v = mw && SCREENS[mw[1]] ? SCREENS[mw[1]] : `min-[${mw ? mw[1] + 'px' : '?'}]`
        if (/prefers-color-scheme:\s*dark/.test(head)) walk(m[2], [...variants, 'dark'])
        else walk(m[2], [...variants, v])
        continue
      }
      if (head.startsWith('@')) continue
      for (const sel of head.split(',').map((s) => s.trim())) {
        const pseudos = []
        const base = sel.replace(/::?([a-z-]+)(?![\w-]*\()/g, (all, name) => {
          if (PSEUDO.includes(name)) {
            pseudos.push(PSEUDO_PREFIX[name] ?? name)
            return ''
          }
          return all
        })
        const classes = convertBlock(m[2], [...variants, ...pseudos])
        const existing = rules.find((r) => r.selector === base.trim())
        if (existing) existing.classes.push(...classes.filter((c) => !existing.classes.includes(c)))
        else rules.push({ selector: base.trim(), classes })
      }
    }
  }
  walk(clean, [])
  return rules
}

function convertBlock(block, variants) {
  const prefix = variants.map((v) => `${v}:`).join('')
  const out = []
  for (const decl of block.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const value = decl.slice(i + 1).trim()
    if (!prop || !value) continue
    for (const c of convertDeclaration(prop, value)) if (!out.includes(prefix + c)) out.push(prefix + c)
  }
  return out
}
