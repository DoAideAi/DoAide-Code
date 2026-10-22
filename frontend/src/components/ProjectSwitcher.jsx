import { useEffect, useRef, useState } from 'react'

// The project under the name in the header, as a dropdown: opening it loads the project list
// (the laptop's, in hub mode), and picking one sends /switch-project like typing it would.
// Without `onSwitch` (offline, or a task running) it is plain text.
export default function ProjectSwitcher({ project, loadProjects = null, onSwitch = null }) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    let active = true
    setError(false)
    Promise.resolve(loadProjects ? loadProjects() : { projects: [] })
      .then((body) => active && setProjects((body?.projects ?? []).map((p) => p.name)))
      .catch(() => active && setError(true))
    const close = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false)
    }
    const escape = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      active = false
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open, loadProjects])

  const label = project ?? 'no project'
  if (!onSwitch) {
    return (
      <span data-testid="project-pill" className="truncate">
        {label}
      </span>
    )
  }
  const pick = (name) => {
    setOpen(false)
    if (name !== project) onSwitch(name)
  }
  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        data-testid="project-pill"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch project"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 items-center gap-0.5 rounded hover:text-zinc-200"
      >
        <span className="truncate">{label}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          data-testid="project-menu"
          className="absolute left-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-line/[0.08] bg-zinc-900 py-1 text-sm shadow-xl"
        >
          {projects === null && !error && <div className="px-3 py-2 text-zinc-500">Loading…</div>}
          {error && <div className="px-3 py-2 text-red-300">Couldn’t load projects.</div>}
          {projects?.length === 0 && (
            <div className="px-3 py-2 text-zinc-500">
              No projects yet. Add one with <code className="text-zinc-300">/add-project name path</code>.
            </div>
          )}
          {projects?.length > 0 && (
            <ul role="listbox" aria-label="Projects" className="max-h-72 overflow-y-auto">
              {projects.map((name) => (
                <li key={name} role="option" aria-selected={name === project}>
                  <button
                    type="button"
                    onClick={() => pick(name)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-800 ${
                      name === project ? 'text-sky-300' : 'text-zinc-200'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {name === project && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
