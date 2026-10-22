// The JSON formatter and validator (/tools/json-formatter): paste JSON, see instantly whether it
// is valid (and where it broke), and explore it as a collapsible tree. Runs in the page.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_JSON_CHARS, jsonStats, parseJson } from './jsonTool.js'
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

function Node({ name, value, depth }) {
  // Top levels start open, deeper ones closed, so big documents stay fast and scannable.
  const [open, setOpen] = useState(depth < 2)
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === 'object'
  const label = name === null ? null : <span className="text-sky-300">{typeof name === 'number' ? name : `"${name}"`}</span>

  if (!isArray && !isObject) {
    return (
      <div className={MONO}>
        {label}
        {label && <span className="text-zinc-500">: </span>}
        <Leaf value={value} />
      </div>
    )
  }

  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value)
  const summary = isArray ? `[ ${value.length} item${value.length === 1 ? '' : 's'} ]` : `{ ${entries.length} key${entries.length === 1 ? '' : 's'} }`
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded px-1 text-left hover:bg-zinc-900 ${MONO}`}
      >
        <span aria-hidden className="w-3 text-zinc-500">{open ? '▾' : '▸'}</span>
        {label}
        {label && <span className="text-zinc-500">: </span>}
        <span className="text-zinc-500">{open ? (isArray ? '[' : '{') : summary}</span>
      </button>
      {open && (
        <div className="ml-4 border-l border-zinc-800/60 pl-3">
          {entries.slice(0, MAX_CHILDREN).map(([key, child]) => (
            <Node key={key} name={key} value={child} depth={depth + 1} />
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

export default function JsonPage() {
  const [text, setText] = useState('')

  const tooLong = text.length > MAX_JSON_CHARS
  const result = useMemo(() => (text.trim() && !tooLong ? parseJson(text) : null), [text, tooLong])
  const stats = useMemo(() => (result?.ok ? jsonStats(result.value) : null), [result])

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
            onClick={() => setText(JSON.stringify(result.value, null, 2))}
            className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Format
          </button>
          <button
            type="button"
            data-testid="json-minify"
            disabled={!result?.ok}
            onClick={() => setText(JSON.stringify(result.value))}
            className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Minify
          </button>
          <CopyButton text={text} label="Copy" testid="json-copy" />
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
          <div data-testid="json-tree" className="overflow-x-auto">
            <Node name={null} value={result.value} depth={0} />
          </div>
        </section>
      )}
    </ToolShell>
  )
}
