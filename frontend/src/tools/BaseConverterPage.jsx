// The number base converter page (/tools/number-base-converter): type into any base and the rest
// follow, see the bits at a chosen width, and run bitwise operations. BigInt, so nothing rounds.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { OPS, WIDTHS, bitString, bitwise, fits, formatBig, group, parseAuto, parseBig, toSigned, toUnsigned } from './baseTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'number-base-converter')
const INPUT = 'min-h-[44px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-[16px] text-zinc-200 sm:min-h-[36px] sm:text-sm'

const FIELDS = [
  ['bin', 'Binary', 2],
  ['oct', 'Octal', 8],
  ['dec', 'Decimal', 10],
  ['hex', 'Hexadecimal', 16],
]

export default function BaseConverterPage() {
  const [value, setValue] = useState(255n)
  const [editing, setEditing] = useState(null) // { key, text } while a field holds unparsed text
  const [custom, setCustom] = useState(36)
  const [bits, setBits] = useState(32)
  const [b, setB] = useState('0x0f')

  const fields = [...FIELDS, ['custom', `Base ${custom}`, custom]]
  const shown = (key, base) => (editing?.key === key ? editing.text : formatBig(value, base))
  const onType = (key, base, text) => {
    setEditing({ key, text })
    const n = parseBig(text, base)
    if (n !== null) setValue(n)
  }
  const invalid = editing && editing.text.trim() !== '' && parseBig(editing.text, fields.find(([k]) => k === editing.key)[2]) === null

  const unsigned = toUnsigned(value, bits)
  const signed = toSigned(value, bits)
  const fit = fits(value, bits)
  const bValue = parseAuto(b)

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          {fields.map(([key, label, base]) => (
            <div key={key} className="flex flex-col gap-1 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-2">
                {key === 'custom' ? (
                  <label className="flex items-center gap-2">
                    Base
                    <input
                      type="number"
                      min={2}
                      max={36}
                      aria-label="Custom base"
                      value={custom}
                      onChange={(e) => setCustom(Math.min(36, Math.max(2, Number(e.target.value) || 2)))}
                      className="min-h-[44px] w-16 rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono sm:min-h-[36px]"
                    />
                  </label>
                ) : (
                  <label htmlFor={`base-${key}`}>
                    {label} <span className="text-zinc-600">(base {base})</span>
                  </label>
                )}
                <CopyButton text={formatBig(value, base)} label="Copy" />
              </div>
              <input
                id={`base-${key}`}
                data-testid={`base-${key}`}
                aria-label={label}
                value={shown(key, base)}
                onChange={(e) => onType(key, base, e.target.value)}
                onBlur={() => setEditing(null)}
                spellCheck={false}
                autoComplete="off"
                className={`${INPUT} ${editing?.key === key && invalid ? 'border-rose-800' : ''}`}
              />
            </div>
          ))}
          {invalid && (
            <p role="alert" className="text-xs text-rose-300">
              That isn’t a valid number in this base.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1 text-sm text-zinc-300">
            <span className="mr-1">Bit width</span>
            {WIDTHS.map((w) => (
              <button key={w} type="button" data-testid={`base-width-${w}`} aria-pressed={bits === w} className={`${BUTTON} ${bits === w ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => setBits(w)}>
                {w}-bit
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-zinc-800 p-3">
            <p data-testid="base-bits" className="break-all font-mono text-sm text-emerald-300">
              {bitString(value, bits)}
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-zinc-500">Unsigned</dt>
              <dd data-testid="base-unsigned" className="font-mono text-zinc-200">
                {group(unsigned.toString(), 3, ',')}
              </dd>
              <dt className="text-zinc-500">Signed</dt>
              <dd data-testid="base-signed" className="font-mono text-zinc-200">
                {group(signed.toString(), 3, ',')}
              </dd>
              <dt className="text-zinc-500">Hex</dt>
              <dd className="font-mono text-zinc-200">0x{group(unsigned.toString(16).padStart(bits / 4, '0'), 4, '_')}</dd>
            </dl>
            {!fit.signed && !fit.unsigned && <p className="mt-2 text-xs text-amber-200">Doesn’t fit in {bits} bits — the bits shown are the low {bits}.</p>}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300">
            <h2 className="font-medium text-zinc-200">Bitwise operations</h2>
            <p className="text-xs text-zinc-500">A is the number above. Type B in decimal or with a 0x, 0b or 0o prefix.</p>
            <label className="flex items-center gap-2">
              B
              <input data-testid="base-b" value={b} onChange={(e) => setB(e.target.value)} spellCheck={false} className={`${INPUT} ${bValue === null ? 'border-rose-800' : ''}`} />
            </label>
            {bValue !== null && (
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <tbody>
                  {OPS.map(([op, label]) => {
                    const r = bitwise(op, value, bValue, bits)
                    return (
                      <tr key={op} className="border-t border-zinc-800">
                        <th scope="row" className="py-1 pr-2 font-normal text-sky-300">
                          {label}
                        </th>
                        <td data-testid={`base-op-${op}`} className="py-1 pr-2 text-zinc-200">
                          {r.toString()}
                        </td>
                        <td className="py-1 pr-2 text-zinc-400">0x{r.toString(16)}</td>
                        <td className="hidden break-all py-1 text-zinc-500 sm:table-cell">{bitString(r, bits)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
