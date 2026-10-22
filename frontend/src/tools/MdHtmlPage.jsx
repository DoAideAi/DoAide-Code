// The Markdown → HTML converter (/tools/markdown-to-html): Markdown on the left, the generated
// HTML and a rendered preview on the right. The converter escapes all input, so the preview only
// ever renders tags we generated.

import { useMemo, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { MAX_MD_CHARS, SAMPLE_MD, markdownToHtml } from './mdHtmlTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'markdown-to-html')

export default function MdHtmlPage() {
  const [md, setMd] = useState(SAMPLE_MD)
  const [view, setView] = useState('preview')
  const html = useMemo(() => markdownToHtml(md), [md])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="mdh-input" className="text-sm font-medium text-zinc-200">
            Markdown
          </label>
          <textarea
            id="mdh-input"
            data-testid="mdh-input"
            value={md}
            maxLength={MAX_MD_CHARS}
            onChange={(e) => setMd(e.target.value)}
            spellCheck={false}
            className="min-h-[380px] w-full flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Output view" className="flex gap-1">
              {['preview', 'html'].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  data-testid={`mdh-view-${v}`}
                  onClick={() => setView(v)}
                  className={`min-h-[44px] rounded-md px-3 text-sm sm:min-h-[36px] ${
                    view === v ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  {v === 'preview' ? 'Preview' : 'HTML'}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <CopyButton text={html} label="Copy HTML" testid="mdh-copy" />
            </div>
          </div>
          {view === 'html' ? (
            <textarea
              data-testid="mdh-html"
              value={html}
              readOnly
              className="min-h-[380px] w-full flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
          ) : (
            <div
              data-testid="mdh-preview"
              className="prose-preview min-h-[380px] flex-1 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-[14px] leading-relaxed text-zinc-200"
              // Safe: markdownToHtml escapes every character of input before adding its own tags.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
      <style>{`
        .prose-preview h1,.prose-preview h2,.prose-preview h3{margin:0.8em 0 0.4em;font-weight:600;color:#fafafa}
        .prose-preview h1{font-size:1.5em}.prose-preview h2{font-size:1.25em}.prose-preview h3{font-size:1.1em}
        .prose-preview p,.prose-preview ul,.prose-preview ol,.prose-preview blockquote,.prose-preview table,.prose-preview pre{margin:0.6em 0}
        .prose-preview ul,.prose-preview ol{padding-left:1.4em}.prose-preview ul{list-style:disc}.prose-preview ol{list-style:decimal}
        .prose-preview a{color:#7dd3fc;text-decoration:underline}
        .prose-preview code{background:#27272a;border-radius:4px;padding:1px 5px;font-size:0.9em}
        .prose-preview pre{background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:10px 12px;overflow-x:auto}
        .prose-preview pre code{background:none;padding:0}
        .prose-preview blockquote{border-left:3px solid #3f3f46;padding-left:12px;color:#a1a1aa}
        .prose-preview table{border-collapse:collapse}.prose-preview th,.prose-preview td{border:1px solid #3f3f46;padding:4px 10px}
        .prose-preview hr{border:none;border-top:1px solid #3f3f46;margin:1em 0}
        .prose-preview img{max-width:100%}
      `}</style>
      <p className="text-xs text-zinc-500">
        Headings, lists, quotes, fenced code, tables, links and images. Converted in your browser — nothing leaves this page.
      </p>
    </ToolShell>
  )
}
