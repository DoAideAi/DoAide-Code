import { useEffect, useState } from 'react'
import { formatCost } from './MessageList.jsx'
import { ToolRow } from './Models.jsx'

const PERIODS = [7, 30, 90]

export function percent(rate) {
  return rate === null || rate === undefined ? '–' : `${Math.round(rate * 100)}%`
}

// "free", "1×" (Sonnet itself), "3×", "0.4×": cost per task relative to Claude Sonnet.
export function versusSonnet(m) {
  if (m.kind === 'local') return 'free'
  if (m.cost_vs_sonnet === null || m.cost_vs_sonnet === undefined) return '–'
  return `${m.cost_vs_sonnet}×`
}

function QualityBar({ rate }) {
  if (rate === null || rate === undefined) return <span className="text-zinc-600">–</span>
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
        <span className="block h-full rounded-full bg-zinc-300" style={{ width: `${Math.round(rate * 100)}%` }} />
      </span>
      <span className="tabular-nums">{percent(rate)}</span>
    </span>
  )
}

// View only: what this laptop can run, and how each model has done on the user's own tasks.
// Routing picks the model (a free local one first, Claude Sonnet when its answer fails checks).
export default function ModelsPage({ load, models, onClose }) {
  const [days, setDays] = useState(30)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setError(null)
    load(days)
      .then((r) => active && setReport(r))
      .catch((e) => active && setError(e.message || 'Could not load the comparison'))
    return () => {
      active = false
    }
  }, [days, load])

  return (
    <div data-testid="models-page" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-zinc-100">Models</h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>
        <p className="text-sm text-zinc-400">
          DoAide picks the model for each task: a free local model first, then Claude Sonnet if that answer fails its
          checks. Opus is kept for expert-level work.
        </p>

        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-300">On your laptop</h2>
          {models ? (
            <ul data-testid="models-detected" className="divide-y divide-zinc-900 rounded-lg border border-zinc-800">
              {models.tools.map((t) => (
                <ToolRow key={t.id} tool={t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Waiting for your laptop to report its models…</p>
          )}
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">Cost and quality on your tasks</h2>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={days === p}
                  onClick={() => setDays(p)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    days === p ? 'border-zinc-500 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p} days
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {!report && !error && <p className="text-sm text-zinc-500">Loading…</p>}
          {report && (
            <div className="overflow-x-auto">
              <table data-testid="models-compare" className="w-full min-w-[34rem] text-left text-xs tabular-nums">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-1 font-normal">Model</th>
                    <th className="py-1 font-normal">Tasks</th>
                    <th className="py-1 font-normal" title="Local: first tries good enough to show. Paid: answers that passed every check.">
                      Quality
                    </th>
                    <th className="py-1 font-normal">Cost / task</th>
                    <th className="py-1 font-normal">vs Sonnet</th>
                    <th className="py-1 text-right font-normal">Median time</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {report.models.map((m) => (
                    <tr key={m.model} data-kind={m.kind} className="border-t border-zinc-900">
                      <td className="py-1.5 pr-2">
                        {m.model}
                        {m.kind === 'local' && <span className="ml-2 text-[10px] text-zinc-500">free</span>}
                        {!m.enough_data && <span className="ml-2 text-[10px] text-zinc-600">few tasks</span>}
                      </td>
                      <td>
                        {m.tasks}
                        {m.escalated > 0 && <span className="text-zinc-500"> (+{m.escalated} escalated)</span>}
                      </td>
                      <td>
                        <QualityBar rate={m.quality} />
                      </td>
                      <td>{m.cost_per_task === null ? 'not reported' : formatCost(m.cost_per_task)}</td>
                      <td>{versusSonnet(m)}</td>
                      <td className="text-right">{m.median_seconds === null ? '–' : `${m.median_seconds}s`}</td>
                    </tr>
                  ))}
                  {report.models.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-2 text-zinc-500">
                        No model has run a task in this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-zinc-500">
            Measured on your own tasks, not published benchmarks. Quality for local models is how often their first try
            was good enough to show; for paid models, how often an answer passed every check (complete, code parses, edits
            apply). Costs are the API-equivalent amounts the CLIs report; subscription runs are not billed per task.
          </p>
        </section>
      </div>
    </div>
  )
}
