// The image → Base64 converter (/tools/image-to-base64): drop or pick an image, see it and its
// size, copy the data URL, raw Base64, <img>, CSS or Markdown form.

import { useRef, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { formatBytes, imageError, readAsDataUrl, snippets } from './imageTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'image-to-base64')

export default function ImagePage() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const take = async (file) => {
    const bad = imageError(file)
    setError(bad)
    if (bad) return
    try {
      const dataUrl = await readAsDataUrl(file)
      setResult({ dataUrl, name: file.name, size: file.size, encoded: dataUrl.length })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div
        data-testid="img-drop"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          take(e.dataTransfer.files?.[0])
        }}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center ${
          dragging ? 'border-sky-500 bg-sky-950/20' : 'border-zinc-700'
        }`}
      >
        <p className="text-sm text-zinc-300">Drop an image here, or</p>
        <button type="button" className={BUTTON} onClick={() => inputRef.current?.click()}>
          Choose an image
        </button>
        <input
          ref={inputRef}
          data-testid="img-input"
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose an image"
          onChange={(e) => take(e.target.files?.[0])}
        />
        <p className="text-xs text-zinc-500">PNG, JPEG, GIF, WebP, SVG, AVIF, BMP or ICO, up to 8 MB. Converted in your browser — never uploaded.</p>
      </div>

      {error && (
        <p role="alert" data-testid="img-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <img src={result.dataUrl} alt={result.name} className="max-h-32 max-w-[160px] rounded-md border border-zinc-800 object-contain" />
            <div className="text-sm text-zinc-300">
              <p className="font-medium text-zinc-100">{result.name}</p>
              <p data-testid="img-stats" className="text-xs text-zinc-500">
                {formatBytes(result.size)} file → {formatBytes(result.encoded)} as a data URL (Base64 adds ~33%).
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {snippets(result.dataUrl, result.name.replace(/\.[^.]+$/, '')).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
                  <div className="ml-auto">
                    <CopyButton text={value} testid={`img-copy-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`} />
                  </div>
                </div>
                <textarea
                  readOnly
                  value={value.length > 2000 ? `${value.slice(0, 2000)}… (${value.length.toLocaleString()} characters — Copy gives all of it)` : value}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-2 font-mono text-[12px] leading-relaxed text-zinc-300 focus:border-zinc-600 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolShell>
  )
}
