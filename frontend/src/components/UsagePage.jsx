import { useEffect, useState } from 'react'
import { formatCost, formatTokens } from './MessageList.jsx'

// Two series, validated for the dark surface (CVD ΔE 26.8): free (local / direct) and paid.
const FREE = '#3987e5'
const PAID = '#d95926'
const PERIODS = [7, 30]

function Tile({ label, value, note }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-xl font-medium tabular-nums text-zinc-100">{value}</div>
      {note && <div className="text-[11px] text-zinc-500">{note}</div>}
    </div>
  )
}

function shortDate(iso) {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

// Tasks per day, free stacked under paid, with a hover tooltip per day.
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...daily.map((d) => d.tasks))
  const label = (i) => daily.length <= 7 || i % 5 === 0 || i === daily.length - 1
  return (
    <figure data-testid="daily-chart" className="m-0">
      <div className="mb-2 flex items-center gap-4 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FREE }} /> Free (local / direct)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PAID }} /> Paid (Claude / Codex)
        </span>
        <span className="ml-auto text-zinc-600">max {max} tasks/day</span>
      </div>
      <div className="relative flex h-36 items-end gap-[2px] border-b border-zinc-800" onMouseLeave={() => setHover(null)}>
        {daily.map((d, i) => {
          const paid = d.tasks - d.free_tasks
          return (
            <div
              key={d.date}
              data-testid="day-bar"
              className="flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              aria-label={`${d.date}: ${d.tasks} tasks, ${d.free_tasks} free, ${formatCost(d.cost_usd)}`}
            >
              {paid > 0 && (
                <div className="rounded-t-[4px]" style={{ height: `${(paid / max) * 100}%`, background: PAID }} />
              )}
              {d.free_tasks > 0 && (
                <div
                  className={paid > 0 ? 'mt-[2px]' : 'rounded-t-[4px]'}
                  style={{ height: `${(d.free_tasks / max) * 100}%`, background: FREE }}
                />
              )}
            </div>
          )
        })}
        {hover !== null && (
          <div
            data-testid="chart-tooltip"
            className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300 shadow-lg"
            style={{ left: `min(calc(${((hover + 0.5) / daily.length) * 100}% - 4rem), calc(100% - 8rem))` }}
          >
            <div className="text-zinc-100">{daily[hover].date}</div>
            <div>{daily[hover].tasks} tasks · {daily[hover].free_tasks} free</div>
            <div>
              {formatTokens(daily[hover].tokens)} tokens · {formatCost(daily[hover].cost_usd)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-zinc-600">
        {daily.map((d, i) => (
          <span key={d.date} className="min-w-0 flex-1 truncate text-center">
            {label(i) ? shortDate(d.date) : ''}
          </span>
        ))}
      </div>
      <details className="mt-2 text-xs text-zinc-500">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-zinc-500">
            <tr>
              <th className="font-normal">Day</th>
              <th className="font-normal">Tasks</th>
              <th className="font-normal">Free</th>
              <th className="font-normal">Tokens</th>
              <th className="font-normal">Cost</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {daily.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.tasks}</td>
                <td>{d.free_tasks}</td>
                <td>{formatTokens(d.tokens)}</td>
                <td>{formatCost(d.cost_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

// Totals over Tasks API results (GET /api/v1/tasks/history): how many, what they cost per model,
// how long they took on average, and how often the free answer had to be escalated.
export function taskStats(tasks) {
  const timed = tasks.filter((t) => t.response_time_seconds != null)
  const byModel = new Map()
  for (const t of tasks) {
    const name = t.model || t.executor || 'unknown'
    const row = byModel.get(name) ?? { model: name, tasks: 0, cost_usd: 0, seconds: 0, timed: 0 }
    row.tasks += 1
    row.cost_usd += t.cost_usd || 0
    if (t.response_time_seconds != null) {
      row.seconds += t.response_time_seconds
      row.timed += 1
    }
    byModel.set(name, row)
  }
  return {
    tasks: tasks.length,
    cost_usd: tasks.reduce((sum, t) => sum + (t.cost_usd || 0), 0),
    avg_seconds: timed.length ? timed.reduce((sum, t) => sum + t.response_time_seconds, 0) / timed.length : null,
    escalation_rate: tasks.length ? tasks.filter((t) => t.escalated).length / tasks.length : 0,
    by_model: [...byModel.values()]
      .map((m) => ({ model: m.model, tasks: m.tasks, cost_usd: m.cost_usd, avg_seconds: m.timed ? m.seconds / m.timed : null }))
      .sort((a, b) => b.cost_usd - a.cost_usd || b.tasks - a.tasks),
  }
}

function seconds(value) {
  return value == null ? '–' : `${value < 10 ? value.toFixed(1) : Math.round(value)}s`
}

// Task performance from the Tasks API history (loaded once; it is not split by period).
function TaskPerformance({ loadHistory }) {
  const [tasks, setTasks] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    loadHistory()
      .then((r) => active && setTasks(r.tasks ?? []))
      .catch((e) => active && setError(e.message || 'Could not load task history'))
    return () => {
      active = false
    }
  }, [loadHistory])
  if (error) return <p className="text-sm text-red-300">{error}</p>
  if (!tasks) return <p className="text-sm text-zinc-500">Loading task history…</p>
  const s = taskStats(tasks)
  return (
    <section data-testid="task-performance" className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium text-zinc-300">Task performance</h2>
        <p className="text-[11px] text-zinc-500">The last {s.tasks} tasks sent through the Tasks API (Dispatch and scripts).</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total tasks" value={s.tasks} />
        <Tile label="Total cost" value={formatCost(s.cost_usd)} />
        <Tile label="Avg response" value={seconds(s.avg_seconds)} />
        <Tile
          label="Escalated"
          value={`${Math.round(s.escalation_rate * 100)}%`}
          note="free answer failed its checks"
        />
      </div>
      <div className="overflow-x-auto">
        <table data-testid="task-cost-by-model" className="w-full text-left text-xs tabular-nums">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 font-normal">Model</th>
              <th className="py-1 font-normal">Tasks</th>
              <th className="py-1 font-normal">Avg time</th>
              <th className="py-1 text-right font-normal">Cost</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {s.by_model.map((m) => (
              <tr key={m.model} className="border-t border-zinc-900">
                <td className="py-1.5">{m.model}</td>
                <td>{m.tasks}</td>
                <td>{seconds(m.avg_seconds)}</td>
                <td className="text-right">{formatCost(m.cost_usd)}</td>
              </tr>
            ))}
            {s.by_model.length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-zinc-500">
                  No tasks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Tokens and cost by day and model, which model handled each task, and what free models saved.
export default function UsagePage({ load, loadHistory = null, onClose }) {
  const [days, setDays] = useState(7)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setError(null)
    load(days)
      .then((r) => active && setReport(r))
      .catch((e) => active && setError(e.message || 'Could not load usage'))
    return () => {
      active = false
    }
  }, [days, load])

  const t = report?.totals
  return (
    <div data-testid="usage-page" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-zinc-100">Usage</h1>
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              Close
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!report && !error && <p className="text-sm text-zinc-500">Loading…</p>}
        {report && (
          <>
            <p data-testid="usage-headline" className="text-sm text-zinc-300">
              {report.headline}
              {t.saved_usd > 0 && (
                <span className="text-zinc-500"> About {formatCost(t.saved_usd)} saved compared with Claude Sonnet.</span>
              )}
              {t.escalated > 0 && (
                <span data-testid="usage-escalated" className="text-zinc-500">
                  {' '}
                  {t.escalated} {t.escalated === 1 ? 'task was' : 'tasks were'} escalated to a paid model after the free answer
                  failed its checks.
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Tasks" value={t.tasks} />
              <Tile label="Free" value={`${Math.round(t.free_share * 100)}%`} note={`${t.free_tasks} tasks at $0`} />
              <Tile label="Cost" value={formatCost(t.cost_usd)} note="API-equivalent" />
              <Tile label="Tokens" value={formatTokens(t.tokens_in + t.tokens_out)} note={`${formatTokens(t.tokens_out)} out`} />
            </div>
            <DailyChart daily={report.daily} />
            {loadHistory && <TaskPerformance loadHistory={loadHistory} />}
            <section>
              <h2 className="mb-2 text-sm font-medium text-zinc-300">By model</h2>
              <table data-testid="by-model" className="w-full text-left text-xs tabular-nums">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-1 font-normal">Model</th>
                    <th className="py-1 font-normal">Tasks</th>
                    <th className="py-1 font-normal">Tokens</th>
                    <th className="py-1 text-right font-normal">Cost</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {report.by_model.map((m) => (
                    <tr key={m.model} className="border-t border-zinc-900">
                      <td className="py-1.5">
                        {m.model}
                        {m.free && <span className="ml-2 text-[10px] text-zinc-500">free</span>}
                      </td>
                      <td>{m.tasks}</td>
                      <td>{formatTokens(m.tokens_in + m.tokens_out)}</td>
                      <td className="text-right">{formatCost(m.cost_usd)}</td>
                    </tr>
                  ))}
                  {report.by_model.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-zinc-500">
                        No tasks in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-medium text-zinc-300">Recent tasks</h2>
              <ul data-testid="recent-tasks" className="divide-y divide-zinc-900 text-xs">
                {report.recent.map((r) => (
                  <li key={r.id} className="flex items-baseline gap-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-zinc-300" title={r.prompt}>
                      {r.source === 'mcp' && <span className="mr-1 text-amber-300/80">Claude Code ·</span>}
                      {r.prompt || '(no prompt)'}
                    </span>
                    <span className="shrink-0 text-zinc-400">
                      {r.model}
                      {r.escalated && (
                        <span className="ml-1 text-amber-300/80" title="escalated: the free answer failed its checks">
                          ↑
                        </span>
                      )}
                    </span>
                    {r.checks_ok !== null && (
                      <span className={`shrink-0 ${r.checks_ok ? 'text-zinc-500' : 'text-red-300'}`}>
                        {r.checks_ok ? '✓' : '✗'}
                      </span>
                    )}
                    <span className="w-14 shrink-0 text-right tabular-nums text-zinc-500">{formatCost(r.cost_usd)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
