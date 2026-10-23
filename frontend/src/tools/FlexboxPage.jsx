// The flexbox playground page (/tools/flexbox-playground): container controls, a click-to-select
// item with its own flex settings, a live preview and the generated CSS.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { ALIGN_SELF, CONTAINER_PROPS, DEFAULT_CONTAINER, DEFAULT_ITEM, MAX_ITEMS, MIN_ITEMS, flexboxCss } from './flexboxTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'flexbox-playground')

const SELECT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'
const ITEM_COLORS = ['bg-sky-700/80', 'bg-emerald-700/80', 'bg-amber-700/80', 'bg-rose-700/80', 'bg-violet-700/80', 'bg-teal-700/80', 'bg-orange-700/80', 'bg-indigo-700/80', 'bg-lime-700/80', 'bg-pink-700/80']

export default function FlexboxPage() {
  const [container, setContainer] = useState({ ...DEFAULT_CONTAINER })
  const [items, setItems] = useState([{ ...DEFAULT_ITEM }, { ...DEFAULT_ITEM }, { ...DEFAULT_ITEM }])
  const [active, setActive] = useState(0)
  const item = items[active] ?? items[0]
  const css = flexboxCss(container, items)

  const setItem = (patch) => setItems((ls) => ls.map((l, i) => (i === active ? { ...l, ...patch } : l)))

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-200">Container</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONTAINER_PROPS.map(([key, prop, values]) => (
              <label key={key} className="flex flex-col gap-1 text-sm text-zinc-300">
                <code className="text-xs text-zinc-500">{prop}</code>
                <select data-testid={`flex-${key}`} className={SELECT} value={container[key]} onChange={(e) => setContainer((c) => ({ ...c, [key]: e.target.value }))}>
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <code className="text-xs text-zinc-500">gap: {container.gap}px</code>
              <input
                type="range"
                data-testid="flex-gap"
                min={0}
                max={48}
                value={container.gap}
                onChange={(e) => setContainer((c) => ({ ...c, gap: Number(e.target.value) }))}
                className="mt-2 accent-sky-500"
              />
            </label>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-200">Item {active + 1}</h2>
            <div className="flex gap-1">
              <button
                type="button"
                data-testid="flex-add-item"
                className={BUTTON}
                disabled={items.length >= MAX_ITEMS}
                onClick={() => setItems((ls) => (ls.length < MAX_ITEMS ? [...ls, { ...DEFAULT_ITEM }] : ls))}
              >
                + Item
              </button>
              <button
                type="button"
                data-testid="flex-remove-item"
                className={BUTTON}
                disabled={items.length <= MIN_ITEMS}
                onClick={() => {
                  setItems((ls) => (ls.length > MIN_ITEMS ? ls.slice(0, -1) : ls))
                  setActive((a) => Math.min(a, items.length - 2))
                }}
              >
                − Item
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <code className="text-xs text-zinc-500">flex-grow: {item.grow}</code>
              <input type="range" data-testid="flex-grow" min={0} max={5} value={item.grow} onChange={(e) => setItem({ grow: Number(e.target.value) })} className="mt-2 accent-sky-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <code className="text-xs text-zinc-500">flex-shrink: {item.shrink}</code>
              <input type="range" data-testid="flex-shrink" min={0} max={5} value={item.shrink} onChange={(e) => setItem({ shrink: Number(e.target.value) })} className="mt-2 accent-sky-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <code className="text-xs text-zinc-500">flex-basis</code>
              <select data-testid="flex-basis" className={SELECT} value={item.basis} onChange={(e) => setItem({ basis: e.target.value })}>
                {['auto', '0', '100px', '200px', '33%', '50%'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <code className="text-xs text-zinc-500">align-self</code>
              <select data-testid="flex-align-self" className={SELECT} value={item.alignSelf} onChange={(e) => setItem({ alignSelf: e.target.value })}>
                {ALIGN_SELF.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-200">Preview — click an item to edit it</h2>
          <div
            data-testid="flex-preview"
            className="min-h-[260px] rounded-lg border border-zinc-800 bg-zinc-950 p-3"
            style={{
              display: 'flex',
              flexDirection: container.flexDirection,
              justifyContent: container.justifyContent,
              alignItems: container.alignItems,
              flexWrap: container.flexWrap,
              alignContent: container.alignContent,
              gap: `${container.gap}px`,
            }}
          >
            {items.map((it, i) => (
              <button
                type="button"
                key={i}
                data-testid={`flex-item-${i}`}
                onClick={() => setActive(i)}
                className={`flex min-h-[56px] min-w-[56px] items-center justify-center rounded-md p-3 font-mono text-sm text-white ${ITEM_COLORS[i]} ${i === active ? 'ring-2 ring-white/80' : ''}`}
                style={{ flexGrow: it.grow, flexShrink: it.shrink, flexBasis: it.basis, alignSelf: it.alignSelf }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">CSS</h2>
            <CopyButton text={css} label="Copy CSS" testid="flex-copy" />
          </div>
          <pre data-testid="flex-css" className="overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200">
            {css}
          </pre>
          <p className="text-xs text-zinc-500">Only non-default properties are emitted, so the CSS stays as lean as hand-written. Everything runs in your browser.</p>
        </div>
      </div>
    </ToolShell>
  )
}
