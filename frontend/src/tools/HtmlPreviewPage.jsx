// The HTML preview (/tools/html-preview): three panes — HTML, CSS, JS — and a live sandboxed
// preview that rebuilds shortly after you stop typing. Like CodePen, but just the essentials.

import { useEffect, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { MAX_PREVIEW_CHARS, SAMPLE_CSS, SAMPLE_HTML, SAMPLE_JS, buildDoc } from './htmlPreviewTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'html-preview')

const PANE =
  'min-h-[140px] w-full flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none'

function Editor({ label, id, value, onChange }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs uppercase tracking-wide text-zinc-600">
        {label}
      </label>
      <textarea
        id={id}
        data-testid={id}
        value={value}
        maxLength={MAX_PREVIEW_CHARS}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={PANE}
      />
    </div>
  )
}

export default function HtmlPreviewPage() {
  const [html, setHtml] = useState(SAMPLE_HTML)
  const [css, setCss] = useState(SAMPLE_CSS)
  const [js, setJs] = useState(SAMPLE_JS)
  const [doc, setDoc] = useState(() => buildDoc(SAMPLE_HTML, SAMPLE_CSS, SAMPLE_JS))

  // Rebuild the frame 400ms after the last keystroke, so typing stays smooth.
  useEffect(() => {
    const t = setTimeout(() => setDoc(buildDoc(html, css, js)), 400)
    return () => clearTimeout(t)
  }, [html, css, js])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3 lg:flex-row">
        <Editor label="HTML" id="hp-html" value={html} onChange={setHtml} />
        <Editor label="CSS" id="hp-css" value={css} onChange={setCss} />
        <Editor label="JavaScript" id="hp-js" value={js} onChange={setJs} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">Preview</span>
          <p className="text-xs text-zinc-500">Sandboxed — the preview cannot touch this site or your data.</p>
          <div className="ml-auto">
            <CopyButton text={doc} label="Copy full HTML" testid="hp-copy" />
          </div>
        </div>
        <iframe
          title="Live preview of your HTML, CSS and JavaScript"
          data-testid="hp-frame"
          sandbox="allow-scripts"
          srcDoc={doc}
          className="h-[420px] w-full rounded-lg border border-zinc-800 bg-white"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Runtime errors appear in a red strip inside the preview. Copy full HTML gives one self-contained file. Nothing leaves this page.
      </p>
    </ToolShell>
  )
}
