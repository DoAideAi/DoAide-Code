import { useEffect, useRef, useState } from 'react'

// Friendlier names for the laptop's executors (see backend executors/__init__.py); others show as is.
const LABELS = {
  ollama: ['Local fast', 'free, on your laptop'],
  'ollama-coder': ['Local coder', 'free, on your laptop'],
  'claude-haiku': ['Claude Haiku', 'your Claude login'],
  'claude-sonnet': ['Claude Sonnet', 'your Claude login'],
  'claude-opus': ['Claude Opus', 'your Claude login, slowest'],
  codex: ['Codex', 'your Codex login'],
}

export function modelLabel(name) {
  return name ? (LABELS[name]?.[0] ?? name) : 'Auto'
}

// Under the message box: which model a task tries first. Auto lets DoAide pick the cheapest that
// passes its checks; picking one sends /model <name>, as typing it would. Hidden until the laptop
// reports its executors; without `onChoose` (offline, or a task running) it only shows the choice.
export default function ModelPicker({ models, onChoose = null }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false)
    }
    const escape = (e) => {
      if (e.key !== 'Escape') return
      // Not also the app's Escape (stop the reply) or the box's (clear it).
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])

  const executors = models?.executors
  if (!executors?.length) return null
  const pinned = models.pinned ?? null
  const pick = (name) => {
    setOpen(false)
    if (name !== pinned) onChoose(name ?? 'auto')
  }
  const options = [{ name: null, usable: true }, ...executors]

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        data-testid="model-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!onChoose}
        title={onChoose ? 'Choose the model' : 'Model'}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
      >
        <span>{modelLabel(pinned)}</span>
        {onChoose && (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 15l6-6 6 6" />
          </svg>
        )}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Models"
          data-testid="model-menu"
          className="absolute bottom-full left-0 z-30 mb-1.5 w-64 overflow-hidden rounded-xl border border-line/[0.08] bg-zinc-900 py-1 text-sm shadow-xl"
        >
          {options.map((e) => {
            const chosen = e.name === pinned
            const hint = e.name === null ? 'cheapest model that passes the checks' : e.usable ? (LABELS[e.name]?.[1] ?? e.model) : 'not available on your laptop'
            return (
              <li key={e.name ?? 'auto'} role="option" aria-selected={chosen} aria-disabled={!e.usable}>
                <button
                  type="button"
                  data-testid={`model-option-${e.name ?? 'auto'}`}
                  disabled={!e.usable}
                  onClick={() => pick(e.name)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
                    chosen ? 'text-sky-300' : 'text-zinc-200'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{modelLabel(e.name)}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{hint}</span>
                  </span>
                  {chosen && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
