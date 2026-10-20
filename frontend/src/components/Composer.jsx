import { useState } from 'react'

export default function Composer({ busy, disabled, onSend, onStop }) {
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim() || busy || disabled) return
    if (onSend(text)) setText('')
  }

  return (
    <footer data-testid="composer" className="hidden shrink-0 border-t border-zinc-800/80 md:block">
      <div className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3">
        <textarea
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
          placeholder={disabled ? 'Connecting…' : 'Message, or /help'}
          className="max-h-48 min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="h-11 rounded-xl border border-zinc-700 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="h-11 rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-900 disabled:opacity-30"
          >
            Send
          </button>
        )}
      </div>
    </footer>
  )
}
