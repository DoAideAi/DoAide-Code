
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
