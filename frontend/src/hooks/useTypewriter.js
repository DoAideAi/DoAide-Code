import { useEffect, useRef, useState } from 'react'

// Frames to catch up with whatever has arrived: a whole answer landing at once (the local
// model's checked answer, a cached one) types out in about 3/4 s; a live token stream, whose
// backlog stays small, keeps its own pace.
const CATCH_UP_FRAMES = 45
// Slowest pace, in characters per frame (about 120 a second).
const MIN_SPEED = 2

function reducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
}

export function commonPrefix(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

// Characters per frame to catch up with `total` from `shown` in CATCH_UP_FRAMES; set when new text
// arrives, so a big answer types at an even pace instead of slowing to a crawl at the end.
export function speedFor(shown, total) {
  return Math.max(MIN_SPEED, Math.ceil((total - shown) / CATCH_UP_FRAMES))
}

// `text` revealed a little at a time while `live` (the reply is streaming), and until it catches
// up after the reply finishes. Replies already complete when first shown appear whole. `seen`:
// text the reader already saw (the faded draft), not typed out again.
export default function useTypewriter(text, live, seen = '') {
  const animate = useRef(live && !reducedMotion())
  // The state only triggers renders; `shown` is the length on screen.
  const [, setLength] = useState(0)
  const shown = useRef(animate.current ? commonPrefix(text, seen) : text.length)
  // A seen draft that the answer starts with counts as typed already.
  if (animate.current && shown.current === 0 && seen && text) {
    shown.current = commonPrefix(text, seen)
  }

  useEffect(() => {
    if (!animate.current) return undefined
    if (shown.current >= text.length) {
      if (!live) animate.current = false
      return undefined
    }
    const frame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 16))
    const cancel = globalThis.cancelAnimationFrame ?? clearTimeout
    let id
    const speed = speedFor(shown.current, text.length)
    const step = () => {
      shown.current = Math.min(text.length, shown.current + speed)
      setLength(shown.current)
      if (shown.current < text.length) id = frame(step)
      else if (!live) animate.current = false
    }
    id = frame(step)
    return () => cancel(id)
  }, [text, live])

  if (!animate.current) return text
  return text.slice(0, Math.min(shown.current, text.length))
}
