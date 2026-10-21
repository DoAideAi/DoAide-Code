import { usableTools } from '../store.js'

const DOT = {
  green: 'bg-emerald-400',
  red: 'bg-red-500',
  gray: 'bg-zinc-500',
}

function Link({ testid, onClick, children }) {
  return (
    <button type="button" data-testid={testid} onClick={onClick} className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
      {children}
    </button>
  )
}

// One line: name and project on the left; How it works, Models, Usage and one status dot on the right (gray
// while the laptop is offline, which the banner below explains).
export default function TopBar({ project, color, busy, models = null, onModels = null, onUsage = null, onHow = null, localUrl = null }) {
  const ready = usableTools(models).length
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 px-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-sm font-medium tracking-tight text-zinc-300">Doaide Code</span>
        <span data-testid="project-pill" className="truncate text-xs text-zinc-500">
          {project ?? 'no project'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {localUrl && (
          <a
            data-testid="open-local"
            href={localUrl}
            title="This laptop runs DoAide: prompts there skip the server"
            className="shrink-0 text-xs text-emerald-300/90 hover:text-emerald-200"
          >
            Open on this laptop (faster)
          </a>
        )}
        {onHow && (
          <Link testid="how-toggle" onClick={onHow}>
            How it works
          </Link>
        )}
        {onModels && (
          <Link testid="models-toggle" onClick={onModels}>
            {models && <span className={`h-1.5 w-1.5 rounded-full ${ready ? DOT.green : DOT.red}`} />}
            Models
          </Link>
        )}
        {onUsage && (
          <Link testid="usage-toggle" onClick={onUsage}>
            Usage
          </Link>
        )}
        <span
          data-testid="status-dot"
          data-color={color}
          aria-label={`status ${color}`}
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[color]} ${busy && color === 'green' ? 'animate-pulse' : ''}`}
        />
      </div>
    </header>
  )
}
