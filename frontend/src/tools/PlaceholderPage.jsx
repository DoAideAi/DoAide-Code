// The placeholder image generator page (/tools/placeholder-image): size, colors, label and font,
// a live preview, and downloads as PNG, JPEG, WebP or SVG — plus a data URI and <img> tag.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_SIDE, PRESETS, autoTextColor, buildSvg, clampSide, defaultLabel, normalizeHex, svgDataUri } from './placeholderTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'placeholder-image')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const SWATCHES = ['#cbd5e1', '#0f172a', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#f472b6']

function save(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Draws the SVG onto a canvas at full size and saves it in a raster format.
function downloadRaster(svg, width, height, type, name) {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    canvas.toBlob((blob) => blob && save(blob, name), type, 0.92)
  }
  img.src = svgDataUri(svg)
}

function ColorField({ label, value, onChange, testid }) {
  const hex = normalizeHex(value)
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      {label}
      <input type="color" aria-label={`${label} picker`} value={hex ?? '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 rounded border border-zinc-800 bg-transparent" />
      <input data-testid={testid} aria-label={`${label} hex`} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} w-24 ${hex ? '' : 'border-rose-800'}`} />
    </label>
  )
}

export default function PlaceholderPage() {
  const [width, setWidth] = useState(1200)
  const [height, setHeight] = useState(630)
  const [bg, setBg] = useState('#cbd5e1')
  const [fg, setFg] = useState('')
  const [text, setText] = useState('')
  const [font, setFont] = useState('sans')
  const [fontSize, setFontSize] = useState(0)
  const [radius, setRadius] = useState(0)
  const [border, setBorder] = useState(false)

  const bgHex = normalizeHex(bg) ?? '#cbd5e1'
  const fgHex = normalizeHex(fg) ?? autoTextColor(bgHex)
  const label = text.trim() ? text.replace(/\\n/g, '\n') : defaultLabel(width, height)
  const svg = buildSvg({ width, height, bg: bgHex, fg: fgHex, text: label, font, fontSize, radius, border })
  const dataUri = svgDataUri(svg)
  const name = `placeholder-${width}x${height}`
  const imgTag = `<img src="${dataUri}" width="${width}" height="${height}" alt="Placeholder ${width}×${height}">`

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(([presetLabel, w, h]) => (
          <button
            key={presetLabel}
            type="button"
            className={`${BUTTON} ${w === width && h === height ? 'bg-zinc-800 text-zinc-100' : ''}`}
            onClick={() => {
              setWidth(w)
              setHeight(h)
            }}
          >
            {presetLabel} <span className="text-zinc-500">{w}×{h}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Width
          <input type="number" data-testid="ph-width" min={1} max={MAX_SIDE} value={width} onChange={(e) => setWidth(clampSide(e.target.value))} className={`${INPUT} w-24`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Height
          <input type="number" data-testid="ph-height" min={1} max={MAX_SIDE} value={height} onChange={(e) => setHeight(clampSide(e.target.value))} className={`${INPUT} w-24`} />
        </label>
        <button
          type="button"
          className={BUTTON}
          aria-label="Swap width and height"
          onClick={() => {
            setWidth(height)
            setHeight(width)
          }}
        >
          ⇄ Swap
        </button>
        <ColorField label="Background" value={bg} onChange={setBg} testid="ph-bg" />
        <ColorField label="Text" value={fg || fgHex} onChange={setFg} testid="ph-fg" />
      </div>
      <div className="flex flex-wrap gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Background ${c}`}
            onClick={() => {
              setBg(c)
              setFg('')
            }}
            className="h-8 w-8 rounded border border-zinc-700"
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 text-sm text-zinc-300">
          Text
          <input data-testid="ph-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={`${defaultLabel(width, height)}  (use \\n for a new line)`} className={`${INPUT} flex-1`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Font
          <select value={font} onChange={(e) => setFont(e.target.value)} className={INPUT}>
            <option value="sans">Sans</option>
            <option value="mono">Mono</option>
            <option value="serif">Serif</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Size
          <input type="number" min={0} max={400} value={fontSize} onChange={(e) => setFontSize(Math.max(0, Math.min(400, Number(e.target.value) || 0)))} className={`${INPUT} w-20`} />
          <span className="text-xs text-zinc-500">0 = auto</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Radius
          <input type="number" min={0} max={500} value={radius} onChange={(e) => setRadius(Math.max(0, Math.min(500, Number(e.target.value) || 0)))} className={`${INPUT} w-20`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={border} onChange={(e) => setBorder(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Border
        </label>
      </div>

      <div className="flex justify-center rounded-lg border border-zinc-800 bg-[repeating-conic-gradient(#27272a_0%_25%,#18181b_0%_50%)] bg-[length:20px_20px] p-4">
        <img data-testid="ph-preview" src={dataUri} alt={`Placeholder preview, ${width} by ${height}`} className="max-h-[420px] max-w-full object-contain" />
      </div>
      <p className="text-center text-xs text-zinc-500">
        Preview scaled to fit · actual size {width} × {height}px
      </p>

      <div className="flex flex-wrap gap-1">
        <button type="button" data-testid="ph-png" className={`${BUTTON} bg-sky-700/40 text-zinc-100`} onClick={() => downloadRaster(svg, width, height, 'image/png', `${name}.png`)}>
          Download PNG
        </button>
        <button type="button" className={BUTTON} onClick={() => downloadRaster(svg, width, height, 'image/jpeg', `${name}.jpg`)}>
          JPEG
        </button>
        <button type="button" className={BUTTON} onClick={() => downloadRaster(svg, width, height, 'image/webp', `${name}.webp`)}>
          WebP
        </button>
        <button type="button" className={BUTTON} onClick={() => save(new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`)}>
          SVG
        </button>
        <CopyButton text={svg} label="Copy SVG" testid="ph-copy-svg" />
        <CopyButton text={dataUri} label="Copy data URI" />
        <CopyButton text={imgTag} label="Copy <img> tag" />
      </div>
    </ToolShell>
  )
}
