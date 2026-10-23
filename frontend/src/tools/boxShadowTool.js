// The box shadow generator (/tools/box-shadow): layered shadows described as data, rendered to
// a CSS box-shadow value. All in the browser.

export const MAX_LAYERS = 6

export const DEFAULT_LAYER = { x: 0, y: 8, blur: 24, spread: 0, color: '#000000', opacity: 35, inset: false }

export const PRESETS = [
  ['Soft drop', [{ x: 0, y: 8, blur: 24, spread: 0, color: '#000000', opacity: 35, inset: false }]],
  ['Subtle card', [{ x: 0, y: 1, blur: 3, spread: 0, color: '#000000', opacity: 20, inset: false }, { x: 0, y: 1, blur: 2, spread: -1, color: '#000000', opacity: 12, inset: false }]],
  ['Elevated', [{ x: 0, y: 10, blur: 15, spread: -3, color: '#000000', opacity: 25, inset: false }, { x: 0, y: 4, blur: 6, spread: -4, color: '#000000', opacity: 20, inset: false }]],
  ['Glow', [{ x: 0, y: 0, blur: 28, spread: 4, color: '#38bdf8', opacity: 55, inset: false }]],
  ['Inner', [{ x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 45, inset: true }]],
  ['Hard offset', [{ x: 6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 100, inset: false }]],
]

// #rrggbb + opacity % as rgba(); keeps hex untouched at 100%.
export function cssColor(hex, opacity) {
  if (opacity >= 100) return hex
  const n = parseInt(hex.slice(1), 16)
  const a = Math.round(opacity * 10) / 1000
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// One layer as its box-shadow fragment.
export function layerCss({ x, y, blur, spread, color, opacity, inset }) {
  return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${cssColor(color, opacity)}`
}

// The full declaration for a stack of layers, one per line when there are several.
export function shadowCss(layers) {
  if (!layers.length) return 'box-shadow: none;'
  const joined = layers.map(layerCss).join(layers.length > 1 ? ',\n    ' : ', ')
  return `box-shadow: ${joined};`
}
