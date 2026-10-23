// The color palette generator page (/tools/color-palette): pick a base color and a harmony rule,
// see five swatches with hex/rgb/hsl and contrast, copy single colors or the whole set.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { EXPORTS, SCHEMES, contrastRatio, hexToHsl, hexToRgb, normalizeHex, palette, randomHex, textColorFor } from './paletteTool.js'
import { UTIL_TOOLS } from './utilTools.js'
import { copyText } from '../copy.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'color-palette')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const EXPORT_LABELS = { css: 'CSS variables', scss: 'SCSS', tailwind: 'Tailwind', json: 'JSON' }

export default function PalettePage() {
  const [base, setBase] = useState('#0ea5e9')
  const [draft, setDraft] = useState('#0ea5e9')
  const [scheme, setScheme] = useState('complementary')
  const [format, setFormat] = useState('css')
  const [copied, setCopied] = useState(null)
  const colors = palette(base, scheme)
  const exported = EXPORTS[format](colors)

  const choose = (hex) => {
    setBase(hex)
    setDraft(hex)
  }
  const copySwatch = async (hex) => {
    if (await copyText(hex)) {
      setCopied(hex)
      setTimeout(() => setCopied(null), 1200)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Base color
          <input type="color" data-testid="palette-picker" value={base} onChange={(e) => choose(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-zinc-800 bg-zinc-950" />
        </label>
        <input
          aria-label="Base color hex"
          data-testid="palette-hex"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            const hex = normalizeHex(e.target.value)
            if (hex) setBase(hex)
          }}
          className={`${INPUT} w-28 ${normalizeHex(draft) ? '' : 'border-rose-600'}`}
        />
        <button type="button" data-testid="palette-random" className={BUTTON} onClick={() => choose(randomHex())}>
          Random
        </button>
      </div>

      <div role="tablist" aria-label="Harmony rule" className="flex flex-wrap gap-1">
        {Object.entries(SCHEMES).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={scheme === key}
            data-testid={`palette-scheme-${key}`}
            onClick={() => setScheme(key)}
            className={`${BUTTON} ${scheme === key ? 'bg-zinc-800 text-zinc-100' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5" data-testid="palette-swatches">
        {colors.map((hex, i) => {
          const [h, s, l] = hexToHsl(hex).map(Math.round)
          const text = textColorFor(hex)
          return (
            <div key={i} className="flex flex-col overflow-hidden rounded-lg border border-zinc-800">
              <button
                type="button"
                data-testid={`palette-swatch-${i}`}
                onClick={() => copySwatch(hex)}
                title="Click to copy"
                className="flex h-28 items-end justify-between p-2 font-mono text-sm"
                style={{ background: hex, color: text }}
              >
                <span>{copied === hex ? 'Copied' : hex}</span>
                <span className="text-xs opacity-80">{contrastRatio(hex, text).toFixed(1)}:1</span>
              </button>
              <div className="flex flex-col gap-0.5 p-2 font-mono text-[11px] text-zinc-400">
                <span>rgb({hexToRgb(hex).join(', ')})</span>
                <span>
                  hsl({h}, {s}%, {l}%)
                </span>
                <button type="button" className="text-left text-sky-300 hover:underline" onClick={() => choose(hex)}>
                  Use as base
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {Object.keys(EXPORTS).map((key) => (
            <button key={key} type="button" data-testid={`palette-format-${key}`} onClick={() => setFormat(key)} className={`${BUTTON} ${format === key ? 'bg-zinc-800 text-zinc-100' : ''}`}>
              {EXPORT_LABELS[key]}
            </button>
          ))}
        </div>
        <CopyButton text={exported} label="Copy palette" testid="palette-copy" />
      </div>
      <pre data-testid="palette-export" className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
        {exported}
      </pre>
      <p className="text-xs text-zinc-500">The ratio on each swatch is the WCAG contrast of its label text — 4.5:1 or more passes AA for body text. Everything runs in your browser.</p>
    </ToolShell>
  )
}
