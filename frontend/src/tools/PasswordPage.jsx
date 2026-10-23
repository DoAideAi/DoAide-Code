// The password generator page (/tools/password-generator): length slider, character set toggles,
// exclusions, a strength meter with time-to-crack, bulk generation, and a checker for your own.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DEFAULT_OPTIONS, MAX_LENGTH, MIN_LENGTH, activeSets, crackTime, estimateEntropy, generatePassword, generatedEntropy, strength } from './passwordTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'password-generator')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const SET_LABELS = [
  ['upper', 'Uppercase (A–Z)'],
  ['lower', 'Lowercase (a–z)'],
  ['digits', 'Numbers (0–9)'],
  ['symbols', 'Symbols (!@#…)'],
]
const BULK = [1, 5, 10, 20]

function Meter({ bits, testid }) {
  const s = strength(bits)
  return (
    <div className="flex flex-col gap-1" data-testid={testid}>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent} aria-label="Password strength">
        <div className={`h-full ${s.color} transition-all`} style={{ width: `${Math.max(4, s.percent)}%` }} />
      </div>
      <p className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400">
        <span data-testid={`${testid}-label`} className="font-medium text-zinc-200">
          {s.label}
        </span>
        <span>
          {Math.round(bits)} bits · cracked {crackTime(bits) === 'instantly' ? 'instantly' : `in ~${crackTime(bits)}`} at 10 billion guesses/s
        </span>
      </p>
    </div>
  )
}

export default function PasswordPage() {
  const [opts, setOpts] = useState({ ...DEFAULT_OPTIONS })
  const [count, setCount] = useState(1)
  const [passwords, setPasswords] = useState(() => [generatePassword(DEFAULT_OPTIONS)])
  const [check, setCheck] = useState('')
  const [showCheck, setShowCheck] = useState(false)
  const noSets = Object.keys(activeSets(opts)).length === 0

  const regenerate = (o = opts, n = count) => setPasswords(Array.from({ length: n }, () => generatePassword(o)))
  const update = (patch) => {
    const next = { ...opts, ...patch }
    setOpts(next)
    regenerate(next)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
        <ul data-testid="password-list" className="flex flex-col gap-2">
          {passwords.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <code data-testid={`password-${i}`} className="min-w-0 flex-1 break-all rounded-md bg-zinc-950 px-3 py-2 font-mono text-base text-emerald-200">
                {p || '—'}
              </code>
              <CopyButton text={p} testid={`password-copy-${i}`} />
            </li>
          ))}
        </ul>
        {noSets ? (
          <p role="alert" className="text-sm text-rose-300">
            Pick at least one character set.
          </p>
        ) : (
          <Meter bits={generatedEntropy(opts)} testid="password-strength" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-testid="password-generate" className={`${BUTTON} bg-sky-700/40 text-zinc-100`} onClick={() => regenerate()}>
            Generate new
          </button>
          {passwords.length > 1 && <CopyButton text={passwords.join('\n')} label="Copy all" testid="password-copy-all" />}
          <label className="ml-auto flex items-center gap-2 text-sm text-zinc-300">
            How many
            <select
              data-testid="password-count"
              value={count}
              onChange={(e) => {
                setCount(Number(e.target.value))
                regenerate(opts, Number(e.target.value))
              }}
              className={INPUT}
            >
              {BULK.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          <span className="flex justify-between">
            Length
            <span data-testid="password-length-value" className="font-mono text-zinc-400">
              {opts.length}
            </span>
          </span>
          <input type="range" data-testid="password-length" min={MIN_LENGTH} max={64} value={Math.min(opts.length, 64)} onChange={(e) => update({ length: Number(e.target.value) })} className="accent-sky-500" />
          <input
            type="number"
            aria-label="Exact length"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={opts.length}
            onChange={(e) => update({ length: Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Number(e.target.value) || MIN_LENGTH)) })}
            className={`${INPUT} w-24`}
          />
        </label>
        <div className="flex flex-col gap-2">
          {SET_LABELS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" data-testid={`password-${key}`} checked={opts[key]} onChange={(e) => update({ [key]: e.target.checked })} className="h-4 w-4 accent-sky-500" />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" data-testid="password-ambiguous" checked={opts.excludeAmbiguous} onChange={(e) => update({ excludeAmbiguous: e.target.checked })} className="h-4 w-4 accent-sky-500" />
            Exclude look-alikes (I l 1 O 0 o)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Exclude
            <input data-testid="password-exclude" value={opts.exclude} onChange={(e) => update({ exclude: e.target.value })} placeholder="e.g. <>{}" className={`${INPUT} w-32`} />
          </label>
        </div>
      </div>

      <section aria-label="Check a password" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
        <h2 className="text-sm font-medium text-zinc-200">How strong is my password?</h2>
        <p className="text-xs text-zinc-500">Checked in this page only — nothing is sent anywhere. The estimate discounts common words, repeats and keyboard runs.</p>
        <div className="flex gap-2">
          <input
            type={showCheck ? 'text' : 'password'}
            aria-label="Password to check"
            data-testid="password-check"
            autoComplete="off"
            value={check}
            onChange={(e) => setCheck(e.target.value)}
            className={`${INPUT} min-w-0 flex-1`}
          />
          <button type="button" className={BUTTON} onClick={() => setShowCheck((s) => !s)}>
            {showCheck ? 'Hide' : 'Show'}
          </button>
        </div>
        {check && <Meter bits={estimateEntropy(check)} testid="password-check-strength" />}
      </section>
    </ToolShell>
  )
}
