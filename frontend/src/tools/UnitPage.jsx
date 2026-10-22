// The developer unit converter (/tools/unit-converter): px/rem/em, bytes, unix timestamps and
// color formats, each in its own card, converted as you type. Runs in the page.

import { useState } from 'react'
import { relTime } from './jwtTool.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { BYTE_UNITS, byteRows, colorFormats, parseTime, pxConvert, toBytes } from './unitTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'unit-converter')

const CARD = 'flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 p-4'
const INPUT =
  'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-3 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:min-h-[36px]'
const SELECT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'

function Row({ label, value, mono = true }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-16 shrink-0 text-xs text-zinc-500">{label}</span>
      <span className={`break-all text-sm text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function PxCard() {
  const [value, setValue] = useState('24')
  const [unit, setUnit] = useState('px')
  const [base, setBase] = useState('16')
  const out = pxConvert(Number(value), unit, Number(base))
  return (
    <section aria-label="px / rem / em" className={CARD}>
      <h2 className="text-sm font-medium text-zinc-200">px ⇄ rem ⇄ em</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input data-testid="px-value" type="number" value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT} w-28`} aria-label="Value" />
        <select data-testid="px-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={SELECT} aria-label="Unit">
          <option value="px">px</option>
          <option value="rem">rem</option>
          <option value="em">em</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          root font size
          <input data-testid="px-base" type="number" value={base} onChange={(e) => setBase(e.target.value)} className={`${INPUT} w-20`} />
          px
        </label>
      </div>
      {out ? (
        <div data-testid="px-out" className="flex flex-col gap-1">
          <Row label="px" value={`${out.px}px`} />
          <Row label="rem" value={`${out.rem}rem`} />
          <Row label="em" value={`${out.em}em`} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Enter a number (and a root font size above 0).</p>
      )}
    </section>
  )
}

function BytesCard() {
  const [value, setValue] = useState('1')
  const [unit, setUnit] = useState('MiB')
  const bytes = toBytes(Number(value), unit)
  return (
    <section aria-label="Bytes" className={CARD}>
      <h2 className="text-sm font-medium text-zinc-200">Bytes — decimal (KB) and binary (KiB)</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input data-testid="bytes-value" type="number" value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT} w-32`} aria-label="Size" />
        <select data-testid="bytes-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={SELECT} aria-label="Size unit">
          {BYTE_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      {bytes !== null ? (
        <div data-testid="bytes-out" className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {byteRows(bytes).map((r) => (
            <Row key={r.unit} label={r.unit} value={r.value} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Enter a number.</p>
      )}
    </section>
  )
}

function TimeCard() {
  const [input, setInput] = useState('now')
  const [tick, setTick] = useState(0) // bumping it re-reads the clock for 'now'
  const res = parseTime(input)
  void tick
  return (
    <section aria-label="Timestamps" className={CARD}>
      <h2 className="text-sm font-medium text-zinc-200">Unix timestamp ⇄ date</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          data-testid="time-in"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="now, 1700000000, or 2026-01-01T00:00:00Z"
          spellCheck={false}
          className={`${INPUT} min-w-0 flex-1`}
          aria-label="Timestamp"
        />
        <button
          type="button"
          onClick={() => {
            setInput('now')
            setTick(Date.now())
          }}
          className={BUTTON}
        >
          Now
        </button>
      </div>
      {res.error ? (
        <p role="alert" className="text-sm text-red-300">
          {res.error}
        </p>
      ) : (
        <div data-testid="time-out" className="flex flex-col gap-1">
          <Row label="ISO" value={new Date(res.ms).toISOString()} />
          <Row label="local" value={new Date(res.ms).toLocaleString()} />
          <Row label="unix s" value={String(Math.floor(res.ms / 1000))} />
          <Row label="unix ms" value={String(res.ms)} />
          <Row label="relative" value={relTime(res.ms)} mono={false} />
        </div>
      )}
      <div className="flex gap-2">
        <CopyButton text={res.error ? '' : String(Math.floor(res.ms / 1000))} label="Copy unix s" testid="time-copy" />
        <CopyButton text={res.error ? '' : new Date(res.ms).toISOString()} label="Copy ISO" testid="time-copy-iso" />
      </div>
    </section>
  )
}

function ColorCard() {
  const [input, setInput] = useState('#22c55e')
  const out = colorFormats(input)
  return (
    <section aria-label="Color formats" className={CARD}>
      <h2 className="text-sm font-medium text-zinc-200">Color — hex ⇄ rgb ⇄ hsl</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          data-testid="color-in"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="#22c55e, rgb(34, 197, 94) or hsl(142, 71%, 45%)"
          spellCheck={false}
          className={`${INPUT} min-w-0 flex-1`}
          aria-label="Color"
        />
        <span
          data-testid="color-swatch"
          aria-hidden="true"
          className="h-9 w-12 rounded-md border border-zinc-700"
          style={{ background: out.error ? 'transparent' : out.hex }}
        />
      </div>
      {out.error ? (
        <p role="alert" className="text-sm text-red-300">
          {out.error}
        </p>
      ) : (
        <div data-testid="color-out" className="flex flex-col gap-1">
          <Row label="hex" value={out.hex} />
          <Row label="rgb" value={out.rgb} />
          <Row label="hsl" value={out.hsl} />
        </div>
      )}
    </section>
  )
}

export default function UnitPage() {
  return (
    <ToolShell tool={TOOL}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PxCard />
        <BytesCard />
        <TimeCard />
        <ColorCard />
      </div>
      <p className="text-xs text-zinc-500">Everything converts in this page as you type — nothing is uploaded.</p>
    </ToolShell>
  )
}
