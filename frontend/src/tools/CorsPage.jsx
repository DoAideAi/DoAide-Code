// The CORS tester page (/tools/cors-tester): describe a request, paste the server's response
// headers, and see step by step whether the browser lets it through — then copy a fixed config.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { checkCors, corsConfigs } from './corsTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'cors-tester')
const INPUT = 'min-h-[44px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-[16px] text-zinc-200 sm:min-h-[36px] sm:text-sm'
const AREA = 'w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-2 font-mono text-[16px] leading-relaxed text-zinc-200 sm:text-[13px]'
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const words = (s) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)

export default function CorsPage() {
  const [origin, setOrigin] = useState('http://localhost:5173')
  const [url, setUrl] = useState('https://api.example.com/v1/orders')
  const [method, setMethod] = useState('POST')
  const [reqHeaders, setReqHeaders] = useState('Content-Type: application/json\nAuthorization: Bearer …')
  const [credentials, setCredentials] = useState(false)
  const [preflightText, setPreflightText] = useState('HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: http://localhost:5173\nAccess-Control-Allow-Methods: GET, POST\nAccess-Control-Allow-Headers: Content-Type')
  const [responseText, setResponseText] = useState('HTTP/1.1 201 Created\nContent-Type: application/json\nAccess-Control-Allow-Origin: http://localhost:5173')

  const [genOrigins, setGenOrigins] = useState('http://localhost:5173 https://app.example.com')
  const [genMethods, setGenMethods] = useState('GET, POST, PUT, PATCH, DELETE')
  const [genHeaders, setGenHeaders] = useState('Content-Type, Authorization')
  const [genExpose, setGenExpose] = useState('')
  const [genCreds, setGenCreds] = useState(false)
  const [maxAge, setMaxAge] = useState(600)
  const [server, setServer] = useState('nginx')

  const result = checkCors({ origin, url, method, requestHeaders: reqHeaders, credentials, responseText, preflightText })
  const configs = corsConfigs({ origins: words(genOrigins), methods: words(genMethods).map((m) => m.toUpperCase()), headers: words(genHeaders), expose: words(genExpose), credentials: genCreds, maxAge })
  const config = configs.find(([label]) => label === server)?.[1] ?? ''

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3 text-sm text-zinc-300">
          <h2 className="font-medium text-zinc-200">The request</h2>
          <label className="flex flex-col gap-1">
            Page origin (where your frontend runs)
            <input data-testid="cors-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} spellCheck={false} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            Request URL
            <input data-testid="cors-url" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} className={INPUT} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Method
              <select data-testid="cors-method" value={method} onChange={(e) => setMethod(e.target.value)} className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 sm:min-h-[36px]">
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" data-testid="cors-creds" checked={credentials} onChange={(e) => setCredentials(e.target.checked)} className="h-4 w-4 accent-sky-500" />
              Credentials (cookies, credentials: 'include')
            </label>
          </div>
          <label className="flex flex-col gap-1">
            Request headers your code sets, one per line
            <textarea data-testid="cors-req-headers" value={reqHeaders} onChange={(e) => setReqHeaders(e.target.value)} rows={3} spellCheck={false} className={AREA} />
          </label>
          <label className="flex flex-col gap-1">
            Preflight (OPTIONS) response headers — leave empty to reuse the response below
            <textarea data-testid="cors-preflight" value={preflightText} onChange={(e) => setPreflightText(e.target.value)} rows={5} spellCheck={false} className={AREA} />
          </label>
          <label className="flex flex-col gap-1">
            Response headers — from DevTools → Network or curl -i
            <textarea data-testid="cors-response" value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={5} spellCheck={false} className={AREA} />
          </label>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {result.error ? (
            <p role="alert" className="rounded border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
              {result.error}
            </p>
          ) : (
            <>
              <p
                data-testid="cors-verdict"
                className={`rounded-lg border p-4 text-lg font-medium ${result.allowed ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' : 'border-rose-900/60 bg-rose-950/20 text-rose-200'}`}
              >
                {result.allowed ? '✓ Allowed — the browser will hand the response to your code' : '✕ Blocked by CORS policy'}
              </p>
              {result.crossOrigin && (
                <p data-testid="cors-preflight-reason" className="text-sm text-zinc-300">
                  {result.preflight.length ? `A preflight OPTIONS request is sent first because ${result.preflight.join('; ')}.` : 'Simple request — no preflight is sent.'}
                </p>
              )}
              <ol data-testid="cors-steps" className="flex flex-col gap-1">
                {result.steps.map((s) => (
                  <li key={s.text} className={`text-sm ${s.ok ? 'text-zinc-300' : 'text-rose-300'}`}>
                    <span aria-hidden="true">{s.ok ? '✓ ' : '✕ '}</span>
                    {s.text}
                  </li>
                ))}
              </ol>
              {result.notes.map((n) => (
                <p key={n} className="rounded border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                  {n}
                </p>
              ))}
              {!result.allowed && <p className="text-xs text-zinc-500">The fix is on the server that answers {url} — the frontend can’t opt out of CORS. Generate a config below.</p>}
            </>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300">
            <h2 className="font-medium text-zinc-200">Generate CORS config</h2>
            <label className="flex flex-col gap-1">
              Allowed origins (space or comma separated, * for any)
              <input data-testid="cors-gen-origins" value={genOrigins} onChange={(e) => setGenOrigins(e.target.value)} spellCheck={false} className={INPUT} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Methods
                <input value={genMethods} onChange={(e) => setGenMethods(e.target.value)} spellCheck={false} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1">
                Allowed headers
                <input value={genHeaders} onChange={(e) => setGenHeaders(e.target.value)} spellCheck={false} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1">
                Exposed headers
                <input value={genExpose} onChange={(e) => setGenExpose(e.target.value)} placeholder="X-Total-Count" spellCheck={false} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1">
                Max-Age (seconds)
                <input type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(Math.max(0, Number(e.target.value) || 0))} className={INPUT} />
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={genCreds} onChange={(e) => setGenCreds(e.target.checked)} className="h-4 w-4 accent-sky-500" />
              Allow credentials (cookies)
            </label>
            {genCreds && words(genOrigins).includes('*') && (
              <p className="text-xs text-amber-200">With credentials, * can’t be sent — the configs echo the caller’s origin instead, which trusts every site. List your origins if you can.</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {configs.map(([label]) => (
                  <button key={label} type="button" data-testid={`cors-server-${label}`} aria-pressed={server === label} className={`${BUTTON} ${server === label ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => setServer(label)}>
                    {label}
                  </button>
                ))}
              </div>
              <CopyButton text={config} label="Copy config" />
            </div>
            <pre data-testid="cors-config" className="max-h-96 overflow-auto whitespace-pre rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-emerald-200">
              {config}
            </pre>
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
