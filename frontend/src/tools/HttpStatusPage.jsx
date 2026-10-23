// The HTTP status code reference page (/tools/http-status-codes): search box, category chips,
// and a card per code with meaning and when to use it.

import { useMemo, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { CATEGORIES, filterCodes } from './httpStatusTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'http-status-codes')

const CHIP = 'min-h-[44px] rounded-md border px-3 text-xs sm:min-h-[36px]'
const CAT_COLORS = {
  1: 'text-sky-300',
  2: 'text-emerald-300',
  3: 'text-amber-300',
  4: 'text-orange-300',
  5: 'text-red-300',
}

export default function HttpStatusPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const codes = useMemo(() => filterCodes(query, category), [query, category])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            data-testid="status-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, name or meaning — 404, redirect, rate limit…"
            aria-label="Search status codes"
            className="min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:min-h-[40px] sm:max-w-md"
          />
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              data-testid="status-cat-all"
              onClick={() => setCategory('')}
              className={`${CHIP} ${category === '' ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
            >
              All
            </button>
            {CATEGORIES.map(([digit, label]) => (
              <button
                type="button"
                key={digit}
                data-testid={`status-cat-${digit}`}
                onClick={() => setCategory(category === digit ? '' : digit)}
                className={`${CHIP} shrink-0 ${category === digit ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
              >
                {digit}xx {label}
              </button>
            ))}
          </div>
        </div>

        <p data-testid="status-count" className="text-xs text-zinc-500">
          {codes.length} status code{codes.length === 1 ? '' : 's'}
        </p>

        {codes.length === 0 && (
          <p data-testid="status-empty" className="rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-400">
            Nothing matches that search. Try a code like 404 or a word like “redirect”.
          </p>
        )}

        <ul data-testid="status-list" className="grid gap-2 lg:grid-cols-2">
          {codes.map(([code, name, meaning, usage]) => (
            <li key={code} className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  <span className={`font-mono ${CAT_COLORS[String(code)[0]]}`}>{code}</span> {name}
                </h2>
                <CopyButton text={`${code} ${name}`} label="Copy" testid={`status-copy-${code}`} />
              </div>
              <p className="text-sm text-zinc-300">{meaning}</p>
              <p className="text-sm text-zinc-500">
                <span className="font-medium text-zinc-400">Use it for:</span> {usage}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </ToolShell>
  )
}
