// The text diff checker page (/tools/text-diff): two plain-text inputs compared line by line with
// changed words highlighted, ignore-case/whitespace/blank-line options and word/character counts.

import { useMemo, useState } from 'react'
import { diffStats } from './diffLines.js'
import { textDiff, textStats, toPatch, withWordDiffs } from './textDiffTool.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'text-diff')
// Keeps the live diff instant; beyond this (per side) the page asks for less.
export const MAX_TEXT_CHARS = 150_000

const TEXT = 'whitespace-pre-wrap break-words text-[16px] leading-relaxed sm:text-sm'
const ROW_BG = { del: 'bg-red-950/40', add: 'bg-emerald-950/40', same: '' }
const ROW_TEXT = { del: 'text-red-200', add: 'text-emerald-200', same: 'text-zinc-300' }
const MARK_BG = { del: 'bg-red-700/60', add: 'bg-emerald-700/60' }
const OPTIONS = [
  ['ignoreCase', 'Ignore case'],
  ['ignoreWhitespace', 'Ignore whitespace'],
  ['ignoreBlankLines', 'Ignore blank lines'],
]

function Pane({ id, label, value, onChange }) {
  const { words, chars } = textStats(value)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="flex justify-between text-xs font-medium text-zinc-400">
        {label}
        <span data-testid={`${id}-count`} className="tabular-nums text-zinc-500">
          {words} words · {chars} chars
        </span>
      </label>
      <textarea
        id={id}
        data-testid={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder="Paste text here…"
        className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none ${TEXT}`}
      />
    </div>
  )
}

function Line({ row }) {
  return (
    <div className={`flex ${ROW_BG[row.kind]}`}>
      <span aria-hidden className="w-12 shrink-0 select-none px-1 text-right font-mono text-xs leading-relaxed text-zinc-600">
        {row.old ?? row.new}
      </span>
      <span aria-label={row.kind === 'add' ? 'added' : row.kind === 'del' ? 'removed' : undefined} className="w-4 shrink-0 select-none font-mono text-xs leading-relaxed text-zinc-500">
        {row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : ''}
      </span>
      <span className={`min-w-0 flex-1 px-1 ${TEXT} ${ROW_TEXT[row.kind]}`}>
        {row.segs
          ? row.segs.map((s, i) =>
              s.changed ? (
                <mark key={i} data-testid="text-diff-word" className={`rounded-sm text-inherit ${MARK_BG[row.kind]}`}>
                  {s.text}
                </mark>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )
          : row.text || ' '}
      </span>
    </div>
  )
}

export default function TextDiffPage() {
  const [oldText, setOldText] = useState('')
  const [newText, setNewText] = useState('')
  const [opts, setOpts] = useState({ ignoreCase: false, ignoreWhitespace: false, ignoreBlankLines: false })
  const [onlyChanges, setOnlyChanges] = useState(false)

  const tooLong = oldText.length > MAX_TEXT_CHARS || newText.length > MAX_TEXT_CHARS
  const empty = !oldText && !newText
  const rows = useMemo(() => (empty || tooLong ? [] : withWordDiffs(textDiff(oldText, newText, opts))), [oldText, newText, opts, empty, tooLong])
  const { added, removed } = diffStats(rows)
  const same = !empty && !tooLong && added === 0 && removed === 0
  const shown = onlyChanges ? rows.filter((r) => r.kind !== 'same') : rows

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Pane id="text-diff-old" label="Original text" value={oldText} onChange={setOldText} />
        <Pane id="text-diff-new" label="Changed text" value={newText} onChange={setNewText} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {OPTIONS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" data-testid={`text-diff-${key}`} checked={opts[key]} onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))} className="h-4 w-4 accent-sky-500" />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" data-testid="text-diff-only-changes" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Only show changes
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="text-diff-swap"
          onClick={() => {
            setOldText(newText)
            setNewText(oldText)
          }}
          className={BUTTON}
        >
          Swap sides
        </button>
        {rows.length > 0 && !same && <CopyButton text={toPatch(rows)} label="Copy as patch" testid="text-diff-copy" />}
        {rows.length > 0 && (
          <p data-testid="text-diff-stats" role="status" className="ml-auto text-xs tabular-nums">
            <span className="text-emerald-400">+{added}</span> <span className="text-red-400">−{removed}</span> <span className="text-zinc-500">lines</span>
          </p>
        )}
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's too much to compare at once: keep each side under {MAX_TEXT_CHARS.toLocaleString()} characters.
        </p>
      )}
      {same && (
        <p data-testid="text-diff-same" className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400">
          No differences{opts.ignoreCase || opts.ignoreWhitespace || opts.ignoreBlankLines ? ' with the selected options' : ''} — the texts match.
        </p>
      )}
      {!empty && !tooLong && !same && (
        <section aria-label="Differences" data-testid="text-diff-result" className="rounded-lg border border-zinc-800 py-1">
          {shown.map((row, i) => (
            <Line key={i} row={row} />
          ))}
        </section>
      )}
    </ToolShell>
  )
}
