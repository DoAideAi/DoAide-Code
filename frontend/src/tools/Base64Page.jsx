// The Base64 encoder/decoder (/tools/base64): two panes, encode or decode on click (or as you
// type into either side). UTF-8 safe, URL-safe variant on a checkbox, forgiving decode. Runs in
// the page; nothing is uploaded.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_B64_CHARS, decodeBase64, encodeBase64 } from './base64Tool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'base64')

const PANE =
  'min-h-[160px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none'

export default function Base64Page() {
  const [text, setText] = useState('')
  const [b64, setB64] = useState('')
  const [urlSafe, setUrlSafe] = useState(false)
  const [error, setError] = useState(null)
  const [binary, setBinary] = useState(false)

  const encode = (value = text, safe = urlSafe) => {
    setError(null)
    setBinary(false)
    setB64(value ? encodeBase64(value, { urlSafe: safe }) : '')
  }
  const decode = (value = b64) => {
    if (!value.trim()) {
      setText('')
      setError(null)
      setBinary(false)
      return
    }
    const res = decodeBase64(value)
    setError(res.error ?? null)
    setBinary(res.binary ?? false)
    if (!res.error) setText(res.out)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="b64-text" className="text-sm font-medium text-zinc-200">
              Text
            </label>
            <div className="ml-auto">
              <CopyButton text={text} testid="b64-copy-text" />
            </div>
          </div>
          <textarea
            id="b64-text"
            data-testid="b64-text"
            value={text}
            maxLength={MAX_B64_CHARS}
            onChange={(e) => {
              setText(e.target.value)
              encode(e.target.value)
            }}
            placeholder="Type or paste text…"
            spellCheck={false}
            className={PANE}
          />
          <button
            type="button"
            data-testid="b64-encode"
            onClick={() => encode()}
            className="min-h-[44px] rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 sm:min-h-[40px]"
          >
            Encode ↓ / →
          </button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="b64-encoded" className="text-sm font-medium text-zinc-200">
              Base64
            </label>
            <div className="ml-auto">
              <CopyButton text={b64} testid="b64-copy-encoded" />
            </div>
          </div>
          <textarea
            id="b64-encoded"
            data-testid="b64-encoded"
            value={b64}
            maxLength={MAX_B64_CHARS}
            onChange={(e) => {
              setB64(e.target.value)
              decode(e.target.value)
            }}
            placeholder="…or paste Base64 here"
            spellCheck={false}
            className={PANE}
          />
          <button type="button" data-testid="b64-decode" onClick={() => decode()} className={`${BUTTON} min-h-[44px] sm:min-h-[40px]`}>
            Decode
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            data-testid="b64-urlsafe"
            checked={urlSafe}
            onChange={(e) => {
              setUrlSafe(e.target.checked)
              if (text) encode(text, e.target.checked)
            }}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
          />
          URL-safe (<span className="font-mono text-xs">-_</span> instead of <span className="font-mono text-xs">+/</span>, no padding)
        </label>
        <p className="text-xs text-zinc-500">UTF-8 safe — emoji and accents round-trip. Nothing leaves this page.</p>
      </div>

      {error && (
        <p role="alert" data-testid="b64-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {binary && (
        <p data-testid="b64-binary" className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          That decodes to binary data, not text — showing the bytes as hex in the left pane.
        </p>
      )}
    </ToolShell>
  )
}
