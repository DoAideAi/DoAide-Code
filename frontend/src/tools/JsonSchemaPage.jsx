// The JSON Schema generator page (/tools/json-schema-generator): JSON on the left, the inferred
// schema on the right, with toggles for formats and required keys.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_SCHEMA_INPUT, generateSchema } from './jsonSchemaTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'json-schema-generator')

const SAMPLE = `{
  "id": 42,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "joined": "2026-01-15T09:30:00Z",
  "active": true,
  "tags": ["admin", "founder"],
  "address": { "city": "Pune", "pin": "411001" }
}`

const CHECK = 'h-4 w-4 accent-sky-500'

export default function JsonSchemaPage() {
  const [text, setText] = useState(SAMPLE)
  const [formats, setFormats] = useState(true)
  const [required, setRequired] = useState(true)

  const result = useMemo(() => {
    if (!text.trim()) return { error: null, schema: null }
    try {
      return { error: null, schema: JSON.stringify(generateSchema(text, { formats, required }), null, 2) }
    } catch (e) {
      return { error: e.message, schema: null }
    }
  }, [text, formats, required])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="schema-input" className="text-sm font-medium text-zinc-200">
              JSON
            </label>
            <button type="button" data-testid="schema-clear" className={BUTTON} onClick={() => setText('')}>
              Clear
            </button>
          </div>
          <textarea
            id="schema-input"
            data-testid="schema-input"
            value={text}
            maxLength={MAX_SCHEMA_INPUT}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"paste": "your JSON here"}'
            spellCheck={false}
            className="min-h-[320px] w-full flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" data-testid="schema-formats" className={CHECK} checked={formats} onChange={(e) => setFormats(e.target.checked)} />
              Detect string formats
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" data-testid="schema-required" className={CHECK} checked={required} onChange={(e) => setRequired(e.target.checked)} />
              Mark keys required
            </label>
          </div>
          <p className="text-xs text-zinc-500">
            The schema is inferred from the sample you paste: every key present becomes required, array items are merged across elements, and
            date/email/URL strings get a <code className="text-zinc-400">format</code>. Nothing is uploaded.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">JSON Schema (draft 2020-12)</h2>
            {result.schema && <CopyButton text={result.schema} label="Copy schema" testid="schema-copy" />}
          </div>
          {result.error ? (
            <p role="alert" data-testid="schema-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {result.error}
            </p>
          ) : (
            <pre
              data-testid="schema-output"
              className="min-h-[320px] flex-1 overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200"
            >
              {result.schema ?? ''}
            </pre>
          )}
        </div>
      </div>
    </ToolShell>
  )
}
