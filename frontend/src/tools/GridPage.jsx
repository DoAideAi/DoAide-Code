// The CSS grid generator page (/tools/css-grid-generator): track sizes per column and row, gaps,
// a paintable cell map for named template areas, a live preview and the CSS + HTML to copy.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DEFAULT_GRID, MAX_TRACKS, MIN_TRACKS, TRACK_PRESETS, areaNames, cleanAreaName, gridCss, gridHtml, invalidAreas, isValidTrack, resizeAreas } from './gridTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'css-grid-generator')

const INPUT = 'min-h-[44px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const AREA_COLORS = ['bg-sky-700/80', 'bg-emerald-700/80', 'bg-amber-700/80', 'bg-rose-700/80', 'bg-violet-700/80', 'bg-teal-700/80', 'bg-orange-700/80', 'bg-indigo-700/80']

function cloneGrid(g) {
  return { ...g, columns: [...g.columns], rows: [...g.rows], areas: g.areas.map((r) => [...r]) }
}

function Tracks({ kind, tracks, onChange }) {
  const setCount = (n) => onChange(Array.from({ length: n }, (_, i) => tracks[i] ?? '1fr'))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-200">
          {kind === 'columns' ? 'Columns' : 'Rows'} <span className="text-zinc-500">({tracks.length})</span>
        </h2>
        <div className="flex gap-1">
          <button type="button" data-testid={`grid-${kind}-remove`} className={BUTTON} disabled={tracks.length <= MIN_TRACKS} onClick={() => setCount(tracks.length - 1)}>
            −
          </button>
          <button type="button" data-testid={`grid-${kind}-add`} className={BUTTON} disabled={tracks.length >= MAX_TRACKS} onClick={() => setCount(tracks.length + 1)}>
            +
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {tracks.map((t, i) => (
          <input
            key={i}
            list="grid-track-presets"
            aria-label={`${kind === 'columns' ? 'Column' : 'Row'} ${i + 1} size`}
            data-testid={`grid-${kind}-${i}`}
            value={t}
            onChange={(e) => onChange(tracks.map((x, j) => (j === i ? e.target.value : x)))}
            className={`${INPUT} ${isValidTrack(t) ? '' : 'border-rose-600'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function GridPage() {
  const [grid, setGrid] = useState(() => cloneGrid(DEFAULT_GRID))
  const [brush, setBrush] = useState('main')
  const names = areaNames(grid.areas)
  const bad = invalidAreas(grid.areas)
  const css = gridCss(grid)
  const html = gridHtml(grid)
  const safe = (tracks) => tracks.map((t) => (isValidTrack(t) ? t : '1fr')).join(' ')

  const setTracks = (kind, tracks) =>
    setGrid((g) => {
      const next = { ...g, [kind]: tracks }
      return { ...next, areas: resizeAreas(g.areas, next.rows.length, next.columns.length) }
    })
  const paint = (r, c) => {
    const name = cleanAreaName(brush)
    setGrid((g) => ({ ...g, areas: g.areas.map((row, i) => row.map((cell, j) => (i === r && j === c ? (cell === name ? '.' : name) : cell))) }))
  }

  return (
    <ToolShell tool={TOOL}>
      <datalist id="grid-track-presets">
        {TRACK_PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Tracks kind="columns" tracks={grid.columns} onChange={(t) => setTracks('columns', t)} />
          <Tracks kind="rows" tracks={grid.rows} onChange={(t) => setTracks('rows', t)} />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['columnGap', 'column-gap'],
              ['rowGap', 'row-gap'],
            ].map(([key, prop]) => (
              <label key={key} className="flex flex-col gap-1 text-sm text-zinc-300">
                <code className="text-xs text-zinc-500">
                  {prop}: {grid[key]}px
                </code>
                <input
                  type="range"
                  data-testid={`grid-${prop}`}
                  min={0}
                  max={64}
                  value={grid[key]}
                  onChange={(e) => setGrid((g) => ({ ...g, [key]: Number(e.target.value) }))}
                  className="mt-2 accent-sky-500"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium text-zinc-200">Template areas</h2>
            <p className="text-xs text-zinc-500">Type an area name, then click cells in the preview to paint them. Click a painted cell again to clear it.</p>
            <div className="flex flex-wrap items-center gap-1">
              <input aria-label="Area name" data-testid="grid-brush" value={brush} onChange={(e) => setBrush(e.target.value)} className={`${INPUT} max-w-[160px]`} />
              {names.map((n) => (
                <button key={n} type="button" className={BUTTON} onClick={() => setBrush(n)}>
                  {n}
                </button>
              ))}
              <button type="button" data-testid="grid-clear-areas" className={BUTTON} onClick={() => setGrid((g) => ({ ...g, areas: resizeAreas([], g.rows.length, g.columns.length) }))}>
                Clear areas
              </button>
              <button type="button" data-testid="grid-reset" className={BUTTON} onClick={() => setGrid(cloneGrid(DEFAULT_GRID))}>
                Reset
              </button>
            </div>
            {bad.length > 0 && (
              <p data-testid="grid-area-error" role="alert" className="text-xs text-rose-300">
                Each area must be one filled rectangle — fix: {bad.join(', ')}. Areas are left out of the CSS until then.
              </p>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div
            data-testid="grid-preview"
            className="min-h-[260px] rounded-lg border border-zinc-800 bg-zinc-950 p-3"
            style={{ display: 'grid', gridTemplateColumns: safe(grid.columns), gridTemplateRows: safe(grid.rows), columnGap: grid.columnGap, rowGap: grid.rowGap }}
          >
            {grid.areas.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  data-testid={`grid-cell-${r}-${c}`}
                  onClick={() => paint(r, c)}
                  className={`min-h-[44px] rounded-md border border-zinc-700 px-1 font-mono text-xs text-zinc-100 ${cell === '.' ? 'bg-zinc-900' : AREA_COLORS[names.indexOf(cell) % AREA_COLORS.length]}`}
                >
                  {cell}
                </button>
              )),
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">CSS</h2>
            <CopyButton text={css} label="Copy CSS" testid="grid-copy-css" />
          </div>
          <pre data-testid="grid-css" className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
            {css}
          </pre>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">HTML</h2>
            <CopyButton text={html} label="Copy HTML" testid="grid-copy-html" />
          </div>
          <pre data-testid="grid-html" className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-sky-200">
            {html}
          </pre>
        </div>
      </div>
    </ToolShell>
  )
}
