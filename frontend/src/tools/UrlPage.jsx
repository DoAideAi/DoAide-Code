// The URL encoder/decoder (/tools/url-encoder): two panes, encoding as you type — component
// mode for query values, URL mode to keep a full address's structure. Runs in the page.

import { useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { MAX_URL_CHARS, decodeUrl, encodeUrl } from './urlTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'url-encoder')

const PANE =
  'min-h-[140px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none'

export default function UrlPage() {
  const [plain, setPlain] = useState('')
  const [encoded, setEncoded] = useState('')
  const [mode, setMode] = useState('component')
  const [error, setError] = useState(null)

  const encode = (value = plain, m = mode) => {
    setError(null)
    setEncoded(value ? encodeUrl(value, m) : '')
  }
  const decode = (value = encoded) => {
    if (!value.trim()) {
      setPlain('')
      setError(null)
      return
    }
    const res = decodeUrl(value)
    setError(res.error ?? null)
    if (!res.error) setPlain(res.out)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="url-plain" className="text-sm font-medium text-zinc-200">
              Plain text
            </label>
            <div className="ml-auto">
              <CopyButton text={plain} testid="url-copy-plain" />
            </div>
          </div>
          <textarea
            id="url-plain"
            data-testid="url-plain"
            value={plain}
            maxLength={MAX_URL_CHARS}
            onChange={(e) => {
              setPlain(e.target.value)
              encode(e.target.value)
            }}
            placeholder="name=Jo & co?"
            spellCheck={false}
            className={PANE}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="url-encoded" className="text-sm font-medium text-zinc-200">
              Percent-encoded
            </label>
            <div className="ml-auto">
              <CopyButton text={encoded} testid="url-copy-encoded" />
            </div>
          </div>
          <textarea
            id="url-encoded"
            data-testid="url-encoded"
            value={encoded}
            maxLength={MAX_URL_CHARS}
            onChange={(e) => {
              setEncoded(e.target.value)
              decode(e.target.value)
            }}
            placeholder="name%3DJo%20%26%20co%3F"
            spellCheck={false}
            className={PANE}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Mode
          <select
            data-testid="url-mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value)
              if (plain) encode(plain, e.target.value)
            }}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]"
          >
            <option value="component">Component — encode everything reserved (query values)</option>
            <option value="url">Whole URL — keep :/?#&amp;= structure</option>
          </select>
        </label>
        <p className="text-xs text-zinc-500">Decoding also reads + as a space. Nothing leaves this page.</p>
      </div>

      {error && (
        <p role="alert" data-testid="url-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </ToolShell>
  )
}
