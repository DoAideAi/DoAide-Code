// The .env diff page (/tools/env-diff): paste two .env files and see which keys are missing,
// extra, changed or the same, with values masked until revealed. Runs in the page.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { CATEGORIES, diffEnv, mask, toExample } from './envTool.js'
import { downloadText } from '../export.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'env-diff')
const AREA = 'w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 font-mono text-[16px] leading-relaxed text-zinc-200 sm:text-[13px]'
const STATUS = {
  missing: ['Missing', 'text-rose-300'],
  extra: ['Extra', 'text-sky-300'],
  changed: ['Changed', 'text-amber-200'],
  same: ['Same', 'text-zinc-500'],
}

const LEFT = `# .env.example
DATABASE_URL=postgres://localhost:5432/app
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=
SENTRY_DSN=
LOG_LEVEL=info
`
const RIGHT = `# .env (production)
DATABASE_URL=postgres://prod-db.internal:5432/app
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_live_51Hx9example
LOG_LEVEL=warn
FEATURE_BETA=true
LOG_LEVEL=error
`

export default function EnvDiffPage() {
  const [left, setLeft] = useState(LEFT)
  const [right, setRight] = useState(RIGHT)
  const [reveal, setReveal] = useState(false)
  const [filter, setFilter] = useState('diff') // 'all' | 'diff' | a category
  const [example, setExample] = useState(null) // generated .env.example text

  const { rows, counts, left: l, right: r } = useMemo(() => diffEnv(left, right), [left, right])
  const shown = rows.filter((row) => filter === 'all' || (filter === 'diff' ? row.status !== 'same' : row.status === filter))
  const show = (v) => (v === null ? '—' : v.value === '' ? '(empty)' : reveal ? v.value : mask(v.value))
  const problems = [
    ...l.errors.map((e) => `Left line ${e.line}: ${e.text}`),
    ...l.duplicates.map((d) => `Left line ${d.line}: ${d.key} repeats line ${d.first} — the later value wins`),
    ...r.errors.map((e) => `Right line ${e.line}: ${e.text}`),
    ...r.duplicates.map((d) => `Right line ${d.line}: ${d.key} repeats line ${d.first} — the later value wins`),
  ]

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Left — e.g. .env.example
          <textarea data-testid="env-left" value={left} onChange={(e) => setLeft(e.target.value)} rows={10} spellCheck={false} className={AREA} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Right — e.g. .env
          <textarea data-testid="env-right" value={right} onChange={(e) => setRight(e.target.value)} rows={10} spellCheck={false} className={AREA} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-sm text-zinc-300">
        {[['diff', `Differences (${rows.length - counts.same})`], ...CATEGORIES.map(([c, label]) => [c, `${label} (${counts[c]})`]), ['all', `All (${rows.length})`]].map(([f, label]) => (
          <button key={f} type="button" data-testid={`env-filter-${f}`} aria-pressed={filter === f} className={`${BUTTON} ${filter === f ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2">
          <input type="checkbox" data-testid="env-reveal" checked={reveal} onChange={(e) => setReveal(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Reveal values
        </label>
        <button
          type="button"
          className={BUTTON}
          onClick={() => {
            setLeft(right)
            setRight(left)
          }}
        >
          Swap sides
        </button>
      </div>

      {problems.length > 0 && (
        <ul data-testid="env-problems" className="flex flex-col gap-1">
          {problems.map((p) => (
            <li key={p} className="rounded border border-amber-900/60 bg-amber-950/20 px-3 py-1 text-xs text-amber-200">
              {p}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table data-testid="env-table" className="w-full text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 pr-3 font-normal">Key</th>
              <th className="py-1 pr-3 font-normal">Status</th>
              <th className="py-1 pr-3 font-normal">Left</th>
              <th className="py-1 font-normal">Right</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.key} data-testid={`env-row-${row.key}`} className="border-t border-zinc-800 align-top">
                <td className="py-1 pr-3 font-mono text-zinc-200">{row.key}</td>
                <td className={`py-1 pr-3 ${STATUS[row.status][1]}`}>
                  {STATUS[row.status][0]}
                  {row.empty && <span className="ml-1 text-xs text-zinc-500">· empty</span>}
                </td>
                <td className="max-w-[16rem] whitespace-pre-wrap break-all py-1 pr-3 font-mono text-zinc-400">{show(row.left)}</td>
                <td className="max-w-[16rem] whitespace-pre-wrap break-all py-1 font-mono text-zinc-400">{show(row.right)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="py-2 text-sm text-zinc-500">Nothing in this view.</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-testid="env-example" className={`${BUTTON} border-sky-800 text-sky-300`} onClick={() => setExample(toExample(right))}>
            Generate .env.example from the right file
          </button>
          {example !== null && (
            <>
              <CopyButton text={example} label="Copy" />
              <button type="button" className={BUTTON} onClick={() => downloadText('.env.example', example, 'text/plain')}>
                Download
              </button>
            </>
          )}
        </div>
        {example !== null && (
          <pre data-testid="env-example-out" className="overflow-auto whitespace-pre rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-emerald-200">
            {example}
          </pre>
        )}
      </div>
    </ToolShell>
  )
}
