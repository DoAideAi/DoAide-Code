// The flexbox playground (/tools/flexbox-playground): container and item settings as data, a
// live preview, and the CSS to copy. All in the browser.

export const CONTAINER_PROPS = [
  ['flexDirection', 'flex-direction', ['row', 'row-reverse', 'column', 'column-reverse']],
  ['justifyContent', 'justify-content', ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']],
  ['alignItems', 'align-items', ['stretch', 'flex-start', 'flex-end', 'center', 'baseline']],
  ['flexWrap', 'flex-wrap', ['nowrap', 'wrap', 'wrap-reverse']],
  ['alignContent', 'align-content', ['normal', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch']],
]

export const DEFAULT_CONTAINER = {
  flexDirection: 'row',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  flexWrap: 'nowrap',
  alignContent: 'normal',
  gap: 8,
}

export const DEFAULT_ITEM = { grow: 0, shrink: 1, basis: 'auto', alignSelf: 'auto' }

export const ALIGN_SELF = ['auto', 'flex-start', 'flex-end', 'center', 'baseline', 'stretch']

export const MIN_ITEMS = 1
export const MAX_ITEMS = 10

// Defaults are omitted from the CSS so the output stays as short as what you would write by hand.
export function containerCss(c) {
  const lines = ['display: flex;']
  for (const [key, prop] of CONTAINER_PROPS) {
    if (c[key] !== DEFAULT_CONTAINER[key]) lines.push(`${prop}: ${c[key]};`)
  }
  if (c.gap !== 0) lines.push(`gap: ${c.gap}px;`)
  return `.container {\n  ${lines.join('\n  ')}\n}`
}

// The CSS for one item, or null when it is all defaults (no rule needed).
export function itemCss(item, index) {
  const lines = []
  if (item.grow !== DEFAULT_ITEM.grow || item.shrink !== DEFAULT_ITEM.shrink || item.basis !== DEFAULT_ITEM.basis) {
    lines.push(`flex: ${item.grow} ${item.shrink} ${item.basis};`)
  }
  if (item.alignSelf !== 'auto') lines.push(`align-self: ${item.alignSelf};`)
  if (!lines.length) return null
  return `.item-${index + 1} {\n  ${lines.join('\n  ')}\n}`
}

// The full stylesheet for the current playground state.
export function flexboxCss(container, items) {
  const rules = [containerCss(container)]
  items.forEach((item, i) => {
    const rule = itemCss(item, i)
    if (rule) rules.push(rule)
  })
  return rules.join('\n\n')
}
