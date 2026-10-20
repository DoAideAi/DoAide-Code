import Sessions from './Sessions.jsx'

const DOT = {
  green: 'bg-emerald-400',
  red: 'bg-red-500',
  gray: 'bg-zinc-600',
}

export default function TopBar({ project, color, busy, filesOpen, onToggleFiles, sessions }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleFiles && (
          <button
            type="button"
            data-testid="files-toggle"
            aria-label={filesOpen ? 'Hide files' : 'Show files'}
            aria-pressed={filesOpen}
            onClick={onToggleFiles}
            className={`-ml-1 rounded p-1 ${filesOpen ? 'text-zinc-200' : 'text-zinc-500'} hover:text-zinc-200`}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
              <path d="M6 2.5v11" />
            </svg>
          </button>
        )}
        <span className="shrink-0 text-sm font-medium tracking-tight text-zinc-300">Doaide Code</span>
        {sessions && <Sessions {...sessions} />}
      </div>
      <div className="flex items-center gap-3">
        <span
          data-testid="project-pill"
          className="max-w-[45vw] truncate rounded-full border border-zinc-700 bg-zinc-900 px-3 py-0.5 text-xs text-zinc-300"
        >
          {project ?? 'no project'}
        </span>
        <span
          data-testid="status-dot"
          data-color={color}
          aria-label={`status ${color}`}
          className={`h-2.5 w-2.5 rounded-full ${DOT[color]} ${busy && color === 'green' ? 'animate-pulse' : ''}`}
        />
      </div>
    </header>
  )
}
