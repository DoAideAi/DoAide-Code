// The regex tester (/tools/regex-tester): pattern, flags and a test string, with every match and
// capture group shown live as you type. Runs in the page; nothing is uploaded.

import { useMemo, useState } from 'react'
import ToolShell from './ToolShell.jsx'
import { MAX_REGEX_TEXT, REGEX_FLAGS, runRegex } from './regexTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'regex-tester')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

export default function RegexPage() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')

  const tooLong = text.length > MAX_REGEX_TEXT
  const result = useMemo(
    () => (tooLong ? { ok: true, matches: [], segments: [] } : runRegex(pattern, flags, text)),
    [pattern, flags, text, tooLong],
  )
  const toggle = (flag) =>
    setFlags((f) => (f.includes(flag) ? f.replace(flag, '') : f + flag))

  const hasGroups = result.ok && result.matches.some((m) => m.groups.length || Object.keys(m.named).length)
  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rx-pattern" className="text-xs font-medium text-zinc-400">
            Pattern
          </label>
          <div className={`flex items-center overflow-hidden rounded-lg border bg-shade/40 focus-within:border-zinc-600 ${result.ok ? 'border-zinc-800' : 'border-red-900/80'}`}>
            <span aria-hidden className={`pl-3 text-zinc-600 ${MONO}`}>/</span>
            <input
              id="rx-pattern"
              data-testid="rx-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="([a-z]+)@(\w+)\.com"
              className={`min-h-[44px] w-full bg-transparent px-1 text-zinc-200 placeholder:text-zinc-600 focus:outline-none ${MONO}`}
            />
            <span aria-hidden className={`pr-3 text-zinc-600 ${MONO}`}>/{flags}</span>
          </div>
        </div>
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="sr-only">Flags</legend>
          {REGEX_FLAGS.map(([flag, label]) => (
            <label key={flag} className="flex min-h-[44px] items-center gap-1.5 text-xs text-zinc-400 sm:min-h-0">
              <input
                type="checkbox"
                data-testid={`rx-flag-${flag}`}
                checked={flags.includes(flag)}
                onChange={() => toggle(flag)}
                className="h-4 w-4 accent-sky-500"
              />
              <span className={MONO}>{flag}</span> {label}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="rx-text" className="text-xs font-medium text-zinc-400">
            Test string
          </label>
          <textarea
            id="rx-text"
            data-testid="rx-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={6}
            placeholder="Paste the text to search here…"
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none ${MONO}`}
          />
        </div>
        <p className="text-xs text-zinc-500">Matches update as you type. Your text never leaves this page.</p>
      </div>

      {!result.ok && (
        <p role="alert" data-testid="rx-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {result.error}
        </p>
      )}
      {tooLong && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          That's too much text: keep it under {MAX_REGEX_TEXT.toLocaleString()} characters.
        </p>
      )}

      {result.ok && text && !tooLong && (
        <>
          <p data-testid="rx-count" role="status" className="text-xs text-zinc-500">
            {result.matches.length === 0
              ? pattern
                ? 'No matches.'
                : 'Type a pattern to see its matches.'
              : `${result.matches.length} match${result.matches.length === 1 ? '' : 'es'}`}
          </p>
          {result.matches.length > 0 && (
            <section aria-label="Text with matches highlighted" className="rounded-lg border border-zinc-800 p-3">
              <pre data-testid="rx-highlight" className={`overflow-x-auto whitespace-pre-wrap break-words text-zinc-300 ${MONO}`}>
                {result.segments.map((seg, i) =>
                  seg.match === null ? (
                    seg.text
                  ) : (
                    <mark key={i} className="rounded-sm bg-sky-500/30 px-0.5 text-sky-100">
                      {seg.text}
                    </mark>
                  ),
                )}
              </pre>
            </section>
          )}
          {result.matches.length > 0 && (
            <section aria-label="Match details" className="overflow-x-auto rounded-lg border border-zinc-800">
              <table data-testid="rx-table" className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th scope="col" className="px-3 py-2 font-medium">#</th>
                    <th scope="col" className="px-3 py-2 font-medium">Match</th>
                    <th scope="col" className="px-3 py-2 font-medium">At</th>
                    {hasGroups && <th scope="col" className="px-3 py-2 font-medium">Groups</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.matches.slice(0, 200).map((m, i) => (
                    <tr key={i} className="border-b border-zinc-800/60 align-top">
                      <td className="px-3 py-1.5 tabular-nums text-zinc-500">{i + 1}</td>
                      <td className={`px-3 py-1.5 text-zinc-200 ${MONO}`}>{m.text || <em className="text-zinc-500">(empty)</em>}</td>
                      <td className="px-3 py-1.5 tabular-nums text-zinc-500">{m.index}</td>
                      {hasGroups && (
                        <td className={`px-3 py-1.5 text-zinc-400 ${MONO}`}>
                          {m.groups.map((g, gi) => `$${gi + 1}: ${g ?? '—'}`).join('  ')}
                          {Object.entries(m.named)
                            .map(([k, v]) => `  ${k}: ${v ?? '—'}`)
                            .join('')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.matches.length > 200 && (
                <p className="px-3 py-2 text-xs text-zinc-500">Showing the first 200 matches.</p>
              )}
            </section>
          )}
        </>
      )}
    </ToolShell>
  )
}
