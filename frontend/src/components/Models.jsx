import { useEffect, useRef, useState } from 'react'
import { usableTools } from '../store.js'

// Everything here comes from the laptop's detection report (`ollama list`, `claude auth
// status`, `codex login status`); the UI never lists models of its own.
const STATE_TEXT = {
  ready: 'ready',
  signed_in: 'signed in',
  unknown: 'installed (sign-in not verified)',
  signed_out: 'not signed in',
  not_found: 'not found',
  not_running: 'not running',
  no_models: 'no models installed',
  disabled: 'disabled',
  error: 'check failed',
}

export function toolLine(tool) {
  if (tool.models?.length) return tool.models.join(', ')
  const state = STATE_TEXT[tool.state] ?? tool.state
  return tool.version && tool.usable ? `${state} · v${tool.version}` : state
}

export function ToolRow({ tool }) {
  return (
    <li data-testid={`model-tool-${tool.id}`} data-state={tool.state} className="px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tool.usable ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
        <span className="shrink-0 text-zinc-200">{tool.label}:</span>
        <span className={`min-w-0 break-words ${tool.usable ? 'text-zinc-300' : 'text-zinc-500'}`}>{toolLine(tool)}</span>
      </div>
      {tool.setup && <p className="mt-1 pl-3.5 text-xs text-zinc-500">{tool.setup}</p>}
    </li>
  )
}

// Top bar: how many tools are usable, with the detected details in a dropdown and a link to the
// cost/quality comparison. View only: routing picks the model for each task.
export default function ModelsMenu({ models, onCompare = null }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!models) return null
  const usable = usableTools(models)
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        data-testid="models-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
      >
        <span className={`h-2 w-2 rounded-full ${usable.length ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="hidden sm:inline">{usable.length ? `${usable.length} of ${models.tools.length} models ready` : 'No models'}</span>
      </button>
      {open && (
        <div
          data-testid="models-menu"
          className="absolute right-0 top-7 z-20 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl"
        >
          <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-500">Detected on your laptop</div>
          <ul className="max-h-96 divide-y divide-zinc-900 overflow-y-auto">
            {models.tools.map((t) => (
              <ToolRow key={t.id} tool={t} />
            ))}
          </ul>
          {onCompare && (
            <button
              type="button"
              data-testid="models-compare-open"
              onClick={() => {
                setOpen(false)
                onCompare()
              }}
              className="w-full border-t border-zinc-800 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900"
            >
              Compare cost &amp; quality →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Shown when the laptop reported and nothing can run: what to install or sign in to.
export function NoModelsBanner({ models }) {
  if (!models || models.any_usable) return null
  const steps = models.tools.filter((t) => t.setup)
  return (
    <div data-testid="no-models-banner" className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/60">
      <div className="mx-auto max-w-3xl px-4 py-3 text-xs text-zinc-400">
        <p className="text-zinc-300">No model is available on your laptop yet. Set up at least one:</p>
        <ul className="mt-2 space-y-1">
          {steps.map((t) => (
            <li key={t.id}>
              <span className="text-zinc-300">{t.label}</span> ({STATE_TEXT[t.state] ?? t.state}): {t.setup}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-zinc-500">This updates by itself within a minute, or type /models to check now.</p>
      </div>
    </div>
  )
}
