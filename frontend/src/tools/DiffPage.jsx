// The diff checker (/tools/diff-checker): paste two versions, see the changes live, side by side
// or unified. Everything happens in the page; nothing is uploaded.

import { useMemo, useState } from 'react'
import { diffLines, diffStats, splitRows } from './diffLines.js'
import ToolShell, { BUTTON } from './ToolShell.jsx'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'diff-checker')
// Keeps the live diff instant; beyond this (per side) the page asks for less.
export const MAX_DIFF_CHARS = 150_000

const MONO = 'whitespace-pre font-mono text-[16px] leading-relaxed sm:text-[13px]'
const CELL_BG = { del: 'bg-red-950/40', add: 'bg-emerald-950/40', same: '' }
const MARK = { del: '-', add: '+', same: ' ' }

function Pane({ id, label, value, onChange }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-zinc-400">
        {label}
      </label>
      <textarea
        id={id}
        data-testid={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={10}
        wrap="off"
        placeholder="Paste code here…"
        className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none ${MONO}`}
      />
    </div>
  )
}

// One side of a split row: line number plus text (or an empty filler cell).
function SplitCell({ cell }) {
  if (!cell) return <div className="min-w-0 border-l border-zinc-800/60" />
  return (
    <div className={`flex min-w-0 border-l border-zinc-800/60 ${CELL_BG[cell.kind]}`}>
      <span aria-hidden className={`w-10 shrink-0 select-none px-1 text-right text-zinc-600 ${MONO}`}>
        {cell.old ?? cell.new}
      </span>
      <span className={`${MONO} px-2 ${cell.kind === 'del' ? 'text-red-200' : cell.kind === 'add' ? 'text-emerald-200' : 'text-zinc-300'}`}>
        {cell.text || ' '}
      </span>
    </div>
  )
}

export default function DiffPage() {
  const [oldText, setOldText] = useState('')
  const [newText, setNewText] = useState('')
  const [view, setView] = useState('split')

  const tooLong = oldText.length > MAX_DIFF_CHARS || newText.length > MAX_DIFF_CHARS
  const empty = !oldText && !newText
  const rows = useMemo(() => (empty || tooLong ? [] : diffLines(oldText, newText)), [oldText, newText, empty, tooLong])
  const { added, removed } = useMemo(() => diffStats(rows), [rows])
  const pairs = useMemo(() => (view === 'split' ? splitRows(rows) : []), [rows, view])
  const unchanged = !empty && !tooLong && added === 0 && removed === 0

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Pane id="diff-old" label="Original" value={oldText} onChange={setOldText} />
        <Pane id="diff-new" label="Changed" value={newText} onChange={setNewText} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="diff-swap"
          onClick={() => {
            setOldText(newText)
            setNewText(oldText)
          }}
          className={BUTTON}
        >
          Swap sides
        </button>
        <button
          type="button"
          data-testid="diff-view"
          aria-pressed={view === 'unified'}
          onClick={() => setView((v) => (v === 'split' ? 'unified' : 'split'))}
          className={BUTTON}
        >
          {view === 'split' ? 'Unified view' : 'Side-by-side view'}
        </button>
        {rows.length > 0 && (
          <p data-testid="diff-stats" role="status" className="ml-auto text-xs tabular-nums">
            <span className="text-emerald-400">+{added}</span> <span className="text-red-400">−{removed}</span>{' '}
            <span className="text-zinc-500">lines</span>
          </p>
        )}
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's too much to compare at once: keep each side under {MAX_DIFF_CHARS.toLocaleString()} characters.
        </p>
      )}
      {unchanged && (
        <p data-testid="diff-same" className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400">
          The two sides are identical.
        </p>
      )}
      {!empty && !tooLong && !unchanged && (
        <section aria-label="Differences" className="overflow-x-auto rounded-lg border border-zinc-800">
          {view === 'split' ? (
            <div data-testid="diff-split" className="grid min-w-max grid-cols-2">
              {pairs.map((pair, i) => (
                // A fragment per visual row; the grid keeps the two sides aligned.
                <div key={i} className="contents">
                  <SplitCell cell={pair.left} />
                  <SplitCell cell={pair.right} />
                </div>
              ))}
            </div>
          ) : (
            <div data-testid="diff-unified" className="min-w-max">
              {rows.map((row, i) => (
                <div key={i} className={`flex ${CELL_BG[row.kind]}`}>
                  <span aria-hidden className={`w-10 shrink-0 select-none px-1 text-right text-zinc-600 ${MONO}`}>
                    {row.old ?? ''}
                  </span>
                  <span aria-hidden className={`w-10 shrink-0 select-none px-1 text-right text-zinc-600 ${MONO}`}>
                    {row.new ?? ''}
                  </span>
                  <span
                    className={`${MONO} px-2 ${row.kind === 'del' ? 'text-red-200' : row.kind === 'add' ? 'text-emerald-200' : 'text-zinc-300'}`}
                  >
                    {MARK[row.kind]} {row.text || ' '}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </ToolShell>
  )
}
