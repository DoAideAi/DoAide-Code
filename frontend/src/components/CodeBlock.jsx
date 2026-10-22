// The highlighted code block and its fence/wrap helpers, in their own module so the public tool
// pages can use them without pulling in the whole chat MessageList chunk. MessageList re-exports
// everything here, so chat-side imports are unchanged.

import { useEffect, useMemo, useState } from 'react'
import { copyText } from '../copy.js'
import { TOKEN_CLASS, highlight } from '../highlight.js'

// Split text into prose and ``` fenced code segments. An unclosed fence (mid-stream) is code.
export function splitFences(text) {
  const parts = []
  const re = /```([\w+-]*)\n?([\s\S]*?)(```|$)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: 'text', value: text.slice(last, m.index) })
    parts.push({ kind: 'code', lang: m[1], value: m[2] })
    last = re.lastIndex
    if (m[0].length === 0) break
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}

// Code blocks longer than this many lines are collapsed: replies are summaries, and the code
// itself is in the files (or one click away).
export const SHOWN_CODE_LINES = 3

export function codeLines(value) {
  return value.replace(/\n$/, '').split('\n').length
}

const COPY_HEADER = 'rounded px-1.5 py-0.5 font-sans text-[11px] text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-100'
const COPY_INLINE = 'rounded-full bg-shade/25 px-2.5 py-1 font-sans text-xs text-zinc-400 hover:text-zinc-200'

export function CopyCodeButton({ text, inline = false }) {
  const [state, setState] = useState('idle') // idle | copied | failed
  useEffect(() => {
    if (state === 'idle') return undefined
    const timer = setTimeout(() => setState('idle'), 1500)
    return () => clearTimeout(timer)
  }, [state])
  return (
    <button
      type="button"
      data-testid="copy-code"
      aria-label={state === 'copied' ? 'Copied' : 'Copy code'}
      title="Copy code"
      // Without the fence's trailing newline: pasted into a terminal, it would run at once.
      onClick={async () => setState((await copyText(text.replace(/\n+$/, ''))) ? 'copied' : 'failed')}
      className={inline ? COPY_INLINE : COPY_HEADER}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
    </button>
  )
}

// Wrap long lines in code blocks, or scroll sideways: one choice for every block, remembered.
const WRAP_KEY = 'doaide-code-wrap'
const WRAP_EVENT = 'doaide-code-wrap'

function savedWrap() {
  try {
    return localStorage.getItem(WRAP_KEY) === '1'
  } catch {
    return false
  }
}

export function useWrap() {
  const [wrap, setWrap] = useState(savedWrap)
  useEffect(() => {
    const sync = () => setWrap(savedWrap())
    window.addEventListener(WRAP_EVENT, sync)
    return () => window.removeEventListener(WRAP_EVENT, sync)
  }, [])
  const toggle = () => {
    try {
      localStorage.setItem(WRAP_KEY, wrap ? '0' : '1')
    } catch {
      // Storage unavailable: this block still toggles.
    }
    setWrap(!wrap)
    window.dispatchEvent(new Event(WRAP_EVENT))
  }
  return [wrap, toggle]
}

// Highlighted tokens split into lines (a comment or string can span several).
export function tokenLines(tokens) {
  const lines = [[]]
  for (const t of tokens) {
    t.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines.at(-1).push({ text: part, kind: t.kind })
    })
  }
  // The fence's last newline ends the last line; it does not start an empty one.
  if (lines.length > 1 && lines.at(-1).length === 0) lines.pop()
  return lines
}

// A code block: a header with the language, Wrap and Copy; line numbers when it has more than one
// line (drawn by CSS, so they are never selected or copied).
export function CodeBlock({ value, lang = '' }) {
  const lines = useMemo(() => tokenLines(highlight(value, lang)), [value, lang])
  const [wrap, toggleWrap] = useWrap()
  const numbered = lines.length > 1
  return (
    <div className="my-2 overflow-hidden rounded-xl bg-shade/40">
      <div className="flex items-center gap-1 border-b border-line/[0.06] py-1 pl-3 pr-1.5 font-sans text-[11px] text-zinc-500">
        <span data-testid="code-lang" className="min-w-0 flex-1 truncate">
          {lang || 'code'}
        </span>
        <button
          type="button"
          data-testid="wrap-code"
          aria-pressed={wrap}
          title={wrap ? 'Scroll long lines' : 'Wrap long lines'}
          onClick={toggleWrap}
          className={`rounded px-1.5 py-0.5 hover:bg-zinc-700/60 hover:text-zinc-100 ${wrap ? 'text-sky-300' : 'text-zinc-400'}`}
        >
          Wrap
        </button>
        <CopyCodeButton text={value} />
      </div>
      <pre
        className={`p-3 font-mono text-[13px] leading-relaxed text-zinc-200 ${
          wrap ? 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]' : 'overflow-x-auto'
        }`}
      >
        <code
          data-lang={lang || undefined}
          className={numbered ? 'code-lines' : undefined}
          style={numbered ? { '--gutter': `${String(lines.length).length}ch` } : undefined}
        >
          {lines.map((line, i) => (
            <span key={i}>
              <span className={numbered ? 'code-line' : undefined}>
                {line.map((t, j) =>
                  t.kind ? (
                    <span key={j} className={TOKEN_CLASS[t.kind]}>
                      {t.text}
                    </span>
                  ) : (
                    t.text
                  ),
                )}
              </span>
              {i < lines.length - 1 && '\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
