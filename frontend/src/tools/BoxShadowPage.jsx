// The box shadow generator page (/tools/box-shadow): sliders per layer, a live preview box, and
// the CSS to copy. Layers can be added, removed and toggled inset.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DEFAULT_LAYER, MAX_LAYERS, PRESETS, layerCss, shadowCss } from './boxShadowTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'box-shadow')

const SLIDERS = [
  ['x', 'X offset', -60, 60, 'px'],
  ['y', 'Y offset', -60, 60, 'px'],
  ['blur', 'Blur', 0, 100, 'px'],
  ['spread', 'Spread', -40, 40, 'px'],
  ['opacity', 'Opacity', 0, 100, '%'],
]

export default function BoxShadowPage() {
  const [layers, setLayers] = useState([{ ...DEFAULT_LAYER }])
  const [active, setActive] = useState(0)
  const layer = layers[active] ?? layers[0]
  const css = shadowCss(layers)

  const update = (patch) => setLayers((ls) => ls.map((l, i) => (i === active ? { ...l, ...patch } : l)))

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {layers.map((l, i) => (
              <button
                key={i}
                type="button"
                data-testid={`shadow-layer-${i}`}
                onClick={() => setActive(i)}
                className={`${BUTTON} ${i === active ? 'bg-zinc-800 text-zinc-100' : ''}`}
              >
                Layer {i + 1}
              </button>
            ))}
            {layers.length < MAX_LAYERS && (
              <button
                type="button"
                data-testid="shadow-add"
                className={BUTTON}
                onClick={() => {
                  setLayers((ls) => [...ls, { ...DEFAULT_LAYER, y: 2, blur: 8 }])
                  setActive(layers.length)
                }}
              >
                + Add layer
              </button>
            )}
            {layers.length > 1 && (
              <button
                type="button"
                data-testid="shadow-remove"
                className={BUTTON}
                onClick={() => {
                  setLayers((ls) => ls.filter((_, i) => i !== active))
                  setActive((a) => Math.max(0, a - 1))
                }}
              >
                Remove layer
              </button>
            )}
          </div>

          {SLIDERS.map(([key, label, min, max, unit]) => (
            <label key={key} className="flex flex-col gap-1 text-sm text-zinc-300">
              <span className="flex justify-between">
                {label}
                <span className="font-mono text-zinc-400" data-testid={`shadow-${key}-value`}>
                  {layer[key]}
                  {unit}
                </span>
              </span>
              <input
                type="range"
                data-testid={`shadow-${key}`}
                min={min}
                max={max}
                value={layer[key]}
                onChange={(e) => update({ [key]: Number(e.target.value) })}
                className="accent-sky-500"
              />
            </label>
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Color
              <input
                type="color"
                data-testid="shadow-color"
                value={layer.color}
                onChange={(e) => update({ color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                data-testid="shadow-inset"
                checked={layer.inset}
                onChange={(e) => update({ inset: e.target.checked })}
                className="h-4 w-4 accent-sky-500"
              />
              Inset (inner shadow)
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium text-zinc-200">Presets</h2>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map(([name, preset]) => (
                <button
                  key={name}
                  type="button"
                  data-testid={`shadow-preset-${name.toLowerCase().replace(/\s/g, '-')}`}
                  className={BUTTON}
                  onClick={() => {
                    setLayers(preset.map((l) => ({ ...l })))
                    setActive(0)
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-100 p-8">
            <div data-testid="shadow-preview" className="h-32 w-48 rounded-xl bg-white" style={{ boxShadow: layers.map(layerCss).join(', ') }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">CSS</h2>
            <CopyButton text={css} label="Copy CSS" testid="shadow-copy" />
          </div>
          <pre data-testid="shadow-css" className="overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
            {css}
          </pre>
          <p className="text-xs text-zinc-500">
            Layer several shadows for realistic depth: a tight dark one for contact, a wide soft one for ambience. Everything runs in your browser.
          </p>
        </div>
      </div>
    </ToolShell>
  )
}
