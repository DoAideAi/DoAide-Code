// The landing hero's looping demo: a prompt types itself, a snippet appears, and the answer
// types back with the model that handled it — the product's story (free model first) in one
// glance. With prefers-reduced-motion the first scene shows complete and nothing moves.

import { useEffect, useRef, useState } from 'react'
import { TOKEN_CLASS, highlight } from '../highlight.js'

export const SCENES = [
  {
    prompt: 'Explain this code',
    code: 'const seen = new Set()\nconst fresh = items.filter((x) => !seen.has(x.id) && seen.add(x.id))',
    lang: 'js',
    answer: 'It keeps the first item per id: has() checks for duplicates, add() marks ids as seen.',
    model: 'local model · free',
  },
  {
    prompt: 'Find the bug',
    code: 'def average(nums):\n    return sum(nums) / len(nums)',
    lang: 'python',
    answer: 'average([]) divides by zero. Guard it: return sum(nums) / len(nums) if nums else 0.0',
    model: 'local model · free',
  },
  {
    prompt: 'Write a test for this',
    code: 'export const slugify = (s) =>\n  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")',
    lang: 'js',
    answer: "expect(slugify('  Hello, World!  ')).toBe('-hello-world-') — trailing dash caught: trim after replacing.",
    model: 'Claude Sonnet · escalated',
  },
]

// Phases: the prompt types, the answer types (code shows from the prompt's end), then a hold.
const TICK_MS = 35
const HOLD_TICKS = 55

function reducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
}

function Code({ code, lang }) {
  return (
    <pre aria-hidden className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-zinc-300">
      {highlight(code, lang).map((t, i) =>
        t.kind && TOKEN_CLASS[t.kind] ? (
          <span key={i} className={TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ) : (
          t.text
        ),
      )}
    </pre>
  )
}

export default function HeroDemo() {
  const [still] = useState(reducedMotion)
  const [sceneAt, setSceneAt] = useState(0)
  const [tick, setTick] = useState(0)
  const scene = SCENES[sceneAt]
  const timer = useRef(null)

  useEffect(() => {
    if (still) return undefined
    timer.current = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(timer.current)
  }, [still, sceneAt])

  const promptLen = still ? scene.prompt.length : Math.min(tick, scene.prompt.length)
  const answerTicks = tick - scene.prompt.length - 8 // a short beat between prompt and answer
  const answerLen = still ? scene.answer.length : Math.max(0, Math.min(answerTicks, scene.answer.length))
  const done = answerLen >= scene.answer.length

  useEffect(() => {
    if (still || !done) return undefined
    const hold = setTimeout(() => {
      setTick(0)
      setSceneAt((i) => (i + 1) % SCENES.length)
    }, HOLD_TICKS * TICK_MS)
    return () => clearTimeout(hold)
  }, [still, done])

  return (
    <div
      data-testid="hero-demo"
      aria-hidden
      className="w-full max-w-xl rounded-xl border border-zinc-800 bg-shade/40 p-4 text-left shadow-lg"
    >
      <div className="flex items-center gap-1.5 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
        <span className="pl-2 font-mono text-[11px] text-zinc-600">doaide code</span>
      </div>
      <p className="font-mono text-xs leading-relaxed text-zinc-100">
        <span className="select-none text-sky-300">&gt; </span>
        {scene.prompt.slice(0, promptLen)}
        {!still && promptLen < scene.prompt.length && <span className="animate-pulse text-zinc-500">▋</span>}
      </p>
      {(still || promptLen >= scene.prompt.length) && (
        <div className="mt-2 rounded-md border border-zinc-800/80 p-2">
          <Code code={scene.code} lang={scene.lang} />
        </div>
      )}
      <p className="mt-2 min-h-[3.5rem] font-mono text-xs leading-relaxed text-zinc-400 sm:min-h-[2.5rem]">
        {answerLen > 0 && (
          <>
            {scene.answer.slice(0, answerLen)}
            {!still && !done && <span className="animate-pulse text-zinc-600">▋</span>}
          </>
        )}
      </p>
      <p className="pt-1 text-right font-mono text-[11px] text-emerald-400/80">
        {(still || done) && `✓ ${scene.model}`}
      </p>
    </div>
  )
}
