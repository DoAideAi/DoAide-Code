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

// Results from every conversation (`searchAll`), grouped by conversation, the open one first.
export function groupResults(results, currentId) {
  const groups = new Map()
  for (const r of results) {
    if (!groups.has(r.session_id)) {
      groups.set(r.session_id, { id: r.session_id, title: r.session_title || 'Untitled conversation', current: r.session_id === currentId, results: [] })
    }
    groups.get(r.session_id).results.push(r)
  }
  return [...groups.values()].sort((a, b) => b.current - a.current)
}

function ResultList({ results, query, onPick }) {
  return results.map((m) => <SearchResult key={m.id} message={m} query={query} onClick={() => onPick(m)} />)
}

// The search box under the header. With `searchAll(query)` it searches every conversation on the
// server and `onOpen(sessionId, messageId)` opens a result; without it (or if the server search
// fails) it searches the messages loaded here.
export default function SearchBar({ messages, open, onClose, hasMore = false, searchAll = null, sessionId = null, onOpen = null }) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState({ term: '', results: null, failed: false })
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

  // Surrounding spaces are not part of what was asked: "fix " still finds "fix".
  const term = query.trim()
  useEffect(() => {
    if (!open || !searchAll || term.length < 2) return undefined
    let active = true
    // Wait for a pause in typing before asking the server.
    const timer = setTimeout(() => {
      searchAll(term).then(
        (body) => active && setRemote({ term, results: body.results ?? [], failed: false }),
        () => active && setRemote({ term, results: null, failed: true }),
      )
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [open, searchAll, term])

  if (!open) return null

  const everywhere = searchAll && !remote.failed
  const local = term.length >= 2
    ? messages.filter(
        (m) =>
          m.content &&
          m.role !== 'system' &&
          m.content.toLowerCase().includes(term.toLowerCase()),
      )
    : []
  const fresh = remote.term === term ? remote.results : null
  const groups = everywhere && fresh ? groupResults(fresh, sessionId) : null
  const count = everywhere ? fresh?.length ?? 0 : local.length
  const pickLocal = (m) => {
    jumpTo(m.id)
    onClose()
  }
  const pickRemote = (m) => {
    onClose()
    if (onOpen) onOpen(m.session_id, m.id)
    else jumpTo(m.id)
  }

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
          placeholder={searchAll ? 'Search all conversations...' : 'Search in conversation...'}
          className="flex-1 bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none sm:text-sm"
        />
        <button
          type="button"
          data-testid="search-close"
          aria-label="Close search"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {term.length >= 2 && (
        <div className="mx-auto max-h-[60vh] max-w-2xl overflow-y-auto px-2 pb-2 sm:max-h-80">
          {everywhere && !fresh ? (
            <div className="py-4 text-center text-xs text-zinc-500">Searching…</div>
          ) : count === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-500">No matches found</div>
          ) : groups ? (
            groups.map((g) => (
              <section key={g.id} data-testid={`search-group-${g.id}`} className="pb-1">
                <h3 className="truncate px-3 pb-0.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {g.current ? 'This conversation' : g.title}
                </h3>
                <div className="space-y-0.5">
                  <ResultList results={g.results} query={term} onPick={pickRemote} />
                </div>
              </section>
            ))
          ) : (
            <div className="space-y-0.5">
              <ResultList results={local} query={term} onPick={pickLocal} />
            </div>
          )}
          {(!everywhere || (fresh && count > 0)) && (
            <div className="py-1 text-center text-[11px] text-zinc-500">
              {count} result{count !== 1 ? 's' : ''}
              {everywhere
                ? ` in ${groups.length} conversation${groups.length !== 1 ? 's' : ''}`
                : remote.failed
                  ? ' in this conversation (searching all conversations failed)'
                  : hasMore && ' in the loaded messages; load earlier ones to search them too'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
