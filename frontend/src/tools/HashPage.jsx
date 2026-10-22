// The hash generator (/tools/hash-generator): type text, get its SHA-1/256/384/512 hex digests
// live via WebCrypto. Nothing leaves the page.

import { useEffect, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { HASH_ALGOS, MAX_HASH_CHARS, hashAll } from './hashTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'hash-generator')

export default function HashPage() {
  const [text, setText] = useState('')
  const [hashes, setHashes] = useState(null)
  const tooLong = text.length > MAX_HASH_CHARS

  useEffect(() => {
    if (tooLong) return
    let live = true
    hashAll(text).then((h) => live && setHashes(h))
    return () => {
      live = false
    }
  }, [text, tooLong])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="hash-in" className="sr-only">
          Text to hash
        </label>
        <textarea
          id="hash-in"
          data-testid="hash-in"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text — the digests update as you type"
          rows={5}
          spellCheck={false}
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-500">Hashed with WebCrypto in this page — nothing is uploaded.</p>
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {text.length.toLocaleString()} / {MAX_HASH_CHARS.toLocaleString()}
          </span>
        </div>
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          Too long to hash comfortably in the page — trim to {MAX_HASH_CHARS.toLocaleString()} characters.
        </p>
      )}

      {hashes && !tooLong && (
        <section aria-label="Digests" className="flex flex-col gap-3">
          {HASH_ALGOS.map((algo) => (
            <div key={algo} className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 p-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-zinc-200">{algo}</h2>
                <div className="ml-auto">
                  <CopyButton text={hashes[algo]} testid={`hash-copy-${algo}`} />
                </div>
              </div>
              <code data-testid={`hash-${algo}`} className="break-all font-mono text-[13px] leading-relaxed text-zinc-300">
                {hashes[algo]}
              </code>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs text-zinc-500">
        No MD5 on purpose: browsers don't ship it in WebCrypto and it has been broken for twenty years — use SHA-256
        where a hash matters.
      </p>
    </ToolShell>
  )
}
