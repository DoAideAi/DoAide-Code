// The lorem ipsum generator (/tools/lorem-ipsum): pick a style, a unit and a count, get filler
// text to copy as plain text or HTML paragraphs.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { LOREM_STYLES, MAX_LOREM_COUNT, generateLorem, loremHtml } from './loremTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'lorem-ipsum')

const FIELD = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'

export default function LoremPage() {
  const [style, setStyle] = useState('classic')
  const [unit, setUnit] = useState('paragraphs')
  const [count, setCount] = useState(3)
  const [text, setText] = useState(() => generateLorem('classic', 'paragraphs', 3))

  const regenerate = (s = style, u = unit, c = count) => setText(generateLorem(s, u, c))

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Style
          <select
            data-testid="lorem-style"
            value={style}
            onChange={(e) => {
              setStyle(e.target.value)
              regenerate(e.target.value)
            }}
            className={FIELD}
          >
            {LOREM_STYLES.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Unit
          <select
            data-testid="lorem-unit"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value)
              regenerate(style, e.target.value)
            }}
            className={FIELD}
          >
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Count
          <input
            data-testid="lorem-count"
            type="number"
            min="1"
            max={MAX_LOREM_COUNT}
            value={count}
            onChange={(e) => {
              const c = Number(e.target.value)
              setCount(c)
              regenerate(style, unit, c)
            }}
            className={`${FIELD} w-24`}
          />
        </label>
        <button type="button" data-testid="lorem-again" className={BUTTON} onClick={() => regenerate()}>
          Regenerate
        </button>
        <div className="ml-auto flex gap-2">
          <CopyButton text={text} testid="lorem-copy" />
          <CopyButton text={loremHtml(text)} label="Copy HTML" testid="lorem-copy-html" />
        </div>
      </div>

      <textarea
        data-testid="lorem-out"
        value={text}
        readOnly
        className="min-h-[320px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[14px] leading-relaxed text-zinc-200 focus:border-zinc-600 focus:outline-none"
      />
      <p className="text-xs text-zinc-500">
        Classic always opens with the canonical Lorem ipsum. Copy HTML wraps each paragraph in a &lt;p&gt; tag. Nothing leaves this page.
      </p>
    </ToolShell>
  )
}
