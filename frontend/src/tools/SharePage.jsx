// The snippet-sharing tool (/tools/share-code): paste code, get a short link (/s/<id>) anyone
// can open. The code is stored on the server, so the link stays short whatever the size.

import { useState } from 'react'
import CodeEditor from './CodeEditor.jsx'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { LANGUAGES } from './codeTools.js'
import { MAX_SNIPPET_CHARS, createSnippet } from './snippetShare.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'share-code')

const PLACEHOLDER = `function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}`

export default function SharePage() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [link, setLink] = useState(null)

  const tooLong = code.length > MAX_SNIPPET_CHARS
  const ready = code.trim() && !tooLong && !busy

  const share = async () => {
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      const { url } = await createSnippet(code, language === LANGUAGES[0] ? '' : language, title)
      setLink(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const whatsapp = link
    ? `https://wa.me/?text=${encodeURIComponent(`${title.trim() || 'A code snippet'} — have a look: ${link}`)}`
    : null

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="share-code" className="text-xs font-medium text-zinc-400">
            Your code
          </label>
          <CodeEditor
            id="share-code"
            testid="share-code"
            value={code}
            onChange={(value) => {
              setCode(value)
              setLink(null)
            }}
            onRun={share}
            placeholder={PLACEHOLDER}
            language={language}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="share-language">
            Language
          </label>
          <select
            id="share-language"
            data-testid="share-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="share-title">
            Title (optional)
          </label>
          <input
            id="share-title"
            data-testid="share-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Title (optional)"
            className="min-h-[44px] flex-1 rounded-md border border-zinc-800 bg-surface px-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:min-h-[40px]"
          />
          <span className={`text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {code.length.toLocaleString()} / {MAX_SNIPPET_CHARS.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          The snippet is stored on DoAide's server and anyone with the link can read it, so don't share passwords or
          API keys. Links don't expire.
        </p>
        <button type="button" data-testid="share-run" onClick={share} disabled={!ready} className={`${BUTTON} self-start disabled:opacity-50`}>
          {busy ? 'Creating link…' : 'Create share link'}
        </button>
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's too much code to share: keep it under {MAX_SNIPPET_CHARS.toLocaleString()} characters.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {link && (
        <section aria-label="Share link" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Your link is ready</h2>
          <div className="flex flex-wrap items-center gap-2">
            <a
              data-testid="share-link"
              href={link}
              className="break-all font-mono text-sm text-sky-300 underline hover:text-sky-200"
            >
              {link}
            </a>
            <CopyButton text={link} label="Copy link" testid="share-copy" />
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${BUTTON} flex items-center`}>
              Share on WhatsApp
            </a>
          </div>
        </section>
      )}
    </ToolShell>
  )
}
