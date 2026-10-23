// The performance audit page (/tools/performance-audit): paste HTML, get a score, findings by
// severity, what passed, and the server-side checklist static analysis cannot cover.

import { useMemo, useState } from 'react'
import ToolShell from './ToolShell.jsx'
import { MAX_HTML_INPUT, SERVER_CHECKLIST, auditHtml } from './perfAuditTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'performance-audit')

const SEVERITY_STYLES = {
  high: 'border-red-900/60 bg-red-950/30 text-red-300',
  medium: 'border-amber-900/60 bg-amber-950/20 text-amber-300',
  low: 'border-sky-900/60 bg-sky-950/20 text-sky-300',
}
const SEVERITY_LABELS = { high: 'High impact', medium: 'Medium', low: 'Low' }

const scoreColor = (score) => (score >= 90 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400')

export default function PerfAuditPage() {
  const [text, setText] = useState('')

  const result = useMemo(() => {
    if (!text.trim()) return null
    try {
      return { ...auditHtml(text), error: null }
    } catch (e) {
      return { error: e.message }
    }
  }, [text])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="perf-input" className="text-sm font-medium text-zinc-200">
            Page HTML <span className="font-normal text-zinc-500">(open view-source: on your page, select all, paste)</span>
          </label>
          <textarea
            id="perf-input"
            data-testid="perf-input"
            value={text}
            maxLength={MAX_HTML_INPUT}
            onChange={(e) => setText(e.target.value)}
            placeholder="<!doctype html>…"
            spellCheck={false}
            className="min-h-[180px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>

        {result?.error && (
          <p role="alert" data-testid="perf-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {result.error}
          </p>
        )}

        {result && !result.error && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 p-4">
              <p data-testid="perf-score" className={`text-4xl font-semibold ${scoreColor(result.score)}`}>
                {result.score}
              </p>
              <div className="text-sm text-zinc-400">
                <p className="font-medium text-zinc-200">Static markup score</p>
                <p>
                  {result.stats.elements.toLocaleString()} elements · {result.stats.images} images · {result.stats.scripts} scripts · {result.stats.stylesheets}{' '}
                  stylesheets · {(result.stats.bytes / 1024).toFixed(1)} KB of HTML
                </p>
              </div>
            </div>

            {result.findings.length > 0 && (
              <section className="flex flex-col gap-2" aria-label="Findings">
                <h2 className="text-sm font-medium text-zinc-200">
                  {result.findings.length} thing{result.findings.length > 1 ? 's' : ''} to fix
                </h2>
                <ul data-testid="perf-findings" className="flex flex-col gap-2">
                  {result.findings.map((f) => (
                    <li key={f.title} className={`rounded-lg border px-4 py-3 ${SEVERITY_STYLES[f.severity]}`}>
                      <p className="text-sm font-medium">
                        <span className="mr-2 rounded-full border border-current px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{SEVERITY_LABELS[f.severity]}</span>
                        {f.title}
                      </p>
                      <p className="pt-1 text-sm text-zinc-300">{f.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.passed.length > 0 && (
              <section className="flex flex-col gap-2" aria-label="Passed checks">
                <h2 className="text-sm font-medium text-zinc-200">Already right</h2>
                <ul data-testid="perf-passed" className="grid gap-1 sm:grid-cols-2">
                  {result.passed.map((p) => (
                    <li key={p} className="text-sm text-emerald-300/90">
                      ✓ <span className="text-zinc-400">{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <section className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4" aria-label="Server checklist">
          <h2 className="text-sm font-medium text-zinc-200">Beyond the markup: the server checklist</h2>
          <p className="text-xs text-zinc-500">Headers and protocols cannot be read from pasted HTML — check these on your server or CDN:</p>
          <ul className="flex flex-col gap-1.5">
            {SERVER_CHECKLIST.map(([title, detail]) => (
              <li key={title} className="text-sm text-zinc-400">
                <span className="font-medium text-zinc-300">{title}.</span> {detail}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ToolShell>
  )
}
