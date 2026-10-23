// The bcrypt page (/tools/bcrypt-generator): hash a password at a chosen cost and time it, or
// check a password against an existing hash. Everything runs in the page.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MAX_COST, MIN_COST, byteLength, hashPassword, parseHash, verifyPassword } from './bcryptTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'bcrypt-generator')
const INPUT = 'min-h-[44px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-[16px] text-zinc-200 sm:min-h-[36px] sm:text-sm'
const PRIMARY = `${BUTTON} border-sky-800 text-sky-300 disabled:opacity-50`

export default function BcryptPage() {
  const [password, setPassword] = useState('')
  const [cost, setCost] = useState(10)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([]) // newest first: { hash, ms, cost }

  const [checkPw, setCheckPw] = useState('')
  const [checkHash, setCheckHash] = useState('')
  const [checking, setChecking] = useState(false)
  const [verdict, setVerdict] = useState(null) // { match } | { error }

  const bytes = byteLength(password)
  const parsed = checkHash.trim() ? parseHash(checkHash) : null

  const generate = async () => {
    setBusy(true)
    try {
      const r = await hashPassword(password, cost)
      setResults((rs) => [{ ...r, cost }, ...rs].slice(0, 5))
    } finally {
      setBusy(false)
    }
  }
  const verify = async () => {
    setChecking(true)
    try {
      setVerdict({ match: await verifyPassword(checkPw, checkHash) })
    } catch (e) {
      setVerdict({ error: e.message })
    } finally {
      setChecking(false)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-300">
          <h2 className="font-medium text-zinc-200">Generate a hash</h2>
          <label className="flex flex-col gap-1">
            Password
            <input data-testid="bcrypt-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" spellCheck={false} className={INPUT} />
          </label>
          {bytes > 72 && <p className="text-xs text-amber-200">{bytes} bytes — bcrypt only uses the first 72, so anything after that is ignored.</p>}
          <label className="flex flex-col gap-1">
            <span>
              Cost factor <span data-testid="bcrypt-cost" className="font-mono text-zinc-100">{cost}</span>{' '}
              <span className="text-zinc-500">({(2 ** cost).toLocaleString()} rounds)</span>
            </span>
            <input type="range" min={MIN_COST} max={MAX_COST} value={cost} onChange={(e) => setCost(Number(e.target.value))} aria-label="Cost factor" className="accent-sky-500" />
          </label>
          {cost > 13 && <p className="text-xs text-amber-200">Cost {cost} can take several seconds per hash in a browser.</p>}
          <div>
            <button type="button" data-testid="bcrypt-generate" className={PRIMARY} disabled={busy} onClick={generate}>
              {busy ? 'Hashing…' : 'Generate hash'}
            </button>
          </div>
          <ul data-testid="bcrypt-results" className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.hash} className="flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-950 p-2">
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-emerald-200">{r.hash}</code>
                  <CopyButton text={r.hash} label="Copy" />
                </div>
                <span className="text-xs text-zinc-500">
                  cost {r.cost} · {r.ms} ms
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">Aim for about 250 ms on your server — usually cost 10–12. Each step doubles the time. Same password, new salt, new hash every time.</p>
        </section>

        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-300">
          <h2 className="font-medium text-zinc-200">Check a password against a hash</h2>
          <label className="flex flex-col gap-1">
            Password
            <input data-testid="bcrypt-check-password" type="text" value={checkPw} onChange={(e) => setCheckPw(e.target.value)} autoComplete="off" spellCheck={false} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            Hash
            <input
              data-testid="bcrypt-check-hash"
              value={checkHash}
              onChange={(e) => {
                setCheckHash(e.target.value)
                setVerdict(null)
              }}
              placeholder="$2b$10$…"
              spellCheck={false}
              className={`${INPUT} ${checkHash.trim() && !parsed ? 'border-rose-800' : ''}`}
            />
          </label>
          {parsed && (
            <dl data-testid="bcrypt-parsed" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-zinc-500">Version</dt>
              <dd className="font-mono">{parsed.version}</dd>
              <dt className="text-zinc-500">Cost</dt>
              <dd className="font-mono">{parsed.cost}</dd>
              <dt className="text-zinc-500">Salt</dt>
              <dd className="break-all font-mono">{parsed.salt}</dd>
              <dt className="text-zinc-500">Checksum</dt>
              <dd className="break-all font-mono">{parsed.checksum}</dd>
            </dl>
          )}
          <div>
            <button type="button" data-testid="bcrypt-verify" className={PRIMARY} disabled={checking || !checkHash.trim()} onClick={verify}>
              {checking ? 'Checking…' : 'Check'}
            </button>
          </div>
          {verdict && (
            <p
              role="status"
              data-testid="bcrypt-verdict"
              className={`rounded border px-3 py-2 ${verdict.match ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' : 'border-rose-900/60 bg-rose-950/20 text-rose-200'}`}
            >
              {verdict.error ?? (verdict.match ? '✓ Match — the password is correct' : '✕ No match')}
            </p>
          )}
        </section>
      </div>
    </ToolShell>
  )
}
