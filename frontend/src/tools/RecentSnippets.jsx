// The "Recent" picker on the tool pages: restore one of the last snippets this tool ran, straight
// from localStorage. Renders nothing while the history is empty. The page bumps `refreshKey`
// after it saves a snippet, so the list picks the new one up.

import { useMemo, useState } from 'react'
import { clearSnippets, savedSnippets, snippetLabel } from './snippets.js'

export default function RecentSnippets({ scope, onRestore, refreshKey = 0 }) {
  const [clearedAt, setClearedAt] = useState(0)
  const snippets = useMemo(() => savedSnippets(scope), [scope, refreshKey, clearedAt])
  if (!snippets.length) return null
  return (
    <div className="flex items-center gap-1">
      <label className="sr-only" htmlFor={`recent-${scope}`}>
        Recent snippets
      </label>
      <select
        id={`recent-${scope}`}
        data-testid="recent-snippets"
        value=""
        onChange={(e) => {
          const chosen = snippets[Number(e.target.value)]
          if (chosen) onRestore(chosen)
        }}
        className="min-h-[44px] max-w-[55vw] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[36px] sm:max-w-xs"
      >
        <option value="" disabled>
          Recent ({snippets.length})
        </option>
        {snippets.map((s, i) => (
          <option key={`${s.at}-${i}`} value={i}>
            {snippetLabel(s)}
          </option>
        ))}
      </select>
      <button
        type="button"
        data-testid="recent-clear"
        aria-label="Clear recent snippets"
        onClick={() => {
          clearSnippets(scope)
          setClearedAt(Date.now())
        }}
        className="min-h-[44px] rounded-md px-2 text-xs text-zinc-500 hover:text-zinc-300 sm:min-h-[36px]"
      >
        Clear
      </button>
    </div>
  )
}
