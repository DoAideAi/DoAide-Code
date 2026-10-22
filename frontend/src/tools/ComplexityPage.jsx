// The code complexity analyzer (/tools/code-complexity): paste code, see line metrics, nesting
// depth and cyclomatic complexity per function, with the risky ones flagged first. Runs in the
// page; nothing is uploaded.

import { useState } from 'react'
import CodeEditor, { savedEditorTheme } from './CodeEditor.jsx'
import RecentSnippets from './RecentSnippets.jsx'
import ShortcutsHelp from './ShortcutsHelp.jsx'
import { rememberSnippet } from './snippets.js'
import ToolShell from './ToolShell.jsx'
import { MAX_COMPLEXITY_CHARS, analyze, complexityBand } from './complexityTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'code-complexity')

const PLACEHOLDER = `function shipping(order, user) {
  if (!order || !order.items.length) return null
  let total = 0
  for (const item of order.items) {
    if (item.fragile && user.country !== 'IN') total += 50
    else if (item.weight > 10 || item.oversized) total += 30
    else total += 10
  }
  return user.prime ? 0 : total
}`

const TONES = {
  good: 'bg-emerald-950/40 text-emerald-300 border-emerald-900/60',
  ok: 'bg-sky-950/40 text-sky-300 border-sky-900/60',
  warn: 'bg-amber-950/40 text-amber-300 border-amber-900/60',
  bad: 'bg-red-950/40 text-red-300 border-red-900/60',
}

function Band({ score }) {
  const band = complexityBand(score)
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[band.tone]}`}>
      {score} · {band.label}
    </span>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 p-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-zinc-100">{value}</span>
    </div>
  )
}

export default function ComplexityPage() {
  const [code, setCode] = useState('')
  const [report, setReport] = useState(null)
  const [historyAt, setHistoryAt] = useState(0)

  const tooLong = code.length > MAX_COMPLEXITY_CHARS
  const run = () => {
    if (tooLong || !code.trim()) return
    rememberSnippet('code-complexity', code)
    setHistoryAt(Date.now())
    setReport(analyze(code))
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="cx-in" className="sr-only">
          Your code
        </label>
        <CodeEditor id="cx-in" testid="cx-in" value={code} onChange={setCode} onRun={run} placeholder={PLACEHOLDER} theme={savedEditorTheme()} />
        <div className="flex flex-wrap items-center gap-2">
          <RecentSnippets scope="code-complexity" refreshKey={historyAt} onRestore={(s) => setCode(s.code)} />
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {code.length.toLocaleString()} / {MAX_COMPLEXITY_CHARS.toLocaleString()}
          </span>
          <button
            type="button"
            data-testid="cx-run"
            onClick={run}
            disabled={tooLong}
            className="min-h-[44px] rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]"
          >
            Analyze
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-500">Ctrl/⌘ + Enter to analyze. Your code never leaves this page.</p>
          <ShortcutsHelp />
        </div>
      </div>

      {report && (
        <section aria-label="Complexity report" data-testid="cx-report" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Lines" value={report.totalLines.toLocaleString()} />
            <Stat label="Code lines" value={report.codeLines.toLocaleString()} />
            <Stat label="Comment lines" value={report.commentLines.toLocaleString()} />
            <Stat label="Comment ratio" value={`${Math.round(report.commentRatio * 100)}%`} />
            <Stat label="Max nesting" value={report.maxNesting} />
            <div className="flex flex-col rounded-lg border border-zinc-800 p-3">
              <span className="text-xs text-zinc-500">File complexity</span>
              <span className="mt-1">
                <Band score={report.fileComplexity} />
              </span>
            </div>
          </div>

          {report.functions.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Cyclomatic complexity per function</caption>
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <th scope="col" className="px-3 py-2 font-medium">Function</th>
                    <th scope="col" className="px-3 py-2 font-medium">Line</th>
                    <th scope="col" className="px-3 py-2 font-medium">Length</th>
                    <th scope="col" className="px-3 py-2 font-medium">Cyclomatic complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {report.functions.map((f) => (
                    <tr key={`${f.name}-${f.line}`} className="border-b border-zinc-800/60 last:border-0">
                      <td className="px-3 py-2 font-mono text-[13px] text-zinc-200">{f.name}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-400">{f.line}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-400">{f.lines} lines</td>
                      <td className="px-3 py-2">
                        <Band score={f.complexity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No function definitions found; the file-level score covers everything pasted.</p>
          )}
          <p className="text-xs text-zinc-500">
            Cyclomatic complexity counts the independent paths through a function: 1–5 is easy to test, 6–10 deserves a look,
            above 10 is worth splitting up. The <a className="text-sky-300 underline hover:text-sky-200" href="/tools/code-review">free AI code review</a> can
            suggest how.
          </p>
        </section>
      )}
    </ToolShell>
  )
}
