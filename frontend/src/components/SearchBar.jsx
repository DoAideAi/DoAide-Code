import { useEffect, useRef, useState } from 'react'

// Highlights matching text segments in a string.
export function highlightText(text, query) {
  if (!query || !text) return [text]
  const parts = []
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let last = 0
  let idx = lower.indexOf(q, last)
  while (idx !== -1) {
    if (idx > last) parts.push({ text: text.slice(last, idx), highlight: false })
    parts.push({ text: text.slice(idx, idx + q.length), highlight: true })
    last = idx + q.length
    idx = lower.indexOf(q, last)
  }
  if (last < text.length) parts.push({ text: text.slice(last), highlight: false })
  return parts
}

function SearchResult({ message, query, onClick }) {
  // Show a snippet around the first match.
  const content = message.content || ''
  const lower = content.toLowerCase()
  const matchIdx = lower.indexOf(query.toLowerCase())
  const start = Math.max(0, matchIdx - 40)
  const end = Math.min(content.length, matchIdx + query.length + 60)
  const snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')
  const parts = highlightText(snippet, query)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800/60"
    >
      <div className="mb-0.5 text-[11px] text-zinc-500">
        {message.role === 'user' ? 'You' : 'DoAide'}
      </div>
      <div className="line-clamp-2 break-words text-xs">
        {parts.map((p, i) =>
          p.highlight ? (
            <mark key={i} className="rounded bg-sky-500/30 px-0.5 text-sky-200">
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </div>
    </button>
  )
}

// Scrolls the chat to a message (MessageList wraps each one in a `msg-<id>` anchor).
export function jumpTo(id) {
  document.getElementById(`msg-${id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

export default function SearchBar({ messages, open, onClose, hasMore = false }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      // Delay focus slightly for animation
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // Surrounding spaces are not part of what was asked: "fix " still finds "fix".
  const term = query.trim()
  const results = term.length >= 2
    ? messages.filter(
        (m) =>
          m.content &&
          m.role !== 'system' &&
          m.content.toLowerCase().includes(term.toLowerCase()),
      )
    : []

  return (
    <div data-testid="search-bar" className="border-b border-line/[0.06] bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2 sm:px-4">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          data-testid="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in conversation..."
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        <button
          type="button"
          data-testid="search-close"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {term.length >= 2 && (
        <div className="mx-auto max-h-64 max-w-2xl overflow-y-auto px-2 pb-2">
          {results.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-500">No matches found</div>
          ) : (
            <div className="space-y-0.5">
              {results.map((m) => (
                <SearchResult
                  key={m.id}
                  message={m}
                  query={term}
                  onClick={() => {
                    jumpTo(m.id)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
          <div className="py-1 text-center text-[11px] text-zinc-500">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {hasMore && ' in the loaded messages; load earlier ones to search them too'}
          </div>
        </div>
      )}
    </div>
  )
}
