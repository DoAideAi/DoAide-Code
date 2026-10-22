// The CSS gradient generator (/tools/css-gradient): build a linear, radial or conic gradient
// from color stops and get the CSS. Pure functions here; the page holds the state.

export const MAX_STOPS = 6
export const MIN_STOPS = 2

// A stop is { color: '#rrggbb', pos: 0–100 }. Sorted by position in the output, so dragging a
// stop past another never produces broken CSS.
export function gradientCss({ type = 'linear', angle = 90, stops }) {
  const parts = [...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(', ')
  if (type === 'radial') return `radial-gradient(circle, ${parts})`
  if (type === 'conic') return `conic-gradient(from ${angle}deg, ${parts})`
  return `linear-gradient(${angle}deg, ${parts})`
}

// The snippet people paste: the background shorthand plus a solid fallback for old browsers.
export function gradientSnippet(state) {
  const first = [...state.stops].sort((a, b) => a.pos - b.pos)[0]
  return `background: ${first.color};\nbackground: ${gradientCss(state)};`
}

// Evenly re-space the stops (first at 0, last at 100), keeping their colors.
export function spreadStops(stops) {
  const step = 100 / (stops.length - 1)
  return stops.map((s, i) => ({ ...s, pos: Math.round(i * step) }))
}

export const GRADIENT_PRESETS = [
  { name: 'Sunset', type: 'linear', angle: 135, stops: [{ color: '#ff0080', pos: 0 }, { color: '#ff8c00', pos: 100 }] },
  { name: 'Ocean', type: 'linear', angle: 120, stops: [{ color: '#2e3192', pos: 0 }, { color: '#1bffff', pos: 100 }] },
  { name: 'Purple haze', type: 'linear', angle: 135, stops: [{ color: '#7928ca', pos: 0 }, { color: '#ff0080', pos: 100 }] },
  { name: 'Forest', type: 'linear', angle: 160, stops: [{ color: '#134e5e', pos: 0 }, { color: '#71b280', pos: 100 }] },
  { name: 'Peach', type: 'linear', angle: 90, stops: [{ color: '#ffecd2', pos: 0 }, { color: '#fcb69f', pos: 100 }] },
  { name: 'Midnight', type: 'linear', angle: 180, stops: [{ color: '#232526', pos: 0 }, { color: '#414345', pos: 100 }] },
  { name: 'Aurora', type: 'linear', angle: 45, stops: [{ color: '#00c9ff', pos: 0 }, { color: '#92fe9d', pos: 100 }] },
  { name: 'Candy', type: 'conic', angle: 0, stops: [{ color: '#ff9a9e', pos: 0 }, { color: '#fad0c4', pos: 50 }, { color: '#ff9a9e', pos: 100 }] },
]
