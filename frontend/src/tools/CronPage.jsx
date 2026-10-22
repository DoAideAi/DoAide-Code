// The cron expression editor (/tools/cron-builder): type or pick a cron expression, read it
// back in plain words, and see the next run times in your local timezone. Runs in the page.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_CRON_CHARS, describeCron, nextRuns, parseCron } from './cronTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'cron-builder')

const PRESETS = [
  ['* * * * *', 'Every minute'],
  ['*/15 * * * *', 'Every 15 minutes'],
  ['0 * * * *', 'Hourly'],
  ['0 0 * * *', 'Daily at midnight'],
  ['0 9 * * 1-5', 'Weekdays at 9:00'],
  ['0 0 * * 0', 'Weekly on Sunday'],
  ['0 0 1 * *', 'Monthly on the 1st'],
  ['0 3 1 1 *', 'Yearly, Jan 1 at 3:00'],
]

const FIELD_HELP = [
  ['minute', '0–59'],
  ['hour', '0–23'],
  ['day of month', '1–31'],
  ['month', '1–12 or jan–dec'],
  ['day of week', '0–7 or sun–sat (0 and 7 are Sunday)'],
]

export default function CronPage() {
  const [expr, setExpr] = useState('*/15 * * * *')
  const parsed = expr.trim() && expr.length <= MAX_CRON_CHARS ? parseCron(expr) : null
  const description = parsed && !parsed.error ? describeCron(expr) : null
  const runs = parsed && !parsed.error ? nextRuns(expr, 5) : []

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="cron-in" className="sr-only">
          Cron expression
        </label>
        <input
          id="cron-in"
          data-testid="cron-in"
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          maxLength={MAX_CRON_CHARS}
          placeholder="*/15 * * * *"
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-lg tracking-wide text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2" aria-label="Presets">
          {PRESETS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setExpr(value)} className={BUTTON}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Five fields: minute, hour, day of month, month, day of week. @daily-style shortcuts work too. Everything runs
          in this page.
        </p>
      </div>

      {parsed?.error && (
        <p role="alert" data-testid="cron-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {parsed.error}
        </p>
      )}

      {description && (
        <section aria-label="In plain words" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">In plain words</h2>
            <div className="ml-auto">
              <CopyButton text={expr.trim()} label="Copy expression" testid="cron-copy" />
            </div>
          </div>
          <p data-testid="cron-description" className="text-lg text-zinc-100">
            {description}
          </p>
        </section>
      )}

      {runs.length > 0 && (
        <section aria-label="Next runs" className="rounded-lg border border-zinc-800 p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-200">Next 5 runs (your local time)</h2>
          <ol data-testid="cron-runs" className="flex flex-col gap-1 font-mono text-[13px] text-zinc-300">
            {runs.map((d) => (
              <li key={d.getTime()}>{d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>
            ))}
          </ol>
        </section>
      )}

      <section aria-label="Field reference" className="rounded-lg border border-zinc-800 p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-200">Field reference</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {FIELD_HELP.map(([name, range]) => (
            <div key={name} className="contents">
              <dt className="text-zinc-400">{name}</dt>
              <dd className="text-zinc-200">{range}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-zinc-500">
          Each field takes a value (5), a list (1,15), a range (1-5), a step (*/10) or * for any. When day of month and
          day of week are both set, cron runs on either.
        </p>
      </section>
    </ToolShell>
  )
}
