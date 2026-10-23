// The chmod calculator page (/tools/chmod-calculator): tick read/write/execute per class (plus
// the special bits) or type an octal or symbolic mode, and get the chmod commands to copy.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { BITS, CLASSES, PRESETS, SPECIALS, explain, fromOctal, parseMode, toChmodSymbolic, toOctal, toSymbolic } from './chmodTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'chmod-calculator')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'

export default function ChmodPage() {
  const [mode, setMode] = useState(() => fromOctal('755'))
  const [typed, setTyped] = useState(null) // what's being typed into the mode box, until it parses
  const [file, setFile] = useState('file.sh')
  const [recursive, setRecursive] = useState(false)

  const octal = toOctal(mode)
  const symbolic = toSymbolic(mode)
  const target = file.trim() || 'file'
  const flag = recursive ? '-R ' : ''
  const { lines, warnings } = explain(mode)

  const toggle = (c, i) => {
    setTyped(null)
    setMode((m) => ({ ...m, who: { ...m.who, [c]: m.who[c].map((v, j) => (j === i ? !v : v)) } }))
  }
  const toggleSpecial = (i) => {
    setTyped(null)
    setMode((m) => ({ ...m, special: m.special.map((v, j) => (j === i ? !v : v)) }))
  }
  const onType = (text) => {
    setTyped(text)
    const parsed = parseMode(text)
    if (parsed) setMode(parsed)
  }
  const invalid = typed !== null && typed.trim() !== '' && !parseMode(typed)

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <table className="w-full max-w-md text-sm">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="py-1 font-normal" />
                {BITS.map(([b, label, value]) => (
                  <th key={b} className="py-1 text-center font-normal">
                    {label} <span className="text-zinc-600">({value})</span>
                  </th>
                ))}
                <th className="py-1 text-center font-normal">Octal</th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map(([c, label]) => (
                <tr key={c} className="border-t border-zinc-800">
                  <th scope="row" className="py-2 text-left font-normal text-zinc-300">
                    {label}
                  </th>
                  {BITS.map(([b, bitLabel], i) => (
                    <td key={b} className="text-center">
                      <input
                        type="checkbox"
                        aria-label={`${label} ${bitLabel.toLowerCase()}`}
                        data-testid={`chmod-${c}${b}`}
                        checked={mode.who[c][i]}
                        onChange={() => toggle(c, i)}
                        className="h-5 w-5 accent-sky-500"
                      />
                    </td>
                  ))}
                  <td className="text-center font-mono text-zinc-200">{octal.slice(-3)[CLASSES.findIndex(([k]) => k === c)]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SPECIALS.map(([key, label, value], i) => (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" data-testid={`chmod-${key}`} checked={mode.special[i]} onChange={() => toggleSpecial(i)} className="h-4 w-4 accent-sky-500" />
                {label} <span className="text-zinc-600">({value}000)</span>
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Or type a mode — octal (755, 0644, 4755) or symbolic (rwxr-xr-x, -rw-r--r--)
            <input
              data-testid="chmod-input"
              value={typed ?? octal}
              onChange={(e) => onType(e.target.value)}
              onBlur={() => setTyped(null)}
              spellCheck={false}
              className={`${INPUT} max-w-xs ${invalid ? 'border-rose-800' : ''}`}
            />
          </label>
          {invalid && (
            <p role="alert" className="text-xs text-rose-300">
              Not a mode — use 3–4 octal digits or 9 rwx characters.
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {PRESETS.map(([p, hint]) => (
              <button key={p} type="button" title={hint} className={`${BUTTON} font-mono ${p === octal ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => {
                  setTyped(null)
                  setMode(fromOctal(p))
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-baseline gap-4 rounded-lg border border-zinc-800 p-4">
            <span data-testid="chmod-octal" className="font-mono text-4xl text-zinc-100">
              {octal}
            </span>
            <span data-testid="chmod-symbolic" className="font-mono text-xl text-emerald-300">
              {symbolic}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              File
              <input aria-label="File or directory name" value={file} onChange={(e) => setFile(e.target.value)} className={`${INPUT} w-40`} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} className="h-4 w-4 accent-sky-500" />
              Recursive (-R)
            </label>
          </div>
          {[
            ['Octal', `chmod ${flag}${octal} ${target}`],
            ['Symbolic', `chmod ${flag}${toChmodSymbolic(mode)} ${target}`],
          ].map(([label, cmd]) => (
            <div key={label} className="flex items-center gap-2">
              <code data-testid={`chmod-cmd-${label.toLowerCase()}`} className="min-w-0 flex-1 break-all rounded border border-zinc-800 bg-zinc-950 px-2 py-2 font-mono text-sm text-zinc-200">
                {cmd}
              </code>
              <CopyButton text={cmd} label="Copy" />
            </div>
          ))}
          <ul data-testid="chmod-explain" className="flex flex-col gap-1 text-sm text-zinc-300">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {warnings.map((w) => (
            <p key={w} className="rounded border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              {w}
            </p>
          ))}
        </div>
      </div>
    </ToolShell>
  )
}
