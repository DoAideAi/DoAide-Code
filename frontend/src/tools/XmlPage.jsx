// The XML formatter page (/tools/xml-formatter): paste XML, see whether it is well-formed (with
// the line of the first error), and copy it formatted, minified or as JSON. Runs in the page.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { formatXml, xmlToJson } from './xmlTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'xml-formatter')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- RSS feed sample -->
<rss version="2.0"><channel><title>DoAide Code</title><link>https://code.doaide.com</link>
<item><title>CSV to JSON</title><guid isPermaLink="false">csv</guid></item>
<item><title>XML formatter</title><description><![CDATA[Format & <validate> XML]]></description></item>
</channel></rss>`

const MODES = [
  ['format', 'Format'],
  ['minify', 'Minify'],
  ['json', 'To JSON'],
]
const INDENTS = [
  ['  ', '2 spaces'],
  ['    ', '4 spaces'],
  ['\t', 'Tab'],
]

export default function XmlPage() {
  const [text, setText] = useState(SAMPLE)
  const [mode, setMode] = useState('format')
  const [indent, setIndent] = useState('  ')
  const [keepComments, setKeepComments] = useState(true)

  const { output, error } = useMemo(() => {
    if (!text.trim()) return { output: '', error: null }
    try {
      if (mode === 'json') return { output: xmlToJson(text, indent === '\t' ? '\t' : indent.length), error: null }
      return { output: formatXml(text, { indent, minify: mode === 'minify', keepComments }), error: null }
    } catch (e) {
      return { output: '', error: e }
    }
  }, [text, mode, indent, keepComments])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
        <div role="group" aria-label="Output" className="flex gap-1">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              type="button"
              data-testid={`xml-mode-${m}`}
              aria-pressed={mode === m}
              className={`${BUTTON} ${mode === m ? 'bg-zinc-800 text-zinc-100' : ''}`}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>
        {mode !== 'minify' && (
          <label className="flex items-center gap-2">
            Indent
            <select value={indent} onChange={(e) => setIndent(e.target.value)} className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 sm:min-h-[36px]">
              {INDENTS.map(([v, label]) => (
                <option key={label} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode !== 'json' && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={keepComments} onChange={(e) => setKeepComments(e.target.checked)} className="h-4 w-4 accent-sky-500" />
            Keep comments
          </label>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          XML
          <textarea
            data-testid="xml-in"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            spellCheck={false}
            className={`w-full resize-y rounded-lg border bg-shade/40 p-3 text-zinc-200 ${MONO} ${error ? 'border-rose-800' : 'border-zinc-800'}`}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            {error ? (
              <span className="text-rose-300">Not well-formed</span>
            ) : text.trim() ? (
              <span data-testid="xml-valid" className="text-emerald-300">
                ✓ Well-formed XML
              </span>
            ) : (
              <span className="text-zinc-500">Paste XML to check it</span>
            )}
            <CopyButton text={output} label="Copy" testid="xml-copy" />
          </div>
          {error ? (
            <p role="alert" data-testid="xml-error" className="rounded border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
              Line {error.line}, column {error.col}: {error.message}
            </p>
          ) : (
            <pre data-testid="xml-out" className={`max-h-[36rem] min-h-[10rem] overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-emerald-200 ${MONO}`}>
              {output}
            </pre>
          )}
          <p className="text-xs text-zinc-500">Checks well-formedness (tags, nesting, quoting, entities, one root) — not validity against an XSD or DTD.</p>
        </div>
      </div>
    </ToolShell>
  )
}
