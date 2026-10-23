// The SVG optimizer page (/tools/svg-optimizer): paste SVG on the left, get the optimized markup,
// a before/after size banner and a visual preview on the right.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_SVG_INPUT, optimizeSvg, savingsLabel } from './svgOptimizerTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'svg-optimizer')

export default function SvgOptimizerPage() {
  const [text, setText] = useState('')
  const [precision, setPrecision] = useState(2)
  const [removeTitles, setRemoveTitles] = useState(true)

  const result = useMemo(() => {
    if (!text.trim()) return null
    try {
      return { ...optimizeSvg(text, { precision, removeTitles }), error: null }
    } catch (e) {
      return { error: e.message }
    }
  }, [text, precision, removeTitles])

  const download = () => {
    const a = document.createElement('a')
    a.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`
    a.download = 'optimized.svg'
    a.click()
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <label htmlFor="svg-input" className="text-sm font-medium text-zinc-200">
            SVG markup
          </label>
          <textarea
            id="svg-input"
            data-testid="svg-input"
            value={text}
            maxLength={MAX_SVG_INPUT}
            onChange={(e) => setText(e.target.value)}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'
            spellCheck={false}
            className="min-h-[320px] w-full flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              Decimal places
              <select
                data-testid="svg-precision"
                value={precision}
                onChange={(e) => setPrecision(Number(e.target.value))}
                className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" data-testid="svg-remove-titles" className="h-4 w-4 accent-sky-500" checked={removeTitles} onChange={(e) => setRemoveTitles(e.target.checked)} />
              Remove &lt;title&gt; and &lt;desc&gt;
            </label>
          </div>
          <p className="text-xs text-zinc-500">
            Strips comments, metadata, editor namespaces and the XML prolog, rounds coordinates, compacts path data and collapses whitespace. Keep titles if the
            SVG must stay accessible as a standalone image. Nothing is uploaded.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {result?.error && (
            <p role="alert" data-testid="svg-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {result.error}
            </p>
          )}
          {result && !result.error && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p data-testid="svg-savings" className="rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-sm text-emerald-300">
                  {savingsLabel(result)}
                </p>
                <div className="flex gap-2">
                  <CopyButton text={result.svg} label="Copy SVG" testid="svg-copy" />
                  <button type="button" data-testid="svg-download" className={BUTTON} onClick={download}>
                    Download
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center rounded-lg border border-zinc-800 bg-white p-4">
                <img data-testid="svg-preview" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`} alt="Optimized SVG preview" className="max-h-48 max-w-full" />
              </div>
              <pre data-testid="svg-output" className="min-h-[160px] flex-1 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
                {result.svg}
              </pre>
            </>
          )}
          {!result && <p className="rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">The optimized SVG appears here.</p>}
        </div>
      </div>
    </ToolShell>
  )
}
