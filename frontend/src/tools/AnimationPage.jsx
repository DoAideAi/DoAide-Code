// The CSS animation generator page (/tools/css-animation): start from a preset or blank, edit
// keyframe stops on a timeline, tune duration, easing (with its curve), iterations and
// direction, watch the live preview and copy the @keyframes CSS.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DEFAULT_SETTINGS, EASINGS, NEUTRAL, PRESETS, PROPS, animationShorthand, bezierPath, fullCss, keyframesCss } from './animationTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'css-animation')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const PREVIEW_NAME = 'doaide-anim-preview'

function fromPreset(name) {
  const p = PRESETS[name]
  return { frames: p.frames.map((f) => ({ at: f.at, props: { ...f.props } })), settings: { ...DEFAULT_SETTINGS, ...p.settings, name } }
}

export default function AnimationPage() {
  const [{ frames, settings }, setState] = useState(() => fromPreset('bounce'))
  const [selected, setSelected] = useState(0)
  const [replay, setReplay] = useState(0)
  const [paused, setPaused] = useState(false)
  const [newAt, setNewAt] = useState(50)

  const sorted = [...frames].sort((a, b) => a.at - b.at)
  const stop = sorted[Math.min(selected, sorted.length - 1)]
  const css = fullCss(frames, settings)
  const curve = settings.easing === 'custom' ? settings.bezier : EASINGS[settings.easing]

  const setSettings = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  const setFrames = (fn) => setState((s) => ({ ...s, frames: fn(s.frames) }))
  const editStop = (key, value) =>
    setFrames((fs) =>
      fs.map((f) => {
        if (f !== stop) return f
        const props = { ...f.props }
        if (value === undefined) delete props[key]
        else props[key] = value
        return { ...f, props }
      }),
    )
  const addStop = () => {
    const at = Math.max(0, Math.min(100, Math.round(newAt)))
    if (sorted.some((f) => f.at === at)) return
    const next = sorted.filter((f) => f.at < at).at(-1)
    setFrames((fs) => [...fs, { at, props: { ...(next?.props ?? {}) } }])
    setSelected([...sorted.map((f) => f.at), at].sort((a, b) => a - b).indexOf(at))
  }
  const removeStop = () => {
    if (sorted.length <= 2) return
    setFrames((fs) => fs.filter((f) => f !== stop))
    setSelected(0)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap gap-1">
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            type="button"
            data-testid={`anim-preset-${name}`}
            className={`${BUTTON} ${settings.name === name ? 'bg-zinc-800 text-zinc-100' : ''}`}
            onClick={() => {
              setState(fromPreset(name))
              setSelected(0)
              setReplay((r) => r + 1)
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <style>{keyframesCss(frames, PREVIEW_NAME)}</style>
          <div className="flex h-64 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            <div
              key={replay}
              data-testid="anim-preview"
              className="h-20 w-20 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg"
              style={{ animation: animationShorthand({ ...settings, name: PREVIEW_NAME }), animationPlayState: paused ? 'paused' : 'running' }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" data-testid="anim-replay" className={BUTTON} onClick={() => setReplay((r) => r + 1)}>
              ↻ Replay
            </button>
            <button type="button" className={BUTTON} onClick={() => setPaused((p) => !p)}>
              {paused ? '▶ Play' : '❚❚ Pause'}
            </button>
          </div>

          <div aria-label="Keyframe timeline" className="relative mx-3 mt-2 h-10">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-700" />
            {sorted.map((f, i) => (
              <button
                key={f.at}
                type="button"
                data-testid={`anim-stop-${f.at}`}
                aria-label={`Keyframe at ${f.at}%`}
                aria-pressed={f === stop}
                onClick={() => setSelected(i)}
                className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm border ${f === stop ? 'border-sky-300 bg-sky-500' : 'border-zinc-500 bg-zinc-800 hover:bg-zinc-700'}`}
                style={{ left: `${f.at}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              Add stop at
              <input type="number" data-testid="anim-new-at" min={0} max={100} value={newAt} onChange={(e) => setNewAt(Number(e.target.value))} className={`${INPUT} w-20`} />%
            </label>
            <button type="button" data-testid="anim-add-stop" className={BUTTON} onClick={addStop}>
              + Add
            </button>
            <button type="button" className={BUTTON} onClick={removeStop} disabled={sorted.length <= 2}>
              Remove {stop.at}%
            </button>
          </div>

          <section aria-label={`Keyframe ${stop.at}%`} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3">
            <h2 className="text-sm font-medium text-zinc-200">At {stop.at}%</h2>
            {PROPS.map(([key, label, unit, min, max, step]) => {
              const on = stop.props[key] !== undefined
              return (
                <div key={key} className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    aria-label={`Animate ${label}`}
                    data-testid={`anim-use-${key}`}
                    checked={on}
                    onChange={(e) => editStop(key, e.target.checked ? NEUTRAL[key] : undefined)}
                    className="h-4 w-4 accent-sky-500"
                  />
                  <span className="w-20 shrink-0">{label}</span>
                  <input
                    type="range"
                    aria-label={label}
                    data-testid={`anim-${key}`}
                    min={min}
                    max={max}
                    step={step}
                    disabled={!on}
                    value={stop.props[key] ?? NEUTRAL[key]}
                    onChange={(e) => editStop(key, Number(e.target.value))}
                    className="min-w-0 flex-1 accent-sky-500 disabled:opacity-30"
                  />
                  <span className="w-16 text-right font-mono text-xs text-zinc-400">{on ? `${stop.props[key]}${unit}` : '—'}</span>
                </div>
              )
            })}
          </section>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-sm text-zinc-300">
            <label className="col-span-2 flex flex-col gap-1">
              Name
              <input data-testid="anim-name" value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              Duration (s)
              <input type="number" data-testid="anim-duration" min={0.05} max={30} step={0.05} value={settings.duration} onChange={(e) => setSettings({ duration: Math.max(0.05, Number(e.target.value) || 0.05) })} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              Delay (s)
              <input type="number" min={0} max={30} step={0.1} value={settings.delay} onChange={(e) => setSettings({ delay: Math.max(0, Number(e.target.value) || 0) })} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              Iterations
              <select data-testid="anim-iterations" value={settings.iterations} onChange={(e) => setSettings({ iterations: e.target.value })} className={INPUT}>
                <option value="infinite">infinite</option>
                {['1', '2', '3', '5', '10'].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Direction
              <select value={settings.direction} onChange={(e) => setSettings({ direction: e.target.value })} className={INPUT}>
                {['normal', 'reverse', 'alternate', 'alternate-reverse'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Fill mode
              <select value={settings.fill} onChange={(e) => setSettings({ fill: e.target.value })} className={INPUT}>
                {['none', 'forwards', 'backwards', 'both'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Timing function
              <select data-testid="anim-easing" value={settings.easing} onChange={(e) => setSettings({ easing: e.target.value })} className={INPUT}>
                {Object.keys(EASINGS).map((e) => (
                  <option key={e}>{e}</option>
                ))}
                <option value="custom">cubic-bezier (custom)</option>
                <option value="steps">steps()</option>
              </select>
            </label>
          </div>

          <div className="flex items-start gap-3">
            {curve && (
              <svg viewBox="-10 -40 120 180" aria-label="Easing curve" className="h-36 w-28 shrink-0 rounded border border-zinc-800 bg-zinc-950">
                <rect x="0" y="0" width="100" height="100" fill="none" stroke="#3f3f46" strokeDasharray="2 2" />
                <line x1="0" y1="100" x2={curve[0] * 100} y2={100 - curve[1] * 100} stroke="#71717a" />
                <line x1="100" y1="0" x2={curve[2] * 100} y2={100 - curve[3] * 100} stroke="#71717a" />
                <path d={bezierPath(curve)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              </svg>
            )}
            {settings.easing === 'custom' && (
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                {['x1', 'y1', 'x2', 'y2'].map((label, i) => (
                  <label key={label} className="flex flex-col gap-1">
                    {label}
                    <input
                      type="number"
                      data-testid={`anim-bezier-${label}`}
                      step={0.05}
                      min={i % 2 === 0 ? 0 : -2}
                      max={i % 2 === 0 ? 1 : 3}
                      value={settings.bezier[i]}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0
                        const clamped = i % 2 === 0 ? Math.min(1, Math.max(0, v)) : Math.min(3, Math.max(-2, v))
                        setSettings({ bezier: settings.bezier.map((b, j) => (j === i ? clamped : b)) })
                      }}
                      className={`${INPUT} w-20`}
                    />
                  </label>
                ))}
              </div>
            )}
            {settings.easing === 'steps' && (
              <label className="flex flex-col gap-1 text-sm text-zinc-300">
                Steps
                <input type="number" min={1} max={60} value={settings.steps} onChange={(e) => setSettings({ steps: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} className={`${INPUT} w-20`} />
              </label>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">CSS</span>
            <CopyButton text={css} label="Copy CSS" testid="anim-copy" />
          </div>
          <pre data-testid="anim-css" className="max-h-[420px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
            {css}
          </pre>
        </div>
      </div>
    </ToolShell>
  )
}
