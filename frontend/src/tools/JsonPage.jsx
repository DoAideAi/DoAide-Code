// The JSON formatter and validator (/tools/json-formatter): paste JSON, see instantly whether it
// is valid (and where it broke), and explore it as a collapsible tree — search keys and values,
// expand or collapse everything, and click any node for its JSONPath. Runs in the page.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import RecentSnippets from './RecentSnippets.jsx'
import { rememberSnippet } from './snippets.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_JSON_CHARS, MAX_MATCHES, jsAccessor, jsonPath, jsonStats, parseJson, pathKey, searchJson } from './jsonTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'json-formatter')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'
// Children of one node shown before "… n more"; keeps giant arrays from freezing the page.
const MAX_CHILDREN = 300

function Leaf({ value }) {
  if (value === null) return <span className="text-zinc-500">null</span>
  if (typeof value === 'string') return <span className="text-emerald-300">"{value}"</span>
  if (typeof value === 'number') return <span className="text-amber-300">{String(value)}</span>
  return <span className="text-violet-300">{String(value)}</span>
}

// What every node needs from the page: search results, the expand/collapse-all signal and the
// selected path. Passed by context so the recursive tree doesn't thread props by hand.
const TreeContext = createContext(null)

function Name({ name, path }) {
  const { search, selected, select } = useContext(TreeContext)
  const key = pathKey(path)
  const hit = search.matches.has(key)
  return (
    <span
      role="button"
      tabIndex={0}
      title="Show this node's path"
      onClick={(e) => {
        e.stopPropagation()
        select(path)
      }}
      onKeyDown={(e) => e.key === 'Enter' && select(path)}
      className={`cursor-pointer rounded ${selected === key ? 'ring-1 ring-sky-500' : ''} ${hit ? 'bg-amber-500/25' : ''}`}
    >
      {name === null ? <span className="text-zinc-500">$</span> : <span className="text-sky-300">{typeof name === 'number' ? name : `"${name}"`}</span>}
    </span>
  )
}

function Node({ name, value, depth, path }) {
  const { search, expand } = useContext(TreeContext)
  // Top levels start open, deeper ones closed, so big documents stay fast and scannable.
  const [open, setOpen] = useState(depth < 2)
  useEffect(() => {
    if (expand.n) setOpen(expand.mode === 'open' || depth === 0)
  }, [expand, depth])
  const forced = search.open.has(pathKey(path))
  const shown = open || forced
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === 'object'
  const label = <Name name={name} path={path} />

  if (!isArray && !isObject) {
    return (
      <div className={MONO}>
        {name !== null && (
          <>
            {label}
            <span className="text-zinc-500">: </span>
          </>
        )}
        <span className={search.matches.has(pathKey(path)) ? 'rounded bg-amber-500/25' : ''}>
          <Leaf value={value} />
        </span>
      </div>
    )
  }

  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value)
  const summary = isArray ? `[ ${value.length} item${value.length === 1 ? '' : 's'} ]` : `{ ${entries.length} key${entries.length === 1 ? '' : 's'} }`
  return (
    <div>
      <div className={`flex items-center gap-1 ${MONO}`}>
        <button
          type="button"
          aria-expanded={shown}
          aria-label={`${shown ? 'Collapse' : 'Expand'} ${name === null ? 'root' : typeof name === 'number' ? `item ${name}` : `"${name}"`}`}
          onClick={() => setOpen(!shown)}
          className="w-4 rounded text-zinc-500 hover:bg-zinc-900"
        >
          {shown ? '▾' : '▸'}
        </button>
        {label}
        {name !== null && <span className="text-zinc-500">: </span>}
        <button type="button" onClick={() => setOpen(!shown)} className="rounded px-1 text-zinc-500 hover:bg-zinc-900">
          {shown ? (isArray ? '[' : '{') : summary}
        </button>
      </div>
      {shown && (
        <div className="ml-4 border-l border-zinc-800/60 pl-3">
          {entries.slice(0, MAX_CHILDREN).map(([key, child]) => (
            <Node key={key} name={key} value={child} depth={depth + 1} path={[...path, key]} />
          ))}
          {entries.length > MAX_CHILDREN && (
            <div className={`text-zinc-500 ${MONO}`}>… {entries.length - MAX_CHILDREN} more</div>
          )}
          <div className={`text-zinc-500 ${MONO}`}>{isArray ? ']' : '}'}</div>
        </div>
      )}
    </div>
  )
}

function valueAt(root, path) {
  return path.reduce((v, k) => v?.[k], root)
}

