// The SQL formatter and validator (/tools/sql-formatter): paste a query, get it back with one
// clause per line and keywords uppercased, plus a sanity check for the usual paste mistakes.
// Runs in the page; nothing is uploaded.

import { useState } from 'react'
import CodeEditor, { savedEditorTheme } from './CodeEditor.jsx'
import RecentSnippets from './RecentSnippets.jsx'
import ShortcutsHelp from './ShortcutsHelp.jsx'
import { rememberSnippet } from './snippets.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_SQL_CHARS, formatSql, validateSql } from './sqlTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'sql-formatter')

const PLACEHOLDER = `select u.id, u.name, count(o.id) as orders from users u
left join orders o on o.user_id = u.id where u.active = true
group by u.id, u.name order by orders desc limit 10;`

export default function SqlPage() {
  const [sql, setSql] = useState('')
  const [result, setResult] = useState(null)
  const [historyAt, setHistoryAt] = useState(0)

  const tooLong = sql.length > MAX_SQL_CHARS
  const run = () => {
    if (tooLong) return
    rememberSnippet('sql-formatter', sql, 'SQL')
    setHistoryAt(Date.now())
    setResult({ out: formatSql(sql), problems: validateSql(sql) })
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="sql-in" className="sr-only">
          Your SQL
        </label>
        <CodeEditor
          id="sql-in"
          testid="sql-in"
          value={sql}
          onChange={setSql}
          onRun={run}
          placeholder={PLACEHOLDER}
          language="sql"
          theme={savedEditorTheme()}
        />
        <div className="flex flex-wrap items-center gap-2">
          <RecentSnippets scope="sql-formatter" refreshKey={historyAt} onRestore={(s) => setSql(s.code)} />
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {sql.length.toLocaleString()} / {MAX_SQL_CHARS.toLocaleString()}
          </span>
          <button
            type="button"
            data-testid="sql-run"
            onClick={run}
            disabled={tooLong}
            className="min-h-[44px] rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]"
          >
            Format &amp; check
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-500">Ctrl/⌘ + Enter to format. Your SQL never leaves this page.</p>
          <ShortcutsHelp />
        </div>
      </div>

      {result && result.problems.length > 0 && (
        <section aria-label="Problems" data-testid="sql-problems" className="flex flex-col gap-1.5">
          {result.problems.map((p, i) => (
            <p
              key={i}
              role="alert"
              className={`rounded-lg border px-3 py-2 text-sm ${
                p.hint === 'warning'
                  ? 'border-amber-900/60 bg-amber-950/30 text-amber-300'
                  : 'border-red-900/60 bg-red-950/30 text-red-300'
              }`}
            >
              {p.message}
            </p>
          ))}
        </section>
      )}
      {result && result.problems.length === 0 && (
        <p data-testid="sql-ok" className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          No problems found.
        </p>
      )}
      {result && (
        <section aria-label="Formatted SQL" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">Formatted SQL</h2>
            <div className="ml-auto flex gap-2">
              <CopyButton text={result.out} label="Copy result" testid="sql-copy" />
              <button
                type="button"
                data-testid="sql-use"
                onClick={() => {
                  setSql(result.out)
                  setResult(null)
                }}
                className={BUTTON}
              >
                Use as input
              </button>
            </div>
          </div>
          <pre data-testid="sql-out" className="overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-zinc-200">
            {result.out}
          </pre>
        </section>
      )}
    </ToolShell>
  )
}
