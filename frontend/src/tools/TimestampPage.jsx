// The timestamp converter (/tools/timestamp-converter): paste unix seconds/milliseconds, ISO 8601
// or RFC 2822 and get every representation back, plus the moment in any IANA timezone.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { formatAll, inTimezone, localTimezone, parseTimestamp, relativeTo, timezones } from './timestampTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'timestamp-converter')

function Row({ label, value, testid }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 py-2 last:border-b-0">
      <span className="w-40 shrink-0 text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <code data-testid={testid} className="min-w-0 flex-1 break-all font-mono text-[13px] text-zinc-200">
        {value}
      </code>
      <CopyButton text={value} testid={`${testid}-copy`} />
    </div>
  )
}

export default function TimestampPage() {
  const [input, setInput] = useState('')
  const [zone, setZone] = useState(localTimezone())
  const zones = useMemo(() => {
    const list = timezones()
    const local = localTimezone()
    return list.includes(local) ? list : [local, ...list]
  }, [])

  const parsed = input.trim() ? parseTimestamp(input) : null
  const all = parsed && !parsed.error ? formatAll(parsed.ms) : null

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="ts-input" className="text-sm font-medium text-zinc-200">
            Timestamp or date
          </label>
          <button type="button" data-testid="ts-now" className={`${BUTTON} ml-auto`} onClick={() => setInput(String(Date.now()))}>
            Now
          </button>
        </div>
        <input
          id="ts-input"
          data-testid="ts-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1700000000, 2026-10-23T07:00:00Z or Thu, 23 Oct 2026 07:00:00 +0000"
          spellCheck={false}
          className="min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <p className="text-xs text-zinc-500">
          Bare numbers are read as unix seconds (milliseconds when 12+ digits). Nothing leaves this page.
        </p>
      </div>

      {parsed?.error && (
        <p role="alert" data-testid="ts-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {parsed.error}
        </p>
      )}

      {all && (
        <div className="flex flex-col rounded-lg border border-zinc-800 p-4">
          <p data-testid="ts-kind" className="pb-2 text-xs text-zinc-500">
            Read as {parsed.kind} — {relativeTo(parsed.ms)}.
          </p>
          <Row label="Unix seconds" value={all.unixSeconds} testid="ts-unix-s" />
          <Row label="Unix milliseconds" value={all.unixMs} testid="ts-unix-ms" />
          <Row label="ISO 8601 (UTC)" value={all.iso} testid="ts-iso" />
          <Row label="RFC 2822 (UTC)" value={all.rfc2822} testid="ts-rfc" />
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <label htmlFor="ts-zone" className="w-40 shrink-0 text-xs uppercase tracking-wide text-zinc-500">
              In timezone
            </label>
            <select
              id="ts-zone"
              data-testid="ts-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="min-h-[44px] min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <code data-testid="ts-zoned" className="min-w-0 flex-1 break-all font-mono text-[13px] text-zinc-200">
              {inTimezone(parsed.ms, zone)}
            </code>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
