// The markdown table generator page (/tools/markdown-table): edit cells in a spreadsheet-like
// grid, set column alignment, paste CSV/TSV/markdown to import, copy the markdown.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { ALIGNS, DEFAULT_TABLE, MAX_COLS, MAX_ROWS, parseTable, toMarkdown } from './markdownTableTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'markdown-table')

const CELL = 'min-h-[40px] w-full min-w-[110px] rounded border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200'
const ALIGN_ICONS = { none: '—', left: '⇤', center: '↔', right: '⇥' }

function cloneTable(t) {
  return { header: [...t.header], rows: t.rows.map((r) => [...r]), aligns: [...t.aligns] }
}

export default function MarkdownTablePage() {
  const [table, setTable] = useState(() => cloneTable(DEFAULT_TABLE))
  const [compact, setCompact] = useState(false)
  const [paste, setPaste] = useState('')
  const [importError, setImportError] = useState('')
  const md = toMarkdown(table, { compact })
  const cols = table.header.length

  const setCell = (r, c, value) =>
    setTable((t) => (r < 0 ? { ...t, header: t.header.map((h, i) => (i === c ? value : h)) } : { ...t, rows: t.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? value : x)) : row)) }))
  const addCol = () => setTable((t) => ({ header: [...t.header, `Column ${t.header.length + 1}`], rows: t.rows.map((r) => [...r, '']), aligns: [...t.aligns, 'none'] }))
  const removeCol = (c) => setTable((t) => ({ header: t.header.filter((_, i) => i !== c), rows: t.rows.map((r) => r.filter((_, i) => i !== c)), aligns: t.aligns.filter((_, i) => i !== c) }))
  const addRow = () => setTable((t) => ({ ...t, rows: [...t.rows, Array(t.header.length).fill('')] }))
  const removeRow = (r) => setTable((t) => ({ ...t, rows: t.rows.filter((_, i) => i !== r) }))
  const cycleAlign = (c) => setTable((t) => ({ ...t, aligns: t.aligns.map((a, i) => (i === c ? ALIGNS[(ALIGNS.indexOf(a) + 1) % ALIGNS.length] : a)) }))
  const doImport = () => {
    const parsed = parseTable(paste)
    if (!parsed) return setImportError('Paste some CSV, tab-separated or markdown table rows first.')
    setImportError('')
    setTable(parsed)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="overflow-x-auto rounded-lg border border-zinc-800 p-2">
        <table className="border-separate border-spacing-1" data-testid="mdtable-grid">
          <thead>
            <tr>
              {table.header.map((h, c) => (
                <th key={c} className="align-bottom">
                  <div className="mb-1 flex gap-1">
                    <button type="button" data-testid={`mdtable-align-${c}`} className={`${BUTTON} flex-1`} title={`Alignment: ${table.aligns[c]}`} onClick={() => cycleAlign(c)}>
                      {ALIGN_ICONS[table.aligns[c]]} {table.aligns[c]}
                    </button>
                    {cols > 1 && (
                      <button type="button" aria-label={`Remove column ${c + 1}`} data-testid={`mdtable-remove-col-${c}`} className={BUTTON} onClick={() => removeCol(c)}>
                        ×
                      </button>
                    )}
                  </div>
                  <input aria-label={`Header ${c + 1}`} data-testid={`mdtable-cell--1-${c}`} value={h} onChange={(e) => setCell(-1, c, e.target.value)} className={`${CELL} font-semibold`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <input aria-label={`Row ${r + 1} column ${c + 1}`} data-testid={`mdtable-cell-${r}-${c}`} value={cell} onChange={(e) => setCell(r, c, e.target.value)} className={CELL} />
                  </td>
                ))}
                <td>
                  <button type="button" aria-label={`Remove row ${r + 1}`} data-testid={`mdtable-remove-row-${r}`} className={BUTTON} onClick={() => removeRow(r)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" data-testid="mdtable-add-row" className={BUTTON} disabled={table.rows.length >= MAX_ROWS} onClick={addRow}>
          + Row
        </button>
        <button type="button" data-testid="mdtable-add-col" className={BUTTON} disabled={cols >= MAX_COLS} onClick={addCol}>
          + Column
        </button>
        <button type="button" data-testid="mdtable-clear" className={BUTTON} onClick={() => setTable((t) => ({ ...t, rows: t.rows.map((r) => r.map(() => '')) }))}>
          Clear cells
        </button>
        <label className="ml-2 flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" data-testid="mdtable-compact" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Compact (no padding)
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-200">Markdown</h2>
        <CopyButton text={md} label="Copy markdown" testid="mdtable-copy" />
      </div>
      <pre data-testid="mdtable-output" className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
        {md}
      </pre>

      <details className="rounded-lg border border-zinc-800 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-300">Import from CSV, spreadsheet or markdown</summary>
        <div className="flex flex-col gap-2 pt-3">
          <textarea
            aria-label="Table to import"
            data-testid="mdtable-paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'name,role\nAda,Engineer'}
            rows={5}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-sm text-zinc-200"
          />
          <div className="flex items-center gap-3">
            <button type="button" data-testid="mdtable-import" className={BUTTON} onClick={doImport}>
              Import
            </button>
            {importError && (
              <span role="alert" className="text-xs text-rose-300">
                {importError}
              </span>
            )}
          </div>
        </div>
      </details>
    </ToolShell>
  )
}
