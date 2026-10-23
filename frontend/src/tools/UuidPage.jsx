// The UUID generator page (/tools/uuid-generator): pick a version and how many, format them, copy
// or download the list; plus a decoder that reads the version and timestamp out of any UUID.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_BULK, VERSIONS, formatUuid, generate, inspect } from './uuidTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'uuid-generator')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const FORMAT_OPTIONS = [
  ['uppercase', 'Uppercase'],
  ['hyphens', 'Hyphens'],
  ['braces', '{Braces}'],
  ['quotes', '"Quotes"'],
]

function download(text) {
  const url = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'uuids.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export default function UuidPage() {
  const [version, setVersion] = useState('v4')
  const [count, setCount] = useState(5)
  const [fmt, setFmt] = useState({ uppercase: false, hyphens: true, braces: false, quotes: false })
  const [ids, setIds] = useState(() => generate('v4', 5))
  const [probe, setProbe] = useState('')
  const output = ids.map((id) => formatUuid(id, fmt)).join(fmt.quotes ? ',\n' : '\n')
  const info = probe.trim() ? inspect(probe) : null

  const regenerate = (v = version, n = count) => setIds(generate(v, n))

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="UUID version" className="flex flex-wrap gap-1">
          {Object.entries(VERSIONS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={version === key}
              data-testid={`uuid-version-${key}`}
              onClick={() => {
                setVersion(key)
                regenerate(key)
              }}
              className={`${BUTTON} ${version === key ? 'bg-zinc-800 text-zinc-100' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          How many
          <input
            type="number"
            data-testid="uuid-count"
            min={1}
            max={MAX_BULK}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(MAX_BULK, Number(e.target.value) || 1)))}
            className={`${INPUT} w-24`}
          />
        </label>
        <button type="button" data-testid="uuid-generate" className={`${BUTTON} bg-sky-700/40 text-zinc-100`} onClick={() => regenerate()}>
          Generate
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {FORMAT_OPTIONS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" data-testid={`uuid-${key}`} checked={fmt[key]} onChange={(e) => setFmt((f) => ({ ...f, [key]: e.target.checked }))} className="h-4 w-4 accent-sky-500" />
            {label}
          </label>
        ))}
        <div className="ml-auto flex gap-1">
          <CopyButton text={output} label={ids.length > 1 ? `Copy ${ids.length}` : 'Copy'} testid="uuid-copy" />
          <button type="button" data-testid="uuid-download" className={BUTTON} onClick={() => download(output)}>
            Download .txt
          </button>
        </div>
      </div>
      <pre data-testid="uuid-output" className="max-h-[420px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
        {output}
      </pre>

      <section aria-label="UUID decoder" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Decode a UUID</h2>
        <input aria-label="UUID to decode" data-testid="uuid-probe" value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="Paste any UUID…" className={INPUT} />
        {probe.trim() &&
          (info ? (
            <dl data-testid="uuid-info" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-zinc-500">Canonical</dt>
              <dd className="break-all font-mono text-zinc-200">{info.canonical}</dd>
              <dt className="text-zinc-500">Version</dt>
              <dd className="text-zinc-200">{info.version ?? '—'}</dd>
              <dt className="text-zinc-500">Variant</dt>
              <dd className="text-zinc-200">{info.variant}</dd>
              {info.time && (
                <>
                  <dt className="text-zinc-500">Created</dt>
                  <dd data-testid="uuid-time" className="font-mono text-zinc-200">
                    {info.time.toISOString()}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p role="alert" className="text-sm text-rose-300">
              Not a valid UUID — expected 32 hex digits, optionally as 8-4-4-4-12.
            </p>
          ))}
      </section>
    </ToolShell>
  )
}
