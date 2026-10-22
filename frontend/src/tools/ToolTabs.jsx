// The tool switcher shown on every /tools page: a row of AI tools and a row of utilities.
// On the AI tools page the AI row switches in place (onChoose + pushState); everything else is
// a plain link, so moving between the two kinds of page is a normal navigation.

import { TOOLS } from './codeTools.js'
import { UTIL_TOOLS } from './utilTools.js'

const LINK = 'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-sm sm:min-h-[36px]'
const ACTIVE = 'bg-zinc-800 text-zinc-100'
const IDLE = 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'

function NewBadge() {
  return <span className="rounded-full bg-sky-900/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">New</span>
}

// On phones each row bleeds to the screen edges, so it scrolls under them.
const ROW = '-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0'

export default function ToolTabs({ activeSlug, onChoose }) {
  const ai = (
    <div role={onChoose ? 'tablist' : undefined} aria-label="AI tools" className={ROW}>
      {TOOLS.map((t) => (
        <a
          key={t.slug}
          role={onChoose ? 'tab' : undefined}
          aria-selected={onChoose ? t.slug === activeSlug : undefined}
          aria-current={onChoose ? undefined : t.slug === activeSlug ? 'page' : undefined}
          href={`/tools/${t.slug}`}
          onClick={onChoose ? (e) => onChoose(t, e) : undefined}
          className={`${LINK} ${t.slug === activeSlug ? ACTIVE : IDLE}`}
        >
          {t.label}
        </a>
      ))}
    </div>
  )
  const utils = (
    <div aria-label="Utilities" className={ROW}>
      {UTIL_TOOLS.map((t) => (
        <a
          key={t.slug}
          aria-current={t.slug === activeSlug ? 'page' : undefined}
          href={`/tools/${t.slug}`}
          className={`${LINK} ${t.slug === activeSlug ? ACTIVE : IDLE}`}
        >
          {t.label}
          {t.isNew && <NewBadge />}
        </a>
      ))}
    </div>
  )
  return (
    <nav aria-label="All tools" className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-zinc-600">AI tools</span>
        {ai}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-zinc-600">Utilities</span>
        {utils}
      </div>
    </nav>
  )
}
