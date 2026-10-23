// The API response mocker page (/tools/api-mocker): define endpoints (method, path, status,
// delay, body), save them and get a base URL that serves them to any app. ?m=<id> reopens a
// saved mock for editing; saving again makes a new URL, so links already shared keep working.

import { useEffect, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import {
  MAX_DELAY_MS,
  MAX_ENDPOINTS,
  METHODS,
  STARTER,
  blankEndpoint,
  createMock,
  curlFor,
  duplicateOf,
  endpointProblem,
  fetchMock,
  fetchSnippetFor,
  jsonWarning,
  samplePath,
} from './mockApiTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'api-mocker')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const STATUSES = [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 503]

function TryIt({ url, method }) {
  const [result, setResult] = useState(null)
  const run = async () => {
    setResult({ loading: true })
    const started = performance.now()
    try {
      const resp = await fetch(url, { method: method === 'ANY' ? 'GET' : method })
      const text = await resp.text()
      setResult({ status: resp.status, text, ms: Math.round(performance.now() - started) })
    } catch (e) {
      setResult({ error: e.message })
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" className={`${BUTTON} self-start`} onClick={run}>
        {result?.loading ? 'Calling…' : 'Try it'}
      </button>
      {result && !result.loading && (
        <pre data-testid="mock-try-result" className="max-h-48 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-zinc-300">
          {result.error ? `Request failed: ${result.error}` : `HTTP ${result.status} · ${result.ms} ms\n\n${result.text}`}
        </pre>
      )}
    </div>
  )
}

export default function MockApiPage() {
  const [name, setName] = useState('My mock API')
  const [endpoints, setEndpoints] = useState(STARTER)
  const [saved, setSaved] = useState(null) // { id, url } of the mock matching the editor, if any
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('m')
    if (!id) return
    fetchMock(id)
      .then((mock) => {
        setName(mock.name || 'My mock API')
        setEndpoints(mock.endpoints)
        setSaved({ id: mock.id, url: `${window.location.origin}/api/mock/${mock.id}` })
      })
      .catch((e) => setError(e.message))
  }, [])

  const edit = (i, patch) => {
    setEndpoints((eps) => eps.map((ep, j) => (j === i ? { ...ep, ...patch } : ep)))
    setSaved(null)
  }
  const problems = endpoints.map((ep, i) => endpointProblem(ep) ?? (duplicateOf(endpoints, i) >= 0 ? 'Same method and path as an earlier endpoint.' : null))
  const blocked = problems.some(Boolean) || endpoints.length === 0

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const made = await createMock(name.trim(), endpoints)
      setSaved(made)
      window.history.replaceState(null, '', `?m=${made.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Mock name
        <input data-testid="mock-name" value={name} maxLength={100} onChange={(e) => {
          setName(e.target.value)
          setSaved(null)
        }} className={INPUT} />
      </label>

      <ol className="flex flex-col gap-3">
        {endpoints.map((ep, i) => (
          <li key={i} data-testid={`mock-endpoint-${i}`} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Method" data-testid={`mock-method-${i}`} value={ep.method} onChange={(e) => edit(i, { method: e.target.value })} className={INPUT}>
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                aria-label="Path"
                data-testid={`mock-path-${i}`}
                value={ep.path}
                onChange={(e) => edit(i, { path: e.target.value })}
                placeholder="/users/:id"
                className={`${INPUT} min-w-0 flex-1`}
              />
              <input
                aria-label="Status code"
                data-testid={`mock-status-${i}`}
                list="mock-statuses"
                value={ep.status}
                onChange={(e) => edit(i, { status: e.target.value })}
                className={`${INPUT} w-20`}
              />
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                Delay
                <input
                  type="number"
                  aria-label="Delay in milliseconds"
                  min={0}
                  max={MAX_DELAY_MS}
                  step={100}
                  value={ep.delay_ms}
                  onChange={(e) => edit(i, { delay_ms: e.target.value })}
                  className={`${INPUT} w-24`}
                />
                ms
              </label>
              <select aria-label="Content type" value={ep.content_type} onChange={(e) => edit(i, { content_type: e.target.value })} className={INPUT}>
                <option>application/json</option>
                <option>text/plain</option>
                <option>text/html</option>
                <option>application/xml</option>
              </select>
              <button
                type="button"
                aria-label={`Remove endpoint ${i + 1}`}
                className={BUTTON}
                disabled={endpoints.length === 1}
                onClick={() => {
                  setEndpoints((eps) => eps.filter((_, j) => j !== i))
                  setSaved(null)
                }}
              >
                ✕
              </button>
            </div>
            <textarea
              aria-label="Response body"
              data-testid={`mock-body-${i}`}
              value={ep.body}
              onChange={(e) => edit(i, { body: e.target.value })}
              rows={Math.min(12, Math.max(3, ep.body.split('\n').length))}
              spellCheck={false}
              className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[13px] text-zinc-200"
            />
            {problems[i] && (
              <p role="alert" className="text-xs text-rose-300">
                {problems[i]}
              </p>
            )}
            {!problems[i] && jsonWarning(ep) && <p className="text-xs text-amber-300">{jsonWarning(ep)}</p>}
            {saved && !problems[i] && (
              <div className="flex flex-col gap-2 border-t border-zinc-800 pt-2">
                <code data-testid={`mock-url-${i}`} className="break-all text-xs text-emerald-300">
                  {ep.method} {saved.url + samplePath(ep.path)}
                </code>
                <div className="flex flex-wrap gap-1">
                  <CopyButton text={saved.url + samplePath(ep.path)} label="Copy URL" />
                  <CopyButton text={curlFor(saved.url, ep)} label="Copy curl" />
                  <CopyButton text={fetchSnippetFor(saved.url, ep)} label="Copy fetch()" />
                </div>
                <TryIt url={saved.url + samplePath(ep.path)} method={ep.method} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <datalist id="mock-statuses">
        {STATUSES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="mock-add"
          className={BUTTON}
          disabled={endpoints.length >= MAX_ENDPOINTS}
          onClick={() => {
            setEndpoints((eps) => [...eps, blankEndpoint()])
            setSaved(null)
          }}
        >
          + Add endpoint
        </button>
        <button
          type="button"
          data-testid="mock-save"
          disabled={blocked || busy || Boolean(saved)}
          onClick={save}
          className={`${BUTTON} bg-sky-700/40 text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {busy ? 'Saving…' : saved ? 'Saved' : 'Create mock URL'}
        </button>
        <span className="text-xs text-zinc-500">
          Use <code>:name</code> in a path to match any value, and <code>{'{{name}}'}</code> in the body to echo it back.
        </span>
      </div>
      {error && (
        <p role="alert" data-testid="mock-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <section data-testid="mock-saved" aria-label="Your mock API" className="flex flex-col gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4 text-sm">
          <h2 className="font-medium text-zinc-100">Your mock API is live</h2>
          <code data-testid="mock-base-url" className="break-all text-emerald-300">
            {saved.url}
          </code>
          <div className="flex flex-wrap gap-1">
            <CopyButton text={saved.url} label="Copy base URL" testid="mock-copy-base" />
            <CopyButton text={`${window.location.origin}/tools/api-mocker?m=${saved.id}`} label="Copy edit link" />
          </div>
          <p className="text-xs text-zinc-400">
            Works from any origin (CORS is open). Saved mocks never change: edit and save again for a new URL.
          </p>
        </section>
      )}
    </ToolShell>
  )
}
