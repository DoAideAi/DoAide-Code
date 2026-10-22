// The embed-widget generator (/tools/embed-code): paste code, pick the tool the embed's button
// opens, and copy the iframe snippet. Everything runs in the page; the code only ever lives in
// the snippet's #fragment.

import { useState } from 'react'
import { LANGUAGES } from './codeTools.js'
import { EMBED_ACTIONS, MAX_EMBED_CODE, embedSnippet, embedUrl } from './embedTool.js'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'embed-code')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

const PLACEHOLDER = `def greet(name):
    return f"Hello, {name}!"`

export default function EmbedPage() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [action, setAction] = useState(EMBED_ACTIONS[0].slug)

  const lang = language === LANGUAGES[0] ? '' : language
  const tooLong = code.length > MAX_EMBED_CODE
  const ready = code.trim() && !tooLong
  const snippet = ready ? embedSnippet(code, lang, action) : ''

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="embed-code" className="text-xs font-medium text-zinc-400">
            Your code
          </label>
          <textarea
            id="embed-code"
            data-testid="embed-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={8}
            placeholder={PLACEHOLDER}
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none ${MONO}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="embed-language">
            Language
          </label>
          <select
            id="embed-language"
            data-testid="embed-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <label htmlFor="embed-action" className="text-xs text-zinc-500">
            Button opens
          </label>
          <select
            id="embed-action"
            data-testid="embed-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
          >
            {EMBED_ACTIONS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {code.length.toLocaleString()} / {MAX_EMBED_CODE.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          The snippet carries your code inside its link; nothing is uploaded or stored. Don't embed passwords or API
          keys.
        </p>
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's too much code for an embed: keep it under {MAX_EMBED_CODE.toLocaleString()} characters.
        </p>
      )}

      {ready && (
        <>
          <section aria-label="Embed snippet" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">Paste this into your blog or docs</h2>
              <CopyButton text={snippet} label="Copy snippet" testid="embed-copy" />
            </div>
            <pre data-testid="embed-snippet" className={`overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-shade/40 p-3 text-zinc-300 ${MONO}`}>
              {snippet}
            </pre>
            <p className="text-xs text-zinc-500">
              Works anywhere raw HTML is allowed: WordPress, Ghost, Notion (embed block), Docusaurus, plain HTML.
            </p>
          </section>
          <section aria-label="Preview" className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-200">Preview</h2>
            <iframe
              data-testid="embed-preview"
              src={embedUrl(code, lang, action)}
              title="Embed preview"
              loading="lazy"
              className="w-full max-w-[760px] rounded-xl border border-zinc-800"
              style={{ height: snippet.match(/height:(\d+)px/)?.[1] + 'px' }}
            />
          </section>
        </>
      )}
    </ToolShell>
  )
}
