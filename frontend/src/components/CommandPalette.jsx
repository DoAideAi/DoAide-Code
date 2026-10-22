import { useEffect, useMemo, useRef, useState } from 'react'

// Lower is better; null when `label` does not match. A prefix beats a word start beats a match
// inside; letters in order ("nc" for New chat) match last.
export function score(label, query) {
  const text = label.toLowerCase()
  const q = query.trim().toLowerCase()
  if (!q) return 0
  if (text.startsWith(q)) return 1
  if (text.includes(` ${q}`) || text.includes(`/${q}`)) return 2
  if (text.includes(q)) return 3
  let at = 0
  for (const ch of q) {
    at = text.indexOf(ch, at) + 1
    if (at === 0) return null
  }
  return 4
}

// Items matching `query`, best first; with no query, in their given order.
export function filterItems(items, query) {
  return items
    .map((item, i) => ({ item, i, s: score(`${item.label} ${item.group ?? ''}`, query) }))
    .filter((x) => x.s !== null)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.item)
}

const MAX_SHOWN = 50

// Ctrl/Cmd+P: every action by name. `items`: [{ id, label, group, hint?, run }]; picking one closes
// the palette, then runs it.
export default function CommandPalette({ items, onClose }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const list = useRef(null)
  const shown = useMemo(() => filterItems(items, query).slice(0, MAX_SHOWN), [items, query])

  useEffect(() => input.current?.focus(), [])
  useEffect(() => setActive(0), [query])
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const run = (item) => {
    onClose()
    item.run()
  }
  const onKey = (e) => {
    if (e.key === 'Escape') {
      // Not also the app's Escape (stop the reply).
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = shown.length
      if (n) setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (shown[active]) run(shown[active])
    }
  }

  let lastGroup = null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Command palette"
        data-testid="command-palette"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line/[0.1] bg-zinc-900 shadow-2xl"
      >
        <input
          ref={input}
          data-testid="palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a command, project, model or conversation…"
          aria-label="Command"
          aria-controls="palette-list"
          className="w-full border-b border-line/[0.08] bg-transparent px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none sm:text-sm"
        />
        <ul id="palette-list" ref={list} role="listbox" className="max-h-[50vh] overflow-y-auto py-1">
          {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-zinc-500">Nothing matches</li>}
          {shown.map((item, i) => {
            const header = !query && item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <li key={item.id} role="option" aria-selected={i === active}>
                {header && <div className="px-4 pb-1 pt-2 text-[11px] uppercase tracking-wide text-zinc-500">{header}</div>}
                <button
                  type="button"
                  data-testid={`palette-${item.id}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                    i === active ? 'bg-sky-500/15 text-sky-100' : 'text-zinc-200'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {query && item.group && <span className="shrink-0 text-[11px] text-zinc-500">{item.group}</span>}
                  {item.hint && (
                    <kbd className="shrink-0 rounded border border-line/[0.1] px-1.5 font-mono text-[11px] text-zinc-400">{item.hint}</kbd>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
