// The CSP builder page (/tools/csp-generator): build a Content-Security-Policy directive by
// directive from a preset, or paste an existing policy to audit it, and copy it for your server.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DIRECTIVES, KEYWORDS, META_IGNORED, PRESETS, auditPolicy, buildPolicy, hashSource, makeNonce, parsePolicy, snippets } from './cspTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'csp-generator')
const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-[16px] text-zinc-200 sm:min-h-[36px] sm:text-sm'
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'
const LEVEL = {
  high: 'border-rose-900/60 bg-rose-950/20 text-rose-200',
  medium: 'border-amber-900/60 bg-amber-950/20 text-amber-200',
  info: 'border-zinc-800 text-zinc-400',
}

const clone = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...v]]))

export default function CspPage() {
  const [tab, setTab] = useState('build')
  const [policy, setPolicy] = useState(() => clone(PRESETS.website.policy))
  const [upgrade, setUpgrade] = useState(true)
  const [reportUri, setReportUri] = useState('')
  const [reportOnly, setReportOnly] = useState(false)
  const [nonce, setNonce] = useState('')
  const [inline, setInline] = useState('')
  const [hash, setHash] = useState('')
  const [pasted, setPasted] = useState("default-src 'self'; script-src 'self' 'unsafe-inline' https:; img-src *")

  const state = { policy, upgrade, reportUri }
  const value = buildPolicy(state, { nonce })
  const metaValue = buildPolicy(state, { nonce, forMeta: true })
  const outputs = snippets(value, { reportOnly, metaValue })
  const findings = auditPolicy(tab === 'audit' ? parsePolicy(pasted) : state)
  const droppedInMeta = META_IGNORED.filter((d) => policy[d]?.length || (d === 'report-uri' && reportUri.trim()))

  const loadPreset = (key) => {
    setPolicy(clone(PRESETS[key].policy))
    setUpgrade(PRESETS[key].upgrade)
  }
  const toggleDirective = (name) =>
    setPolicy((p) => {
      const next = { ...p }
      if (next[name]) delete next[name]
      else next[name] = ["'self'"]
      return next
    })
  const toggleKeyword = (name, kw) =>
    setPolicy((p) => {
      const cur = p[name] ?? []
      return { ...p, [name]: cur.includes(kw) ? cur.filter((s) => s !== kw) : [...cur, kw] }
    })
  const setHosts = (name, text) =>
    setPolicy((p) => ({ ...p, [name]: [...(p[name] ?? []).filter((s) => KEYWORDS.includes(s)), ...text.split(/\s+/).filter(Boolean)] }))
  const editPasted = () => {
    const parsed = parsePolicy(pasted)
    setPolicy(parsed.policy)
    setUpgrade(parsed.upgrade)
    setReportUri(parsed.reportUri)
    setTab('build')
  }
  const computeHash = async () => {
    try {
      setHash(await hashSource(inline))
    } catch (e) {
      setHash(e.message)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div role="tablist" className="flex gap-1">
        {[
          ['build', 'Build a policy'],
          ['audit', 'Audit an existing policy'],
        ].map(([t, label]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} data-testid={`csp-tab-${t}`} className={`${BUTTON} ${tab === t ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'audit' ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Paste a Content-Security-Policy header or value
            <textarea data-testid="csp-paste" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} spellCheck={false} className={`w-full rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 ${MONO}`} />
          </label>
          <ul data-testid="csp-findings" className="flex flex-col gap-1">
            {findings.map((f) => (
              <li key={f.text} className={`rounded border px-3 py-2 text-sm ${LEVEL[f.level]}`}>
                <span className="mr-2 text-xs uppercase">{f.level}</span>
                {f.text}
              </li>
            ))}
          </ul>
          <div>
            <button type="button" data-testid="csp-edit" className={`${BUTTON} border-sky-800 text-sky-300`} onClick={editPasted}>
              Edit this policy in the builder
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1 text-sm text-zinc-300">
              <span className="mr-1">Start from</span>
              {Object.entries(PRESETS).map(([key, p]) => (
                <button key={key} type="button" data-testid={`csp-preset-${key}`} className={BUTTON} onClick={() => loadPreset(key)}>
                  {p.label}
                </button>
              ))}
            </div>
            {DIRECTIVES.map(([name, hint]) => {
              const on = Boolean(policy[name])
              const hosts = (policy[name] ?? []).filter((s) => !KEYWORDS.includes(s)).join(' ')
              return (
                <fieldset key={name} className={`rounded-lg border p-3 ${on ? 'border-zinc-700' : 'border-zinc-900'}`}>
                  <legend className="px-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" data-testid={`csp-on-${name}`} checked={on} onChange={() => toggleDirective(name)} className="h-4 w-4 accent-sky-500" />
                      <code className="text-sky-300">{name}</code>
                      <span className="text-xs text-zinc-500">{hint}</span>
                    </label>
                  </legend>
                  {on && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1">
                        {KEYWORDS.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            aria-pressed={policy[name].includes(kw)}
                            data-testid={`csp-kw-${name}-${kw.replace(/'/g, '')}`}
                            className={`${BUTTON} font-mono ${policy[name].includes(kw) ? (kw.startsWith("'unsafe") ? 'bg-rose-950/40 text-rose-200' : 'bg-zinc-800 text-zinc-100') : ''}`}
                            onClick={() => toggleKeyword(name, kw)}
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                      <input
                        aria-label={`${name} hosts`}
                        data-testid={`csp-hosts-${name}`}
                        defaultValue={hosts}
                        key={hosts}
                        onBlur={(e) => setHosts(name, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setHosts(name, e.currentTarget.value)}
                        placeholder="https://cdn.example.com *.example.com 'nonce-{NONCE}' 'sha256-…'"
                        spellCheck={false}
                        className={`${INPUT} w-full`}
                      />
                    </div>
                  )}
                </fieldset>
              )
            })}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={upgrade} onChange={(e) => setUpgrade(e.target.checked)} className="h-4 w-4 accent-sky-500" />
                upgrade-insecure-requests
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" data-testid="csp-report-only" checked={reportOnly} onChange={(e) => setReportOnly(e.target.checked)} className="h-4 w-4 accent-sky-500" />
                Report-Only (test without blocking)
              </label>
              <label className="flex items-center gap-2">
                report-uri
                <input value={reportUri} onChange={(e) => setReportUri(e.target.value)} placeholder="/csp-report" className={`${INPUT} w-40`} />
              </label>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {outputs.map(([label, text]) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>{label}</span>
                  <CopyButton text={text} label="Copy" testid={`csp-copy-${label}`} />
                </div>
                <pre data-testid={`csp-out-${label.split(' ').pop().toLowerCase()}`} className={`overflow-auto whitespace-pre-wrap break-all rounded border border-zinc-800 bg-zinc-950 p-2 text-emerald-200 ${MONO}`}>
                  {text}
                </pre>
                {label === 'HTML meta' && droppedInMeta.length > 0 && <p className="text-xs text-zinc-500">Left out of the meta tag (browsers ignore them there): {droppedInMeta.join(', ')}.</p>}
              </div>
            ))}

            <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300">
              <h2 className="font-medium text-zinc-200">Nonces and hashes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" data-testid="csp-nonce" className={BUTTON} onClick={() => setNonce(makeNonce())}>
                  Generate a nonce
                </button>
                {nonce && <code className="break-all text-emerald-300">{nonce}</code>}
              </div>
              <p className="text-xs text-zinc-500">
                Use a fresh nonce on every response, in the header and on each tag: &lt;script nonce="…"&gt;. {'{NONCE}'} in the policy is replaced with the one generated here.
              </p>
              <label className="flex flex-col gap-1">
                Inline script or style body, exactly as between the tags
                <textarea value={inline} onChange={(e) => setInline(e.target.value)} rows={3} spellCheck={false} className={`w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 ${MONO}`} />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={BUTTON} disabled={!inline} onClick={computeHash}>
                  Compute SHA-256 source
                </button>
                {hash && (
                  <>
                    <code className="break-all text-emerald-300">{hash}</code>
                    <CopyButton text={hash} label="Copy" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'build' && (
        <ul data-testid="csp-findings" className="flex flex-col gap-1">
          {findings
            .filter((f) => f.level !== 'info')
            .map((f) => (
              <li key={f.text} className={`rounded border px-3 py-2 text-xs ${LEVEL[f.level]}`}>
                {f.text}
              </li>
            ))}
        </ul>
      )}
    </ToolShell>
  )
}
