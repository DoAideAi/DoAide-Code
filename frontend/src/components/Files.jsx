import { useEffect, useState } from 'react'
import { listFiles, readFile } from '../api.js'

const describe = (error) => (error.status === 503 ? 'Laptop offline' : error.message)

// One folder of the tree, loaded lazily. `version` bumps after each answer so the tree
// reflects files the executors just changed.
function Folder({ token, path, depth, version, selected, onOpen, onRoot }) {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState({})

  useEffect(() => {
    let active = true
    listFiles(token, path)
      .then((body) => {
        if (!active) return
        setEntries(body.entries)
        setError(null)
        onRoot?.(body.root)
      })
      .catch((e) => active && setError(describe(e)))
    return () => {
      active = false
    }
  }, [token, path, version, onRoot])

  if (error) return <p className="px-3 py-1 text-xs text-zinc-500">{error}</p>
  if (!entries) return null
  if (depth === 0 && entries.length === 0) return <p className="px-3 py-1 text-xs text-zinc-600">Empty</p>
  return (
    <ul>
      {entries.map((entry) => {
        const pad = { paddingLeft: `${12 + depth * 12}px` }
        if (entry.type === 'dir') {
          return (
            <li key={entry.path}>
              <button
                type="button"
                style={pad}
                onClick={() => setOpen((o) => ({ ...o, [entry.path]: !o[entry.path] }))}
                className="w-full truncate py-0.5 pr-2 text-left text-zinc-400 hover:text-zinc-200"
              >
                <span className="inline-block w-3 text-zinc-600">{open[entry.path] ? '▾' : '▸'}</span>
                {entry.name}
              </button>
              {open[entry.path] && (
                <Folder
                  token={token}
                  path={entry.path}
                  depth={depth + 1}
                  version={version}
                  selected={selected}
                  onOpen={onOpen}
                />
              )}
            </li>
          )
        }
        return (
          <li key={entry.path}>
            <button
              type="button"
              style={pad}
              onClick={() => onOpen(entry.path)}
              className={`w-full truncate py-0.5 pr-2 text-left hover:text-zinc-100 ${
                selected === entry.path ? 'bg-zinc-800/70 text-zinc-100' : 'text-zinc-400'
              }`}
            >
              <span className="inline-block w-3" />
              {entry.name}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function FileTree({ token, version, selected, onOpen }) {
  const [root, setRoot] = useState(null)
  return (
    <nav data-testid="file-tree" className="w-60 shrink-0 overflow-y-auto border-r border-zinc-800/80 py-2 text-[13px]">
      <div className="truncate px-3 pb-1 text-[11px] uppercase tracking-wider text-zinc-600">{root ?? 'files'}</div>
      <Folder token={token} path="" depth={0} version={version} selected={selected} onOpen={onOpen} onRoot={setRoot} />
    </nav>
  )
}

export function CodeViewer({ token, path, version, onClose }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    readFile(token, path)
      .then((body) => {
        if (!active) return
        setFile(body)
        setError(null)
      })
      .catch((e) => active && setError(describe(e)))
    return () => {
      active = false
    }
  }, [token, path, version])

  const lines = file && !file.binary ? file.content.replace(/\n$/, '').split('\n') : []
  return (
    <section data-testid="code-viewer" className="flex min-w-0 flex-1 flex-col border-r border-zinc-800/80">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800/80 px-3 text-xs">
        <span className="truncate font-mono text-zinc-400">{path}</span>
        <button type="button" aria-label="Close file" onClick={onClose} className="px-1 text-zinc-500 hover:text-zinc-200">
          ×
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {error && <p className="p-3 text-xs text-zinc-500">{error}</p>}
        {file?.binary && <p className="p-3 text-xs text-zinc-500">Binary file</p>}
        {lines.length > 0 && (
          <pre className="py-2 font-mono text-[12.5px] leading-5 text-zinc-200">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-12 shrink-0 select-none pr-3 text-right text-zinc-600">{i + 1}</span>
                <code className="whitespace-pre pr-4">{line}</code>
              </div>
            ))}
          </pre>
        )}
        {file?.truncated && <p className="px-3 pb-3 text-xs text-zinc-600">Showing the first 500 KB.</p>}
      </div>
    </section>
  )
}
