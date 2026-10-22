import { useLayoutEffect, useRef, useState } from 'react'

// Grows with the text up to about eight lines, then scrolls.
const MAX_HEIGHT = 192

// Common starts of a prompt, and the slash commands: offered while the box holds a prefix of one.
export const PROMPTS = [
  'explain ',
  'explain what this project does',
  'fix ',
  'fix the failing tests',
  'edit ',
  'add tests for ',
  'review my changes',
  'why does ',
  'where is ',
  'refactor ',
]
export const COMMANDS = ['/help', '/models', '/projects', '/switch-project ', '/new', '/undo', '/usage', '/status', '/workspace']
const MAX_SUGGESTIONS = 5

export function suggestionsFor(text) {
  const typed = text.trimStart().toLowerCase()
  if (!typed || typed.includes('\n') || typed.length > 24) return []
  const pool = typed.startsWith('/') ? COMMANDS : PROMPTS
  return pool.filter((s) => s.startsWith(typed) && s.trim() !== typed.trim()).slice(0, MAX_SUGGESTIONS)
}

export default function Composer({ busy, disabled, onSend, onStop }) {
  const [text, setText] = useState('')
  // The highlighted suggestion; -1 when none is (Enter then sends what was typed).
  const [active, setActive] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const box = useRef(null)
  const suggestions = dismissed ? [] : suggestionsFor(text)

  const change = (value) => {
    setText(value)
    setActive(-1)
    setDismissed(false)
  }
  const accept = (value) => {
    change(value)
    box.current?.focus()
  }

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight leaves out the border: without it a one-line box shows a scrollbar.
    const height = el.scrollHeight + el.offsetHeight - el.clientHeight
    el.style.height = `${Math.min(height, MAX_HEIGHT)}px`
    el.style.overflowY = height > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [text])

  const submit = () => {
    if (!text.trim() || busy || disabled) return
    if (onSend(text)) change('')
  }

  return (
    <footer
      data-testid="composer"
      className="shrink-0 border-t border-line/[0.06] bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Suggestions"
          data-testid="suggestions"
          className="mx-auto flex max-w-2xl flex-wrap gap-1.5 px-3 pt-2 sm:px-4"
        >
          {suggestions.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button
                type="button"
                // Keep focus in the box: a click should not blur it first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => accept(s)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  i === active
                    ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
                    : 'border-line/[0.08] bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {s.trim()}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mx-auto flex max-w-2xl items-end gap-2 px-3 py-2.5 sm:px-4">
        <textarea
          ref={box}
          aria-label="Message"
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => change(e.target.value)}
          // Enter or Cmd/Ctrl+Enter sends, Shift+Enter is a new line, Escape clears the box.
          // With suggestions shown: Tab takes the highlighted one (or the first), the arrow keys
          // move the highlight, Enter on a highlighted one takes it, and Escape hides them.
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return
            if (suggestions.length > 0) {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                accept(suggestions[Math.max(active, 0)])
                return
              }
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                // Wraps through "none highlighted" (-1) at either end.
                const last = suggestions.length - 1
                setActive((i) => (e.key === 'ArrowDown' ? (i >= last ? -1 : i + 1) : i < 0 ? last : i - 1))
                return
              }
              if (e.key === 'Enter' && active >= 0 && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                accept(suggestions[active])
                return
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setDismissed(true)
                return
              }
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              e.preventDefault()
              submit()
            } else if (e.key === 'Escape' && text) {
              e.preventDefault()
              change('')
            }
          }}
          placeholder={disabled ? 'Connecting…' : 'Message Doaide Code'}
          // 16px text: iOS zooms the page into smaller inputs.
          className="max-h-48 min-h-[44px] flex-1 resize-none rounded-[22px] border border-line/[0.08] bg-zinc-900 px-4 py-[10px] text-base leading-6 text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500/50 focus:outline-none disabled:opacity-60 sm:text-[15px]"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-zinc-800 px-4 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-zinc-200" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white transition hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </footer>
  )
}
