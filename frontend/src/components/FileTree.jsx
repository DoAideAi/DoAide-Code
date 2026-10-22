import { useCallback, useEffect, useState } from 'react'

const ICON = {
  dir: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
}

function Row({ entry, depth, expanded, active, onClick }) {
  const dir = entry.type === 'dir'
  return (
    <button
      type="button"
      data-testid={`file-${entry.path}`}
      title={entry.path}
      aria-expanded={dir ? expanded : undefined}
      onClick={onClick}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[13px] ${
        active ? 'bg-sky-600/20 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
      }`}
    >
      <span aria-hidden="true" className="w-3 shrink-0 text-[10px] text-zinc-500">
        {dir ? (expanded ? '▾' : '▸') : ''}
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${dir ? 'text-sky-400/80' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d={ICON[dir ? 'dir' : 'file']} />
      </svg>
      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
    </button>
  )
}

// The project's files, one folder at a time: a folder's entries load the first time it opens.
// `load(path)` resolves to { entries, root }; `reloadKey` (the project) starts over when it changes.
export default function FileTree({ load, onOpen, activePath = null, reloadKey = null }) {
  const [children, setChildren] = useState({}) // folder path ('' is the root) -> entries
  const [open, setOpen] = useState({})
  const [loading, setLoading] = useState({})
  const [error, setError] = useState(null)
  const [root, setRoot] = useState('')

  const fetchDir = useCallback(
    async (path) => {
      setLoading((l) => ({ ...l, [path]: true }))
      try {
        const result = await load(path)
        setChildren((c) => ({ ...c, [path]: result.entries ?? [] }))
        if (!path) setRoot(result.root ?? '')
        setError(null)
      } catch (err) {
        setError(err.message || 'Could not list files')
      } finally {
        setLoading((l) => ({ ...l, [path]: false }))
      }
    },
    [load],
  )

  useEffect(() => {
    setChildren({})
    setOpen({})
    fetchDir('')
  }, [fetchDir, reloadKey])

  const toggle = (path) => {
    const next = !open[path]
    setOpen((o) => ({ ...o, [path]: next }))
    if (next && !children[path]) fetchDir(path)
  }

  const refresh = () => {
    // Re-read the root and every open folder; closed ones reload when next opened.
    setChildren({})
    fetchDir('')
    Object.keys(open).filter((p) => open[p]).forEach(fetchDir)
  }

  const renderDir = (path, depth) =>
    (children[path] ?? []).map((entry) => (
      <div key={entry.path}>
        <Row
          entry={entry}
          depth={depth}
          expanded={!!open[entry.path]}
          active={entry.path === activePath}
          onClick={() => (entry.type === 'dir' ? toggle(entry.path) : onOpen(entry.path))}
        />
        {entry.type === 'dir' && open[entry.path] && (
          loading[entry.path] && !children[entry.path] ? (
            <div style={{ paddingLeft: `${30 + (depth + 1) * 14}px` }} className="py-1 text-xs text-zinc-500">
              Loading…
            </div>
          ) : children[entry.path]?.length === 0 ? (
            <div style={{ paddingLeft: `${30 + (depth + 1) * 14}px` }} className="py-1 text-xs text-zinc-500">
              Empty
            </div>
          ) : (
            renderDir(entry.path, depth + 1)
          )
        )}
      </div>
    ))

  return (
    <div data-testid="file-tree" className="flex flex-col">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="min-w-0 truncate text-[11px] uppercase tracking-wide text-zinc-500" title={root}>
          {root || 'Files'}
        </span>
        <button
          type="button"
          data-testid="refresh-files"
          onClick={refresh}
          title="Refresh"
          className="shrink-0 rounded px-1.5 text-xs text-zinc-500 hover:text-zinc-200"
        >
          ↻
        </button>
      </div>
      {error && (
        <div role="alert" className="px-2 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
      {loading[''] && !children[''] && <div className="py-6 text-center text-xs text-zinc-500">Loading…</div>}
      {children['']?.length === 0 && <div className="py-6 text-center text-xs text-zinc-500">No files</div>}
      {renderDir('', 0)}
    </div>
  )
}