export default function JsonPage() {
  const [text, setText] = useState('')
  const [historyAt, setHistoryAt] = useState(0)
  const [query, setQuery] = useState('')
  const [expand, setExpand] = useState({ mode: 'open', n: 0 })
  const [selected, setSelected] = useState(null)

  const tooLong = text.length > MAX_JSON_CHARS
  const result = useMemo(() => (text.trim() && !tooLong ? parseJson(text) : null), [text, tooLong])
  const stats = useMemo(() => (result?.ok ? jsonStats(result.value) : null), [result])
  const search = useMemo(() => (result?.ok ? searchJson(result.value, query) : searchJson(null, '')), [result, query])
  const selectedPath = selected && result?.ok ? JSON.parse(selected) : null
  const selectedValue = selectedPath ? valueAt(result.value, selectedPath) : undefined
  const tree = useMemo(() => ({ search, expand, selected, select: (path) => setSelected(pathKey(path)) }), [search, expand, selected])
  const keepAnd = (make) => () => {
    rememberSnippet('json-formatter', text, 'JSON')
    setHistoryAt(Date.now())
    setText(make())
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="json-in" className="sr-only">
          Your JSON
        </label>
        <textarea
          id="json-in"
          data-testid="json-in"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={10}
          placeholder='{"paste": ["your", "JSON", "here"]}'
          className={`w-full resize-y rounded-lg border bg-shade/40 p-3 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none ${MONO} ${
            result && !result.ok ? 'border-red-900/80' : 'border-zinc-800'
          }`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="json-format"
            disabled={!result?.ok}
            onClick={keepAnd(() => JSON.stringify(result.value, null, 2))}
            className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Format
          </button>
          <button
            type="button"
            data-testid="json-minify"
            disabled={!result?.ok}
            onClick={keepAnd(() => JSON.stringify(result.value))}
            className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Minify
          </button>
          <CopyButton text={text} label="Copy" testid="json-copy" />
          <RecentSnippets scope="json-formatter" refreshKey={historyAt} onRestore={(s) => setText(s.code)} />
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {text.length.toLocaleString()} / {MAX_JSON_CHARS.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-zinc-500">Validates as you type. Your data never leaves this page.</p>
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's too much JSON: keep it under {MAX_JSON_CHARS.toLocaleString()} characters.
        </p>
      )}
      {result && !result.ok && (
        <p role="alert" data-testid="json-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          Invalid JSON{result.line ? ` at line ${result.line}, column ${result.col}` : ''}: {result.error}
        </p>
      )}
      {result?.ok && (
        <section aria-label="JSON tree" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <p data-testid="json-valid" role="status" className="text-xs text-emerald-400">
            Valid JSON · {stats.values.toLocaleString()} value{stats.values === 1 ? '' : 's'}
            {stats.keys > 0 && `, ${stats.keys.toLocaleString()} key${stats.keys === 1 ? '' : 's'}`}, {stats.depth} level
            {stats.depth === 1 ? '' : 's'} deep
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              data-testid="json-search"
              aria-label="Search keys and values"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keys and values…"
              className="min-h-[44px] min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]"
            />
            {query.trim() && (
              <span data-testid="json-search-count" className="text-xs text-zinc-400">
                {search.count >= MAX_MATCHES ? `${MAX_MATCHES}+` : search.count} match{search.count === 1 ? '' : 'es'}
              </span>
            )}
            <button type="button" data-testid="json-expand-all" className={BUTTON} onClick={() => setExpand((e) => ({ mode: 'open', n: e.n + 1 }))}>
              Expand all
            </button>
            <button type="button" data-testid="json-collapse-all" className={BUTTON} onClick={() => setExpand((e) => ({ mode: 'closed', n: e.n + 1 }))}>
              Collapse all
            </button>
          </div>
          {selectedPath && selectedValue !== undefined && (
            <div data-testid="json-path" className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs">
              {[
                ['JSONPath', jsonPath(selectedPath)],
                ['JavaScript', jsAccessor(selectedPath)],
              ].map(([label, text]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-zinc-500">{label}</span>
                  <code data-testid={`json-path-${label.toLowerCase()}`} className="min-w-0 flex-1 break-all text-emerald-300">
                    {text}
                  </code>
                  <CopyButton text={text} label="Copy" />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-zinc-500">Value</span>
                <code className="min-w-0 flex-1 truncate text-zinc-300">{JSON.stringify(selectedValue)}</code>
                <CopyButton text={JSON.stringify(selectedValue, null, 2)} label="Copy" />
              </div>
            </div>
          )}
          <div data-testid="json-tree" className="overflow-x-auto">
            <TreeContext.Provider value={tree}>
              <Node name={null} value={result.value} depth={0} path={[]} />
            </TreeContext.Provider>
          </div>
        </section>
      )}
    </ToolShell>
  )
}
