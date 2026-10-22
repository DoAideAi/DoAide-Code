// A shared snippet (/s/<id>): read-only, syntax highlighted, with one-click paths into the
// free AI tools. Anyone with the link sees it; nothing needs a sign-in.

import { useEffect, useMemo, useState } from 'react'
import { highlight, TOKEN_CLASS } from '../highlight.js'
import { MAX_SHARED_CODE, SITE, TOOLS, shareLink } from './codeTools.js'
import { fetchSnippet, snippetIdForPath } from './snippetShare.js'
import { BUTTON, CopyButton } from './ToolShell.jsx'
import { UTIL_TOOLS } from './utilTools.js'

const FONT = 'whitespace-pre font-mono text-[16px] leading-relaxed sm:text-[13px]'

// The read-only code view: the same gutter and token colors as the editor, without the textarea.
export function CodeView({ code, language = '' }) {
  const tokens = useMemo(() => highlight(code, language.toLowerCase()), [code, language])
  const lines = code.split('\n').length
  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-800 bg-shade/40">
      <pre aria-hidden className={`select-none py-3 pl-3 pr-2 text-right text-zinc-600 ${FONT}`}>
        {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
      </pre>
      <pre data-testid="snippet-code" tabIndex={0} className={`min-w-0 flex-1 overflow-x-auto py-3 pl-1 pr-3 text-zinc-200 ${FONT}`}>
        {tokens.map((t, i) =>
          t.kind && TOKEN_CLASS[t.kind] ? (
            <span key={i} className={TOKEN_CLASS[t.kind]}>
              {t.text}
            </span>
          ) : (
            t.text
          ),
        )}
      </pre>
    </div>
  )
}

export default function SnippetPage({ path = window.location.pathname }) {
  const id = snippetIdForPath(path)
  const [snippet, setSnippet] = useState(null)
  const [error, setError] = useState(id ? null : 'No snippet lives at this link.')

  useEffect(() => {
    if (!id) return
    let active = true
    fetchSnippet(id)
      .then((s) => active && setSnippet(s))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    document.title = snippet ? `${snippet.title || 'Shared code snippet'} | DoAide Code` : 'Shared code snippet | DoAide Code'
  }, [snippet])

  // The AI tools open with the code pre-filled when it fits in a #fragment link.
  const openIn = (tool) =>
    snippet && snippet.code.length <= MAX_SHARED_CODE
      ? shareLink(tool, snippet.code, snippet.language).replace(SITE, '')
      : `/tools/${tool.slug}`

  const shareTool = UTIL_TOOLS.find((t) => t.slug === 'share-code')
  return (
    <div data-testid="snippet-page" className="h-[100dvh] overflow-y-auto">
      <nav aria-label="Site" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <a href="/" className="text-sm font-medium text-zinc-200 hover:text-zinc-50">
          DoAide Code
        </a>
        <a href="/tools" className="flex min-h-[44px] items-center rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]">
          Free code tools
        </a>
      </nav>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-12 pt-4">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Snippet not found</h1>
            <p role="alert" className="text-sm text-zinc-400">
              {error}
            </p>
            <a href={`/tools/${shareTool.slug}`} className="self-start text-sm text-sky-300 underline hover:text-sky-200">
              Share your own code
            </a>
          </>
        ) : !snippet ? (
          <p className="text-sm text-zinc-500">Loading snippet…</p>
        ) : (
          <>
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                {snippet.title || 'Shared code snippet'}
              </h1>
              <p className="text-xs text-zinc-500">
                {[snippet.language, `${snippet.views.toLocaleString()} view${snippet.views === 1 ? '' : 's'}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </header>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={snippet.code} label="Copy code" testid="snippet-copy" />
              {TOOLS.slice(0, 2).map((tool) => (
                <a key={tool.slug} href={openIn(tool)} className={`${BUTTON} flex items-center`}>
                  {tool.label} this code
                </a>
              ))}
            </div>
            <CodeView code={snippet.code} language={snippet.language} />
            <section className="mt-2 flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-400">
              <h2 className="text-sm font-medium text-zinc-200">Share your own code</h2>
              <p>Paste any snippet and get a short link like this one: free, no sign-up.</p>
              <a href={`/tools/${shareTool.slug}`} className="self-start text-sky-300 underline hover:text-sky-200">
                {shareTool.heading}
              </a>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
