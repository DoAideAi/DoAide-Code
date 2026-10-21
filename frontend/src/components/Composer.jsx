import { useLayoutEffect, useRef, useState } from 'react'

// Grows with the text up to about eight lines, then scrolls.
const MAX_HEIGHT = 192

export default function Composer({ busy, disabled, onSend, onStop }) {
  const [text, setText] = useState('')
  const box = useRef(null)

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
    if (onSend(text)) setText('')
  }

  return (
    <footer
      data-testid="composer"
      className="shrink-0 border-t border-white/[0.06] bg-[#0f1013]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2 px-3 py-2.5 sm:px-4">
        <textarea
          ref={box}
          aria-label="Message"
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={disabled ? 'Connecting…' : 'Message Doaide Code'}
          // 16px text: iOS zooms the page into smaller inputs.
          className="max-h-48 min-h-[44px] flex-1 resize-none rounded-[22px] border border-white/[0.08] bg-zinc-900 px-4 py-[10px] text-base leading-6 text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500/50 focus:outline-none disabled:opacity-60 sm:text-[15px]"
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
