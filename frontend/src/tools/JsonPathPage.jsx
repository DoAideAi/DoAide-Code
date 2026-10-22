// The JSON path finder (/tools/json-path-finder): paste JSON on the left, click any value on the
// right and get its JSONPath and JavaScript accessor to copy.

import { useMemo, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { MAX_JSONPATH_CHARS, flatten, parseForPaths } from './jsonPathTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'json-path-finder')

const SAMPLE = '{\n  "users": [\n    { "name": "Asha", "roles": ["admin"] },\n    { "name": "Ben" }\n  ],\n  "total": 2\n}'

const KIND_COLOR = { object: 'text-sky-300', array: 'text-violet-300', leaf: 'text-emerald-300' }

export default function JsonPathPage() {
  const [text, setText] = useState(SAMPLE)
  const [picked, setPicked] = useState(null)

  const parsed = useMemo(() => (text.trim() ? parseForPaths(text) : null), [text])
  const tree = useMemo(() => (parsed && !parsed.error ? flatten(parsed.value) : null), [parsed])

  return (
    <ToolShell tool={TOOL}>
      {picked && (
        <div data-testid="jp-picked" className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-zinc-500">JSONPath</span>
            <code data-testid="jp-jsonpath" className="min-w-0 flex-1 break-all font-mono text-[13px] text-zinc-100">
              {picked.jsonPath}
            </code>
            <CopyButton text={picked.jsonPath} testid="jp-copy-jsonpath" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-zinc-500">JavaScript</span>
            <code data-testid="jp-js" className="min-w-0 flex-1 break-all font-mono text-[13px] text-zinc-100">
              {picked.js}
            </code>
            <CopyButton text={picked.js} testid="jp-copy-js" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="jp-input" className="text-sm font-medium text-zinc-200">
            Your JSON
          </label>
          <textarea
            id="jp-input"
            data-testid="jp-input"
            value={text}
            maxLength={MAX_JSONPATH_CHARS}
            onChange={(e) => {
              setText(e.target.value)
              setPicked(null)
            }}
            spellCheck={false}
            className="min-h-[360px] w-full flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-zinc-200">Click a value for its path</span>
          {parsed?.error && (
            <p role="alert" data-testid="jp-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {parsed.error}
            </p>
          )}
          {tree && (
            <div data-testid="jp-tree" className="max-h-[480px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              {tree.rows.map((row, i) => (
                <button
                  key={i}
                  type="button"
                  data-testid={`jp-node-${i}`}
                  onClick={() => setPicked(row.paths)}
                  style={{ paddingLeft: `${row.depth * 16 + 8}px` }}
                  className={`block w-full rounded py-0.5 pr-2 text-left font-mono text-[13px] leading-relaxed hover:bg-zinc-800/70 ${
                    picked === row.paths ? 'bg-zinc-800' : ''
                  }`}
                >
                  <span className="text-zinc-400">{row.label}</span>
                  {row.kind === 'leaf' ? (
                    <span className={`ml-2 ${KIND_COLOR.leaf}`}>{row.value}</span>
                  ) : (
                    <span className={`ml-2 ${KIND_COLOR[row.kind]}`}>
                      {row.kind === 'array' ? `[ ${row.size} item${row.size === 1 ? '' : 's'} ]` : `{ ${row.size} key${row.size === 1 ? '' : 's'} }`}
                    </span>
                  )}
                </button>
              ))}
              {tree.truncated && <p className="px-2 py-1 text-xs text-zinc-500">Large document: only the first part is shown.</p>}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-zinc-500">JSONPath for tools like jq-style queries, the JavaScript accessor for your code. Nothing leaves this page.</p>
    </ToolShell>
  )
}
