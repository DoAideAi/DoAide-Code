// The SQL to MongoDB converter page (/tools/sql-to-mongodb): type a SQL query and get the
// equivalent mongosh command — find, countDocuments, distinct, aggregate or a write. Runs locally.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { convertSql } from './sqlMongoTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'sql-to-mongodb')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

const EXAMPLES = [
  ['Filter & sort', "SELECT name, email FROM users\nWHERE age >= 18 AND status = 'active'\nORDER BY created_at DESC\nLIMIT 20"],
  ['LIKE & IN', "SELECT * FROM products\nWHERE name LIKE '%phone%' AND category IN ('mobile', 'tablet')"],
  ['Group by', "SELECT country, COUNT(*) AS users, AVG(age) AS avg_age\nFROM users\nGROUP BY country\nHAVING COUNT(*) > 10\nORDER BY users DESC"],
  ['Count', "SELECT COUNT(*) FROM orders WHERE status = 'paid'"],
  ['Insert', "INSERT INTO users (name, email, age)\nVALUES ('Asha', 'asha@example.com', 29), ('Ravi', 'ravi@example.com', 34)"],
  ['Update', "UPDATE users SET plan = 'pro', logins = logins + 1 WHERE id = 42"],
  ['Delete', 'DELETE FROM sessions WHERE expires_at < 1700000000'],
]

export default function SqlMongoPage() {
  const [sql, setSql] = useState(EXAMPLES[0][1])
  const result = convertSql(sql)

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap gap-1">
        {EXAMPLES.map(([label, q]) => (
          <button key={label} type="button" className={`${BUTTON} ${sql === q ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => setSql(q)}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          SQL
          <textarea
            data-testid="sql-in"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={12}
            spellCheck={false}
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 ${MONO}`}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-1 text-sm text-zinc-300">
          <div className="flex items-center justify-between">
            <span>MongoDB (mongosh)</span>
            {result.code && <CopyButton text={result.code} label="Copy" testid="sql-copy" />}
          </div>
          {result.error ? (
            <p role="alert" data-testid="sql-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {result.error}
            </p>
          ) : (
            <pre data-testid="sql-out" className={`min-h-[200px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-emerald-200 ${MONO}`}>
              {result.code}
            </pre>
          )}
          {result.notes?.map((n) => (
            <p key={n} className="text-xs text-amber-200">
              {n}
            </p>
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Supports SELECT with WHERE (=, &lt;&gt;, &lt;, &gt;, AND, OR, NOT, IN, BETWEEN, LIKE, IS NULL), ORDER BY, LIMIT/OFFSET, DISTINCT,
        COUNT/SUM/AVG/MIN/MAX with GROUP BY and HAVING, plus INSERT, UPDATE and DELETE. Joins and subqueries are flagged, not guessed.
      </p>
    </ToolShell>
  )
}
