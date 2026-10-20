const DOT = {
  green: 'bg-emerald-400',
  red: 'bg-red-500',
  gray: 'bg-zinc-600',
}

export default function TopBar({ project, color, busy }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4">
      <span className="text-sm font-medium tracking-tight text-zinc-300">Doaide Code</span>
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
