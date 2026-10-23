// The favicon generator page (/tools/favicon-generator): drop an image, see every size rendered,
// download individual PNGs, the favicon.ico, and copy the <head> snippet.

import { useRef, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { ICO_SIZES, SIZES, dataUrlToBytes, htmlSnippet, icoBytes, loadImage, renderSize } from './faviconTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'favicon-generator')

function save(href, name) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export default function FaviconPage() {
  const [icons, setIcons] = useState(null) // [{size, name, label, url}]
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    try {
      const img = await loadImage(file)
      setIcons(SIZES.map(([size, name, label]) => ({ size, name, label, url: renderSize(img, size) })))
    } catch (e) {
      setIcons(null)
      setError(e.message)
    }
  }

  const downloadIco = () => {
    try {
      const entries = icons.filter((i) => ICO_SIZES.includes(i.size)).map((i) => ({ size: i.size, bytes: dataUrlToBytes(i.url) }))
      const blob = new Blob([icoBytes(entries)], { type: 'image/x-icon' })
      const url = URL.createObjectURL(blob)
      save(url, 'favicon.ico')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4">
        <button
          type="button"
          data-testid="favicon-drop"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={`flex min-h-[120px] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 text-sm ${
            dragging ? 'border-sky-500 bg-sky-950/20 text-sky-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
          }`}
        >
          <span className="font-medium text-zinc-200">Drop an image here or click to choose</span>
          <span className="text-xs text-zinc-500">Square images work best — PNG, JPEG, WebP or SVG, 512×512 or larger. Never uploaded.</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          data-testid="favicon-input"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {error && (
          <p role="alert" data-testid="favicon-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {icons && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" data-testid="favicon-ico" className={`${BUTTON} border-sky-800 text-sky-300`} onClick={downloadIco}>
                Download favicon.ico
              </button>
              {icons.map((icon) => (
                <button key={icon.size} type="button" data-testid={`favicon-save-${icon.size}`} className={BUTTON} onClick={() => save(icon.url, icon.name)}>
                  {icon.size}×{icon.size}
                </button>
              ))}
            </div>
            <ul data-testid="favicon-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {icons.map((icon) => (
                <li key={icon.size} className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 p-3">
                  <span className="flex h-20 w-20 items-center justify-center rounded bg-[conic-gradient(#27272a_90deg,#3f3f46_90deg_180deg,#27272a_180deg_270deg,#3f3f46_270deg)] bg-[length:16px_16px]">
                    <img src={icon.url} alt={`${icon.size}×${icon.size} favicon`} style={{ width: Math.min(icon.size, 64), height: Math.min(icon.size, 64) }} />
                  </span>
                  <span className="text-xs font-medium text-zinc-300">
                    {icon.size}×{icon.size}
                  </span>
                  <span className="text-center text-[11px] text-zinc-500">{icon.label}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-200">Add to your &lt;head&gt;</h2>
                <CopyButton text={htmlSnippet()} label="Copy snippet" testid="favicon-copy-html" />
              </div>
              <pre data-testid="favicon-html" className="overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
                {htmlSnippet()}
              </pre>
              <p className="text-xs text-zinc-500">Put the downloaded files at your site root. The .ico bundles the 16, 32 and 48px versions for legacy browsers and Windows.</p>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}
