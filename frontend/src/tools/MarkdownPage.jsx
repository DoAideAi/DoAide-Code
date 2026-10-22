// The Markdown editor (/tools/markdown-editor): type Markdown on the left, see it rendered live
// on the right with the same renderer the chat uses (fenced code blocks get syntax colors).
// Runs in the page; nothing is uploaded.

import { useMemo, useRef, useState } from 'react'
import { CodeBlock, splitFences } from '../components/MessageList.jsx'
import { Markdown } from '../markdown.jsx'
import { copyText } from '../copy.js'
import RecentSnippets from './RecentSnippets.jsx'
import { rememberSnippet } from './snippets.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'markdown-editor')
export const MAX_MARKDOWN_CHARS = 100_000

const PLACEHOLDER = `# My readme

Write **Markdown** here and see it rendered live.

- Lists
- [Links](https://code.doaide.com)
- Code:

\`\`\`js
const greet = (name) => \`hello \${name}\`
\`\`\``

// Words in the document: runs of non-space characters outside code fences.
export function countWords(text) {
  const prose = text.replace(/```[\s\S]*?(```|$)/g, ' ')
  const words = prose.match(/\S+/g)
  return words ? words.length : 0
}

export default function MarkdownPage() {
  const [text, setText] = useState('')
  const [historyAt, setHistoryAt] = useState(0)
  const previewRef = useRef(null)
  const [copiedHtml, setCopiedHtml] = useState(false)

  const tooLong = text.length > MAX_MARKDOWN_CHARS
  const shown = tooLong ? '' : text
  const words = useMemo(() => countWords(shown), [shown])

  const keep = () => {
    if (!text.trim()) return
    rememberSnippet('markdown-editor', text, 'Markdown')
    setHistoryAt(Date.now())
  }

  const download = () => {
    keep()
    const blob = new Blob([text], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyHtml = async () => {
    keep()
    if (previewRef.current && (await copyText(previewRef.current.innerHTML))) {
      setCopiedHtml(true)
      setTimeout(() => setCopiedHtml(false), 1500)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-center gap-2">
        <RecentSnippets scope="markdown-editor" refreshKey={historyAt} onRestore={(s) => setText(s.code)} />
        <span className="text-xs text-zinc-500">
          {words.toLocaleString()} word{words === 1 ? '' : 's'}
        </span>
        <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
          {text.length.toLocaleString()} / {MAX_MARKDOWN_CHARS.toLocaleString()}
        </span>
        <CopyButton text={text} label="Copy Markdown" testid="md-copy" />
        <button type="button" data-testid="md-copy-html" onClick={copyHtml} className={BUTTON}>
          {copiedHtml ? 'Copied' : 'Copy HTML'}
        </button>
        <button type="button" data-testid="md-download" onClick={download} className={BUTTON}>
          Download .md
        </button>
      </div>
      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's {text.length.toLocaleString()} characters; the preview stops at {MAX_MARKDOWN_CHARS.toLocaleString()}.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="md-in" className="text-xs uppercase tracking-wide text-zinc-600">
            Markdown
          </label>
          <textarea
            id="md-in"
            data-testid="md-in"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={keep}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={22}
            placeholder={PLACEHOLDER}
            className="min-h-[300px] w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 font-mono text-[16px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-zinc-600">Preview</span>
          <div
            ref={previewRef}
            data-testid="md-preview"
            aria-live="polite"
            aria-label="Rendered preview"
            className="min-h-[300px] rounded-lg border border-zinc-800 p-4 text-sm leading-relaxed text-zinc-200"
          >
            {shown.trim() ? (
              splitFences(shown).map((part, i) =>
                part.kind === 'code' ? <CodeBlock key={i} value={part.value} lang={part.lang} /> : <Markdown key={i} text={part.value} />,
              )
            ) : (
              <p className="text-zinc-600">The preview appears here as you type.</p>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
