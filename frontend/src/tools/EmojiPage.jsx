// The developer emoji picker page (/tools/emoji-picker): search, group chips, a grid of emojis,
// and a detail card with every escape format. Clicking an emoji copies it immediately.

import { useMemo, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { copyText } from '../copy.js'
import { GROUP_NAMES, emojiFormats, filterEmojis } from './emojiTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'emoji-picker')

const CHIP = 'min-h-[44px] shrink-0 rounded-md border px-3 text-xs sm:min-h-[36px]'

export default function EmojiPage() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [picked, setPicked] = useState(null) // [emoji, name]
  const [copied, setCopied] = useState(false)
  const rows = useMemo(() => filterEmojis(query, group), [query, group])
  const formats = picked ? emojiFormats(picked[0]) : null

  const pick = async (emoji, name) => {
    setPicked([emoji, name])
    if (await copyText(emoji)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          data-testid="emoji-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — rocket, bug, lgtm, docker, shrug…"
          aria-label="Search emojis"
          className="min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:min-h-[40px] sm:max-w-md"
        />
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            type="button"
            data-testid="emoji-group-all"
            onClick={() => setGroup('')}
            className={`${CHIP} ${group === '' ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
          >
            All
          </button>
          {GROUP_NAMES.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setGroup(group === g ? '' : g)}
              className={`${CHIP} ${group === g ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
            >
              {g}
            </button>
          ))}
        </div>

        {picked && formats && (
          <div data-testid="emoji-detail" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{formats.char}</span>
              <div>
                <p className="text-sm font-medium capitalize text-zinc-200">{picked[1]}</p>
                <p className="text-xs text-zinc-500" aria-live="polite">
                  {copied ? 'Copied to your clipboard.' : 'Click any format below to copy it.'}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Unicode', formats.unicode],
                ['HTML entity', formats.html],
                ['JS escape', `'${formats.js}'`],
                ['CSS content', `'${formats.css}'`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-600">{label}</p>
                    <p className="truncate font-mono text-sm text-zinc-200">{value}</p>
                  </div>
                  <CopyButton text={value} testid={`emoji-copy-${label.split(' ')[0].toLowerCase()}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        <p data-testid="emoji-count" className="text-xs text-zinc-500">
          {rows.length} emoji{rows.length === 1 ? '' : 's'} — click one to copy it and see its codes
        </p>
        {rows.length === 0 && (
          <p data-testid="emoji-empty" className="rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-400">
            Nothing matches that search.
          </p>
        )}
        <ul data-testid="emoji-grid" className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1">
          {rows.map(([emoji, name]) => (
            <li key={emoji}>
              <button
                type="button"
                title={name}
                aria-label={name}
                onClick={() => pick(emoji, name)}
                className="flex min-h-[48px] w-full items-center justify-center rounded-md text-2xl hover:bg-zinc-800"
              >
                {emoji}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ToolShell>
  )
}
