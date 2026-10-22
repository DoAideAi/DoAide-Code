// The history strip under the AI tools editor: step between the session's code versions and see
// a unified diff of what changed since the last snapshot. Versions are recorded by the page
// (on each run and restore); this renders and navigates them.

import { useMemo, useState } from 'react'
import { diffLines, diffStats } from './diffLines.js'
import { canRedo, canUndo, current, diffBase, redo, undo, versionLabel } from './editHistory.js'
import { BUTTON } from './ToolShell.jsx'

const ROW_STYLE = {
  same: 'text-zinc-400',
  del: 'bg-red-950/40 text-red-300',
  add: 'bg-emerald-950/40 text-emerald-300',
}
const MARK = { same: ' ', del: '-', add: '+' }

export default function EditHistory({ history, code, onNavigate }) {
  const [showDiff, setShowDiff] = useState(false)

  const base = diffBase(history, code)
  const rows = useMemo(() => (showDiff && base ? diffLines(base.code, code) : []), [showDiff, base, code])
  const { added, removed } = useMemo(() => diffStats(rows), [rows])
  const changed = rows.some((r) => r.kind !== 'same')

  const step = (move) => {
    // Unsaved edits become a version first, so stepping away never loses them.
    let h = history
    if (current(h).code !== code) {
      h = { versions: [...h.versions.slice(0, h.index + 1), { code, at: Date.now() }], index: h.index + 1 }
    }
    const next = move(h)
    onNavigate(next, current(next).code)
  }

  if (history.versions.length < 2 && current(history).code === code) return null

  return (
    <div className="flex flex-col gap-2" data-testid="edit-history">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">
          Version {history.index + 1} of {history.versions.length}
          {history.versions.length > 1 && ` · last saved ${versionLabel(current(history).at)}`}
        </span>
        <button type="button" data-testid="hist-undo" onClick={() => step(undo)} disabled={!canUndo(history)} className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}>
          ← Previous version
        </button>
        <button type="button" data-testid="hist-redo" onClick={() => step(redo)} disabled={!canRedo(history)} className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}>
          Next version →
        </button>
        {base && (
          <button type="button" data-testid="hist-diff" aria-expanded={showDiff} onClick={() => setShowDiff((s) => !s)} className={BUTTON}>
            {showDiff ? 'Hide changes' : 'View changes'}
          </button>
        )}
      </div>
      {showDiff && base && (
        <section aria-label="Changes since the previous version" data-testid="hist-diff-panel" className="overflow-x-auto rounded-lg border border-zinc-800">
          <p className="border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
            {changed ? (
              <>
                vs the version from {versionLabel(base.at)}: <span className="text-emerald-300">+{added}</span>{' '}
                <span className="text-red-300">−{removed}</span>
              </>
            ) : (
              'No changes since the previous version.'
            )}
          </p>
          {changed && (
            <pre className="max-h-72 overflow-auto p-2 font-mono text-[12px] leading-relaxed">
              {rows.map((row, i) => (
                <div key={i} className={`px-1 ${ROW_STYLE[row.kind]}`}>
                  {MARK[row.kind]} {row.text}
                </div>
              ))}
            </pre>
          )}
        </section>
      )}
    </div>
  )
}
