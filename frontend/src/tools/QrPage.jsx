// The QR code generator (/tools/qr-code): type text or a URL, watch the code update, download it
// as SVG or PNG.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { EC_LEVELS, MAX_QR_CHARS, qrSvg, svgDataUrl, svgToPngUrl } from './qrTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'qr-code')

function save(href, name) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export default function QrPage() {
  const [text, setText] = useState('https://code.doaide.com')
  const [ecl, setEcl] = useState('M')
  const [pngError, setPngError] = useState(null)

  const result = useMemo(() => {
    if (!text.trim()) return { error: null, svg: null }
    try {
      return { error: null, svg: qrSvg(text, { ecl }) }
    } catch (e) {
      return { error: e.message, svg: null }
    }
  }, [text, ecl])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="qr-input" className="text-sm font-medium text-zinc-200">
              Text or URL
            </label>
            <textarea
              id="qr-input"
              data-testid="qr-input"
              value={text}
              maxLength={MAX_QR_CHARS}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://example.com"
              spellCheck={false}
              className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Error correction
            <select
              data-testid="qr-ecl"
              value={ecl}
              onChange={(e) => setEcl(e.target.value)}
              className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]"
            >
              {EC_LEVELS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-zinc-500">
            Higher correction keeps the code scannable when partly covered (a logo, a scratch), at the cost of a denser pattern. Generated in your browser —
            nothing is uploaded.
          </p>
          {result.error && (
            <p role="alert" data-testid="qr-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {result.error}
            </p>
          )}
          {pngError && (
            <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {pngError}
            </p>
          )}
        </div>

        {result.svg && (
          <div className="flex flex-col items-center gap-3">
            <img data-testid="qr-image" src={svgDataUrl(result.svg)} alt={`QR code for: ${text.slice(0, 80)}`} className="h-64 w-64 rounded-lg bg-white p-2" />
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" data-testid="qr-save-svg" className={BUTTON} onClick={() => save(svgDataUrl(result.svg), 'qr-code.svg')}>
                Download SVG
              </button>
              <button
                type="button"
                data-testid="qr-save-png"
                className={BUTTON}
                onClick={async () => {
                  setPngError(null)
                  try {
                    save(await svgToPngUrl(result.svg), 'qr-code.png')
                  } catch (e) {
                    setPngError(e.message)
                  }
                }}
              >
                Download PNG
              </button>
              <CopyButton text={result.svg} label="Copy SVG" testid="qr-copy-svg" />
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  )
}
