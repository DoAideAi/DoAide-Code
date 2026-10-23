// The ASCII art generator page (/tools/ascii-art): type text, pick a FIGlet font, layout and
// comment style, and copy the banner. A gallery renders the text in every font to compare.

import { useEffect, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { COMMENTS, FONTS, LAYOUTS, renderAscii, wrapComment } from './asciiArtTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'ascii-art')

const SELECT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'
const ART = 'overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-[1.15] text-emerald-200 sm:text-[13px]'
export const MAX_ASCII_CHARS = 200

export default function AsciiArtPage() {
  const [text, setText] = useState('Hello World')
  const [font, setFont] = useState('Standard')
  const [layout, setLayout] = useState('default')
  const [width, setWidth] = useState(0)
  const [comment, setComment] = useState('none')
  const [art, setArt] = useState('')
  const [error, setError] = useState('')
  const [gallery, setGallery] = useState(null)

  useEffect(() => {
    let live = true
    renderAscii(text.slice(0, MAX_ASCII_CHARS), font, { layout, width })
      .then((a) => {
        if (!live) return
        setArt(a)
        setError('')
      })
      .catch(() => {
        if (live) setError('Could not load that font — check your connection and try again.')
      })
    return () => {
      live = false
    }
  }, [text, font, layout, width])

  // The gallery re-renders when the text changes while it is open.
  useEffect(() => {
    if (gallery === null) return
    let live = true
    const sample = text.split('\n')[0].slice(0, 24) || 'Hello'
    Promise.all(Object.keys(FONTS).map((f) => renderAscii(sample, f).then((a) => [f, a], () => [f, ''])))
      .then((pairs) => live && setGallery(pairs))
    return () => {
      live = false
    }
  }, [text, gallery === null])

  const output = wrapComment(art, comment)

  return (
    <ToolShell tool={TOOL}>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
        Your text
        <textarea
          data-testid="ascii-input"
          value={text}
          maxLength={MAX_ASCII_CHARS}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[16px] text-zinc-200 focus:border-zinc-600 focus:outline-none sm:text-sm"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Font
          <select data-testid="ascii-font" value={font} onChange={(e) => setFont(e.target.value)} className={SELECT}>
            {Object.keys(FONTS).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Letter spacing
          <select data-testid="ascii-layout" value={layout} onChange={(e) => setLayout(e.target.value)} className={SELECT}>
            {LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {l === 'default' ? 'Font default' : l === 'fitted' ? 'Tight' : 'Wide'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Max width
          <select data-testid="ascii-width" value={width} onChange={(e) => setWidth(Number(e.target.value))} className={SELECT}>
            <option value={0}>No limit</option>
            {[60, 80, 100, 120].map((w) => (
              <option key={w} value={w}>
                {w} columns
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Wrap in comment
          <select data-testid="ascii-comment" value={comment} onChange={(e) => setComment(e.target.value)} className={SELECT}>
            {Object.entries(COMMENTS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          <CopyButton text={output} label="Copy ASCII art" testid="ascii-copy" />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : (
        <pre data-testid="ascii-output" aria-label={`${text} in ASCII art`} className={`${ART} min-h-[120px]`}>
          {output}
        </pre>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" data-testid="ascii-gallery-toggle" className={`${BUTTON} self-start`} onClick={() => setGallery((g) => (g === null ? [] : null))}>
          {gallery === null ? 'Compare all fonts' : 'Hide font gallery'}
        </button>
        {gallery !== null && (
          <div data-testid="ascii-gallery" className="grid gap-3 lg:grid-cols-2">
            {gallery.map(([f, a]) => (
              <button key={f} type="button" data-testid={`ascii-gallery-${f}`} onClick={() => setFont(f)} className="flex min-w-0 flex-col gap-1 text-left">
                <span className={`text-xs ${f === font ? 'text-sky-300' : 'text-zinc-400'}`}>{f}</span>
                <pre className={`${ART} w-full text-[10px] sm:text-[11px]`}>{a}</pre>
              </button>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  )
}
