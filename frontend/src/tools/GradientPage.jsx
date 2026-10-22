// The CSS gradient generator (/tools/css-gradient): pick colors and positions, see the gradient
// live, copy the CSS (with a solid-color fallback line). Native color inputs, no library.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { GRADIENT_PRESETS, MAX_STOPS, MIN_STOPS, gradientCss, gradientSnippet, spreadStops } from './gradientTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'css-gradient')

export default function GradientPage() {
  const [type, setType] = useState('linear')
  const [angle, setAngle] = useState(135)
  const [stops, setStops] = useState([
    { color: '#ff0080', pos: 0 },
    { color: '#7928ca', pos: 100 },
  ])
  const state = { type, angle, stops }
  const css = gradientCss(state)
  const snippet = gradientSnippet(state)

  const setStop = (i, patch) => setStops(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const addStop = () => {
    if (stops.length >= MAX_STOPS) return
    setStops(spreadStops([...stops, { color: '#ffffff', pos: 100 }]))
  }
  const removeStop = (i) => {
    if (stops.length <= MIN_STOPS) return
    setStops(stops.filter((_, j) => j !== i))
  }
  const applyPreset = (p) => {
    setType(p.type)
    setAngle(p.angle)
    setStops(p.stops.map((s) => ({ ...s })))
  }

  return (
    <ToolShell tool={TOOL}>
      <div
        data-testid="gradient-preview"
        aria-label="Gradient preview"
        role="img"
        className="h-48 w-full rounded-xl border border-zinc-800 sm:h-64"
        style={{ background: css }}
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <section aria-label="Gradient settings" className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="gradient-type" className="text-sm text-zinc-300">
              Type
            </label>
            <select
              id="gradient-type"
              data-testid="gradient-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
              <option value="conic">Conic</option>
            </select>
            {type !== 'radial' && (
              <label className="flex flex-1 items-center gap-2 text-sm text-zinc-300">
                Angle
                <input
                  type="range"
                  data-testid="gradient-angle"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="min-w-0 flex-1"
                />
                <span className="w-12 text-right font-mono text-xs tabular-nums text-zinc-400">{angle}°</span>
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2" data-testid="gradient-stops">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`Stop ${i + 1} color`}
                  data-testid={`stop-color-${i}`}
                  value={s.color}
                  onChange={(e) => setStop(i, { color: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950"
                />
                <input
                  type="range"
                  aria-label={`Stop ${i + 1} position`}
                  data-testid={`stop-pos-${i}`}
                  min={0}
                  max={100}
                  value={s.pos}
                  onChange={(e) => setStop(i, { pos: Number(e.target.value) })}
                  className="min-w-0 flex-1"
                />
                <span className="w-10 text-right font-mono text-xs tabular-nums text-zinc-400">{s.pos}%</span>
                <button
                  type="button"
                  aria-label={`Remove stop ${i + 1}`}
                  onClick={() => removeStop(i)}
                  disabled={stops.length <= MIN_STOPS}
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="gradient-add-stop" onClick={addStop} disabled={stops.length >= MAX_STOPS} className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}>
              Add stop
            </button>
            <button type="button" onClick={() => setStops(spreadStops(stops))} className={BUTTON}>
              Spread evenly
            </button>
          </div>
        </section>

        <section aria-label="CSS output" className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">CSS</h2>
            <div className="ml-auto">
              <CopyButton text={snippet} label="Copy CSS" testid="gradient-copy" />
            </div>
          </div>
          <pre data-testid="gradient-css" className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed text-zinc-200">
            {snippet}
          </pre>
          <p className="text-xs text-zinc-500">The first line is a solid-color fallback for very old browsers.</p>
        </section>
      </div>

      <section aria-label="Presets" className="rounded-lg border border-zinc-800 p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-200">Presets</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADIENT_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="flex h-16 items-end justify-start rounded-lg border border-zinc-800 p-2 text-xs font-medium text-white/90 shadow-inner hover:border-zinc-600"
              style={{ background: gradientCss(p) }}
            >
              <span className="rounded bg-black/40 px-1.5 py-0.5">{p.name}</span>
            </button>
          ))}
        </div>
      </section>
    </ToolShell>
  )
}
