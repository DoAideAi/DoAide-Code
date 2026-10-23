// The CSV converter page (/tools/csv-to-json): paste or drop a CSV and get JSON, keyed JSON or
// SQL INSERTs — or flip the direction and turn a JSON array into CSV. Runs in the page.

import { useMemo, useRef, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DELIMITERS, detectDelimiter, jsonToCsv, parseCsv, table, toJson, toKeyedJson, toSql } from './csvTool.js'
import { downloadText } from '../export.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'csv-to-json')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'
const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'

const SAMPLE = `id,name,email,age,active
1,Asha Rao,asha@example.com,29,true
2,"Lee, Jordan",jordan@example.com,41,false
3,Priya Nair,priya@example.com,,true
`

const FORMATS = [
  ['json', 'JSON array'],
  ['keyed', 'JSON by key'],
  ['sql', 'SQL INSERT'],
]

export default function CsvPage() {
  const [text, setText] = useState(SAMPLE)
  const [reverse, setReverse] = useState(false) // JSON → CSV
  const [delim, setDelim] = useState('auto')
  const [header, setHeader] = useState(true)
  const [infer, setInfer] = useState(true)
  const [format, setFormat] = useState('json')
  const [key, setKey] = useState('')
  const [tableName, setTableName] = useState('my_table')
  const [create, setCreate] = useState(true)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const delimiter = delim === 'auto' ? detectDelimiter(text) : delim
  const parsed = useMemo(() => (reverse ? null : table(parseCsv(text, delimiter), { header, infer })), [text, delimiter, header, infer, reverse])

  let output = ''
  let error = null
  if (reverse) {
    try {
      output = text.trim() ? jsonToCsv(text, delim === 'auto' ? ',' : delim) : ''
    } catch (e) {
      error = e.message
    }
  } else if (parsed.headers.length) {
    if (format === 'json') output = toJson(parsed, { header })
    else if (format === 'keyed') output = toKeyedJson(parsed, key || parsed.headers[0])
    else output = toSql(parsed, { tableName, create })
  }
  const ext = reverse ? 'csv' : format === 'sql' ? 'sql' : 'json'

  const take = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result))
    reader.readAsText(file)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
        <div role="group" aria-label="Direction" className="flex gap-1">
          {[
            [false, 'CSV → JSON / SQL'],
            [true, 'JSON → CSV'],
          ].map(([r, label]) => (
            <button
              key={label}
              type="button"
              data-testid={r ? 'csv-dir-reverse' : 'csv-dir-forward'}
              aria-pressed={reverse === r}
              className={`${BUTTON} ${reverse === r ? 'bg-zinc-800 text-zinc-100' : ''}`}
              onClick={() => setReverse(r)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          Delimiter
          <select data-testid="csv-delim" value={delim} onChange={(e) => setDelim(e.target.value)} className={INPUT}>
            <option value="auto">Auto{!reverse ? ` (${DELIMITERS.find(([d]) => d === delimiter)?.[1].toLowerCase()})` : ''}</option>
            {DELIMITERS.map(([d, label]) => (
              <option key={label} value={d}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {!reverse && (
          <>
            <label className="flex items-center gap-2">
              <input type="checkbox" data-testid="csv-header" checked={header} onChange={(e) => setHeader(e.target.checked)} className="h-4 w-4 accent-sky-500" />
              First row is the header
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={infer} onChange={(e) => setInfer(e.target.checked)} className="h-4 w-4 accent-sky-500" />
              Detect numbers, booleans and nulls
            </label>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={`flex flex-col gap-1 rounded-lg ${dragging ? 'ring-2 ring-sky-500' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            take(e.dataTransfer.files?.[0])
          }}
        >
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <label htmlFor="csv-in">{reverse ? 'JSON array' : 'CSV or TSV'} — paste or drop a file</label>
            <button type="button" className={BUTTON} onClick={() => inputRef.current?.click()}>
              Open file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,text/csv,application/json"
              className="sr-only"
              aria-label="Open a file"
              onChange={(e) => take(e.target.files?.[0])}
            />
          </div>
          <textarea
            id="csv-in"
            data-testid="csv-in"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={20}
            spellCheck={false}
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 ${MONO}`}
          />
          {!reverse && (
            <p data-testid="csv-stats" className="text-xs text-zinc-500">
              {parsed.records.length} rows × {parsed.headers.length} columns
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          {!reverse && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              {FORMATS.map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  data-testid={`csv-format-${f}`}
                  aria-pressed={format === f}
                  className={`${BUTTON} ${format === f ? 'bg-zinc-800 text-zinc-100' : ''}`}
                  onClick={() => setFormat(f)}
                >
                  {label}
                </button>
              ))}
              {format === 'keyed' && (
                <label className="flex items-center gap-2">
                  Key column
                  <select value={key || parsed.headers[0] || ''} onChange={(e) => setKey(e.target.value)} className={INPUT}>
                    {parsed.headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              )}
              {format === 'sql' && (
                <>
                  <label className="flex items-center gap-2">
                    Table
                    <input data-testid="csv-table" value={tableName} onChange={(e) => setTableName(e.target.value)} className={`${INPUT} w-32 font-mono`} />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={create} onChange={(e) => setCreate(e.target.checked)} className="h-4 w-4 accent-sky-500" />
                    CREATE TABLE
                  </label>
                </>
              )}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>{reverse ? 'CSV' : FORMATS.find(([f]) => f === format)[1]}</span>
            <div className="flex gap-1">
              <CopyButton text={output} label="Copy" testid="csv-copy" />
              <button type="button" className={BUTTON} disabled={!output} onClick={() => downloadText(`data.${ext}`, output, ext === 'json' ? 'application/json' : ext === 'csv' ? 'text/csv' : 'text/plain')}>
                Download .{ext}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
              Invalid JSON: {error}
            </p>
          )}
          <pre data-testid="csv-out" className={`max-h-[34rem] min-h-[10rem] overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-emerald-200 ${MONO}`}>
            {output}
          </pre>
        </div>
      </div>
    </ToolShell>
  )
}
