// The JWT decoder (/tools/jwt-decoder): paste a token, see the decoded header and payload, the
// registered claims in plain words, and whether it is expired. Decoding happens in the page and
// the token is never stored or uploaded — tokens are credentials, so no snippet history here.

import { useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { MAX_JWT_CHARS, decodeJwt, describeClaims, expiryStatus } from './jwtTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'jwt-decoder')

const STATUS_STYLE = {
  expired: 'border-red-900/60 bg-red-950/30 text-red-300',
  'not-yet': 'border-amber-900/60 bg-amber-950/30 text-amber-300',
  valid: 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300',
  'no-exp': 'border-amber-900/60 bg-amber-950/30 text-amber-300',
}

function JsonCard({ title, value, testid }) {
  const text = JSON.stringify(value, null, 2)
  return (
    <section aria-label={title} className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
        <div className="ml-auto">
          <CopyButton text={text} testid={`${testid}-copy`} />
        </div>
      </div>
      <pre data-testid={testid} className="overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-zinc-200">
        {text}
      </pre>
    </section>
  )
}

export default function JwtPage() {
  const [token, setToken] = useState('')
  const tooLong = token.length > MAX_JWT_CHARS
  const decoded = token.trim() && !tooLong ? decodeJwt(token) : null
  const status = decoded && !decoded.error ? expiryStatus(decoded.payload) : null
  const claims = decoded && !decoded.error ? describeClaims(decoded.payload) : []

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="jwt-in" className="sr-only">
          Your JWT
        </label>
        <textarea
          id="jwt-in"
          data-testid="jwt-in"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste a JWT (eyJhbGciOi…) — a leading “Bearer ” is fine"
          rows={4}
          spellCheck={false}
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-500">
            Decoded as you type. The token never leaves this page and is never stored. Signatures are not verified.
          </p>
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {token.length.toLocaleString()} / {MAX_JWT_CHARS.toLocaleString()}
          </span>
        </div>
      </div>

      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That is longer than any real JWT — trim it to {MAX_JWT_CHARS.toLocaleString()} characters.
        </p>
      )}
      {decoded?.error && (
        <p role="alert" data-testid="jwt-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {decoded.error}
        </p>
      )}

      {status && (
        <p data-testid="jwt-status" className={`rounded-lg border px-3 py-2 text-sm ${STATUS_STYLE[status.state]}`}>
          {status.message}
        </p>
      )}

      {decoded && !decoded.error && (
        <>
          {claims.length > 0 && (
            <section aria-label="Claims" className="rounded-lg border border-zinc-800 p-4">
              <h2 className="mb-2 text-sm font-medium text-zinc-200">Registered claims</h2>
              <dl data-testid="jwt-claims" className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                {claims.map((c) => (
                  <div key={c.name} className="contents">
                    <dt className="text-zinc-400">
                      {c.label} <span className="font-mono text-xs text-zinc-600">({c.name})</span>
                    </dt>
                    <dd className="break-all text-zinc-200">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <div className="flex flex-col gap-4 lg:flex-row">
            <JsonCard title="Header" value={decoded.header} testid="jwt-header" />
            <JsonCard title="Payload" value={decoded.payload} testid="jwt-payload" />
          </div>
          <section aria-label="Signature" className="rounded-lg border border-zinc-800 p-4">
            <h2 className="mb-1 text-sm font-medium text-zinc-200">Signature</h2>
            <p className="break-all font-mono text-[13px] text-zinc-400">{decoded.signature || '(empty)'}</p>
            <p className="mt-2 text-xs text-zinc-500">
              This tool decodes, it does not verify: checking the signature needs the signing key and belongs on your
              server.
            </p>
          </section>
        </>
      )}
    </ToolShell>
  )
}
