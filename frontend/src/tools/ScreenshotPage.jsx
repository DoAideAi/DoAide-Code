// The code screenshot generator (/tools/code-screenshot): paste code, pick a theme, download a
// PNG (2x for crispness) or copy the SVG. The image is an SVG built in screenshotTool.js and
// rasterized on a canvas — nothing is uploaded.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_SHOT_CHARS, MAX_SHOT_LINES, SHOT_THEMES, buildShot } from './screenshotTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'code-screenshot')

const PLACEHOLDER = `function greet(name) {
  // Say hello nicely
  return \`Hello, \${name}!\`
}`

// Draw the SVG onto a canvas at 2x and hand back a PNG blob.
function toPng(svg, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = width * 2
      canvas.height = height * 2
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG failed to load'))
    }
    img.src = url
  })
}

export default function ScreenshotPage() {
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('js')
  const [themeId, setThemeId] = useState('midnight')
  const [title, setTitle] = useState('')
  const [padding, setPadding] = useState(48)
  const [chrome, setChrome] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const tooLong = code.length > MAX_SHOT_CHARS
  const shown = code || PLACEHOLDER
  const shot = tooLong ? null : buildShot({ code: shown, lang, themeId, title, padding, window: chrome })

  const download = async () => {
    if (!shot) return
    setSaving(true)
    setError(null)
    try {
      const blob = await toPng(shot.svg, shot.width, shot.height)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(title || 'code').replace(/[^\w.-]+/g, '-')}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch {
      setError('Could not render the PNG in this browser — use “Copy SVG” instead.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="shot-in" className="sr-only">
          Your code
        </label>
        <textarea
          id="shot-in"
          data-testid="shot-in"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          spellCheck={false}
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Language
            <input
              data-testid="shot-lang"
              type="text"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              placeholder="js"
              className="w-20 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Title
            <input
              data-testid="shot-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="app.js"
              className="w-32 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Padding
            <select
              data-testid="shot-padding"
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
            >
              <option value={16}>Tight</option>
              <option value={48}>Cozy</option>
              <option value={96}>Spacious</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" data-testid="shot-chrome" checked={chrome} onChange={(e) => setChrome(e.target.checked)} className="h-4 w-4 rounded border-zinc-700 bg-zinc-900" />
            Window chrome
          </label>
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {code.length.toLocaleString()} / {MAX_SHOT_CHARS.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Themes">
          {SHOT_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`shot-theme-${t.id}`}
              aria-pressed={t.id === themeId}
              onClick={() => setThemeId(t.id)}
              className={`flex min-h-[36px] items-center gap-2 rounded-md border px-3 text-xs ${
                t.id === themeId ? 'border-zinc-500 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border border-black/30"
                style={{ background: `linear-gradient(135deg, ${t.backdrop[0]}, ${t.backdrop[1]})` }}
              />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          Screenshots work best for short snippets — trim to {MAX_SHOT_CHARS.toLocaleString()} characters.
        </p>
      )}
      {shot?.truncated && (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          Showing the first {MAX_SHOT_LINES} lines.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {shot && (
        <>
          <section aria-label="Preview" className="overflow-x-auto rounded-lg border border-zinc-800 p-2">
            <img
              data-testid="shot-preview"
              alt="Code screenshot preview"
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(shot.svg)}`}
              width={shot.width}
              height={shot.height}
              className="h-auto max-w-full"
            />
          </section>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="shot-download"
              onClick={download}
              disabled={saving}
              className="min-h-[44px] rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 sm:min-h-[40px]"
            >
              {saving ? 'Rendering…' : 'Download PNG (2x)'}
            </button>
            <CopyButton text={shot.svg} label="Copy SVG" testid="shot-copy-svg" />
            <span className="text-xs text-zinc-500">
              {shot.width}×{shot.height} (PNG downloads at {shot.width * 2}×{shot.height * 2}). Nothing is uploaded.
            </span>
          </div>
        </>
      )}
    </ToolShell>
  )
}
