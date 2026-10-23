// The HTML entity encoder/decoder page (/tools/html-entities): encode or decode live, pick named or
// numeric output, and a click-to-copy reference of the entities developers reach for most.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { MODES, REFERENCE, decode, encode } from './htmlEntityTool.js'
import { UTIL_TOOLS } from './utilTools.js'
import { copyText } from '../copy.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'html-entities')

const AREA = 'w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[16px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:text-[13px]'
const SELECT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'

export default function HtmlEntityPage() {
  const [direction, setDirection] = useState('encode')
  const [input, setInput] = useState('<p class="note">Fish & chips — £5 © 2026</p>')
  const [mode, setMode] = useState('named')
  const [everything, setEverything] = useState(false)
  const [copied, setCopied] = useState(null)
  const output = direction === 'encode' ? encode(input, mode, { everything }) : decode(input)

  const copyRef = async (text) => {
    if (await copyText(text)) {
      setCopied(text)
      setTimeout(() => setCopied(null), 1200)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Direction" className="flex gap-1">
          {['encode', 'decode'].map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={direction === d}
              data-testid={`entity-${d}`}
              onClick={() => setDirection(d)}
              className={`${BUTTON} capitalize ${direction === d ? 'bg-zinc-800 text-zinc-100' : ''}`}
            >
              {d}
            </button>
          ))}
        </div>
        {direction === 'encode' && (
          <>
            <select aria-label="Encoding style" data-testid="entity-mode" value={mode} onChange={(e) => setMode(e.target.value)} className={SELECT}>
              {Object.entries(MODES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" data-testid="entity-everything" checked={everything} onChange={(e) => setEverything(e.target.checked)} className="h-4 w-4 accent-sky-500" />
              Also encode ASCII punctuation
            </label>
          </>
        )}
        <button
          type="button"
          data-testid="entity-swap"
          className={`${BUTTON} ml-auto`}
          onClick={() => {
            setInput(output)
            setDirection((d) => (d === 'encode' ? 'decode' : 'encode'))
          }}
        >
          Use output as input
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-400">
          {direction === 'encode' ? 'Text or HTML to encode' : 'Text with entities to decode'}
          <textarea data-testid="entity-input" value={input} onChange={(e) => setInput(e.target.value)} rows={8} spellCheck={false} className={AREA} />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            {direction === 'encode' ? 'Encoded' : 'Decoded'}
            <CopyButton text={output} testid="entity-copy" />
          </div>
          <pre data-testid="entity-output" className={`${AREA} min-h-[180px] whitespace-pre-wrap break-all text-emerald-200`}>
            {output}
          </pre>
        </div>
      </div>

      <section aria-label="Common HTML entities" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-200">Common HTML entities</h2>
        <p className="text-xs text-zinc-500">Click a name or number to copy it.</p>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm" data-testid="entity-reference">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Char</th>
                <th className="px-3 py-2 font-medium">Named</th>
                <th className="px-3 py-2 font-medium">Numeric</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE.map(([ch, name, cp, desc]) => (
                <tr key={name} className="border-t border-zinc-800/70">
                  <td className="px-3 py-1.5 font-mono text-base text-zinc-100">{ch === ' ' ? '␣' : ch}</td>
                  {[`&${name};`, `&#${cp};`].map((ref) => (
                    <td key={ref} className="px-3 py-1.5">
                      <button type="button" onClick={() => copyRef(ref)} className="font-mono text-sky-300 hover:underline">
                        {copied === ref ? 'Copied' : ref}
                      </button>
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-zinc-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ToolShell>
  )
}
