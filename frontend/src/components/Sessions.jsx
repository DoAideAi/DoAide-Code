import { useEffect, useRef, useState } from 'react'
import { listSessions } from '../api.js'

function ago(seconds) {
  const s = Date.now() / 1000 - seconds
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// Conversation switcher. Opening one switches every signed-in device to it.
export default function Sessions({ token, title, source, sessionId, onOpen, onNew }) {
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState(null)
  const box = useRef(null)

  useEffect(() => {
    if (!open || !token) return
    let active = true
    listSessions(token)
      .then((body) => active && setSessions(body.sessions))
      .catch(() => active && setSessions([]))
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => {
      active = false
      document.removeEventListener('mousedown', close)
    }
  }, [open, token])

  return (
    <div ref={box} className="relative min-w-0">
      <button
        type="button"
        data-testid="sessions-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[40vw] items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
      >
        {source === 'mcp' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
        <span className="truncate">{title || 'New chat'}</span>
        <span className="text-zinc-600">▾</span>
      </button>
      {open && (
        <div
          data-testid="sessions-menu"
          className="absolute left-0 top-8 z-20 w-72 max-w-[85vw] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onNew()
            }}
            className="w-full border-b border-zinc-800 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
          >
            + New chat
          </button>
          <div className="max-h-80 overflow-y-auto">
            {sessions === null && <div className="px-3 py-2 text-xs text-zinc-500">Loading…</div>}
            {sessions?.length === 0 && <div className="px-3 py-2 text-xs text-zinc-500">No conversations yet</div>}
            {sessions?.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (s.id !== sessionId) onOpen(s.id)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-900 ${
                  s.id === sessionId ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-300'
                }`}
              >
                {s.source === 'mcp' ? (
                  <span title="Started by Claude Code" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{s.title || 'Untitled'}</span>
                <span className="shrink-0 text-xs text-zinc-600">{ago(s.updated_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
