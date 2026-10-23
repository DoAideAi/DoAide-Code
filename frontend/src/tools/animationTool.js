// CSS keyframe animations: a list of stops ({ at: 0–100, props }) plus timing settings, turned
// into an @keyframes block and an animation shorthand. Props hold only what a stop changes.

export const PROPS = [
  // key, label, unit, min, max, step, neutral value
  ['x', 'Move X', 'px', -300, 300, 1, 0],
  ['y', 'Move Y', 'px', -300, 300, 1, 0],
  ['scale', 'Scale', '', 0, 3, 0.05, 1],
  ['rotate', 'Rotate', 'deg', -720, 720, 1, 0],
  ['skew', 'Skew X', 'deg', -60, 60, 1, 0],
  ['opacity', 'Opacity', '', 0, 1, 0.05, 1],
]

export const NEUTRAL = Object.fromEntries(PROPS.map(([k, , , , , , n]) => [k, n]))

export const EASINGS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-in-back': [0.36, 0, 0.66, -0.56],
  'ease-out-back': [0.34, 1.56, 0.64, 1],
  'ease-out-expo': [0.16, 1, 0.3, 1],
}
const KEYWORDS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'])

export const DEFAULT_SETTINGS = {
  name: 'my-animation',
  duration: 1,
  delay: 0,
  easing: 'ease',
  bezier: [0.25, 0.1, 0.25, 1],
  steps: 4,
  iterations: 'infinite',
  direction: 'normal',
  fill: 'both',
}

const k = (at, props) => ({ at, props })

export const PRESETS = {
  'fade-in': { frames: [k(0, { opacity: 0 }), k(100, { opacity: 1 })], settings: { duration: 0.6, easing: 'ease-out', iterations: '1' } },
  'slide-in-left': { frames: [k(0, { x: -120, opacity: 0 }), k(100, { x: 0, opacity: 1 })], settings: { duration: 0.6, easing: 'ease-out-expo', iterations: '1' } },
  'zoom-in': { frames: [k(0, { scale: 0.3, opacity: 0 }), k(100, { scale: 1, opacity: 1 })], settings: { duration: 0.5, easing: 'ease-out-back', iterations: '1' } },
  bounce: {
    frames: [k(0, { y: 0 }), k(20, { y: 0 }), k(40, { y: -40 }), k(50, { y: 0 }), k(60, { y: -18 }), k(80, { y: 0 }), k(100, { y: 0 })],
    settings: { duration: 1.2, easing: 'ease-in-out' },
  },
  pulse: { frames: [k(0, { scale: 1 }), k(50, { scale: 1.1 }), k(100, { scale: 1 })], settings: { duration: 1.5, easing: 'ease-in-out' } },
  heartbeat: {
    frames: [k(0, { scale: 1 }), k(14, { scale: 1.25 }), k(28, { scale: 1 }), k(42, { scale: 1.25 }), k(70, { scale: 1 })],
    settings: { duration: 1.3, easing: 'ease-in-out' },
  },
  shake: {
    frames: [k(0, { x: 0 }), k(20, { x: -10 }), k(40, { x: 10 }), k(60, { x: -10 }), k(80, { x: 10 }), k(100, { x: 0 })],
    settings: { duration: 0.5, easing: 'linear', iterations: '1' },
  },
  spin: { frames: [k(0, { rotate: 0 }), k(100, { rotate: 360 })], settings: { duration: 1, easing: 'linear' } },
  wobble: {
    frames: [k(0, { x: 0, rotate: 0 }), k(15, { x: -25, rotate: -5 }), k(30, { x: 20, rotate: 3 }), k(45, { x: -15, rotate: -3 }), k(60, { x: 10, rotate: 2 }), k(75, { x: -5, rotate: -1 }), k(100, { x: 0, rotate: 0 })],
    settings: { duration: 1, easing: 'ease-in-out' },
  },
  float: { frames: [k(0, { y: 0 }), k(50, { y: -15 }), k(100, { y: 0 })], settings: { duration: 3, easing: 'ease-in-out' } },
  'jello': {
    frames: [k(0, { skew: 0 }), k(30, { skew: -12 }), k(50, { skew: 8 }), k(70, { skew: -4 }), k(90, { skew: 2 }), k(100, { skew: 0 })],
    settings: { duration: 0.9, easing: 'ease-in-out' },
  },
}

const round = (n) => +Number(n).toFixed(3)

// The CSS declarations for one stop, e.g. "transform: translateX(20px) scale(1.1); opacity: 0.5;".
export function stopCss(props) {
  const t = []
  if (props.x !== undefined || props.y !== undefined) {
    const x = round(props.x ?? 0)
    const y = round(props.y ?? 0)
    t.push(y === 0 ? `translateX(${x}px)` : x === 0 ? `translateY(${y}px)` : `translate(${x}px, ${y}px)`)
  }
  if (props.scale !== undefined) t.push(`scale(${round(props.scale)})`)
  if (props.rotate !== undefined) t.push(`rotate(${round(props.rotate)}deg)`)
  if (props.skew !== undefined) t.push(`skewX(${round(props.skew)}deg)`)
  const decls = []
  if (t.length) decls.push(`transform: ${t.join(' ')};`)
  if (props.opacity !== undefined) decls.push(`opacity: ${round(props.opacity)};`)
  return decls
}

export function timingFunction(s) {
  if (s.easing === 'steps') return `steps(${Math.max(1, Math.round(s.steps))}, end)`
  if (s.easing === 'custom') return `cubic-bezier(${s.bezier.map(round).join(', ')})`
  if (KEYWORDS.has(s.easing)) return s.easing
  return `cubic-bezier(${EASINGS[s.easing].join(', ')})`
}

// Every stop carries the same transform functions, in the same order, so the browser can
// interpolate them: a prop used anywhere gets its neutral value where a stop leaves it out.
export function normalizeFrames(frames) {
  const used = PROPS.map(([key]) => key).filter((key) => frames.some((f) => f.props[key] !== undefined))
  return [...frames]
    .sort((a, b) => a.at - b.at)
    .map((f) => ({ at: f.at, props: Object.fromEntries(used.map((key) => [key, f.props[key] ?? NEUTRAL[key]])) }))
}

export function safeName(name) {
  const n = name.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return /^[A-Za-z_-]/.test(n) && n ? n : `anim-${n || 'custom'}`
}

export function keyframesCss(frames, name) {
  const body = normalizeFrames(frames)
    .map((f) => {
      const decls = stopCss(f.props)
      return `  ${f.at}% {\n${decls.map((d) => `    ${d}`).join('\n') || '    /* no change */'}\n  }`
    })
    .join('\n')
  return `@keyframes ${safeName(name)} {\n${body}\n}`
}

export function animationShorthand(s) {
  const iterations = s.iterations === 'infinite' ? 'infinite' : Math.max(0, Number(s.iterations) || 1)
  return `${safeName(s.name)} ${round(s.duration)}s ${timingFunction(s)} ${round(s.delay)}s ${iterations} ${s.direction} ${s.fill}`
}

export function fullCss(frames, s, selector = '.animated') {
  return `${keyframesCss(frames, s.name)}\n\n${selector} {\n  animation: ${animationShorthand(s)};\n}\n\n@media (prefers-reduced-motion: reduce) {\n  ${selector} {\n    animation: none;\n  }\n}`
}

// Points along a cubic-bezier easing curve, as an SVG path in a 100×100 box (y up).
export function bezierPath([x1, y1, x2, y2]) {
  const pts = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const u = 1 - t
    const x = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3
    const y = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3
    pts.push(`${(x * 100).toFixed(1)},${(100 - y * 100).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}
