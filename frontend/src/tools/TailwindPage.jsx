// The CSS to Tailwind converter page (/tools/css-to-tailwind): paste CSS rules (or bare
// declarations) and get Tailwind utility classes per selector, with hover/focus, responsive
// and dark-mode variants. Runs in the page.

import { useMemo, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { convertCss } from './tailwindTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'css-to-tailwind')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

const SAMPLE = `.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  max-width: 448px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card:hover {
  border-color: #3b82f6;
}

.title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  color: #111827;
}

@media (min-width: 768px) {
  .card {
    flex-direction: row;
    padding: 32px;
  }
}
`

export default function TailwindPage() {
  const [css, setCss] = useState(SAMPLE)
  const rules = useMemo(() => convertCss(css), [css])
  const arbitrary = rules.reduce((n, r) => n + r.classes.filter((c) => c.includes('[')).length, 0)
  const all = rules.map((r) => (r.selector ? `${r.selector} → ${r.classes.join(' ')}` : r.classes.join(' '))).join('\n')

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Your CSS
          <textarea
            data-testid="tw-in"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            rows={22}
            spellCheck={false}
            placeholder=".button { padding: 8px 16px; }   or just   display: flex; gap: 8px;"
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 ${MONO}`}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>Tailwind classes</span>
            <CopyButton text={all} label="Copy all" testid="tw-copy-all" />
          </div>
          {rules.length === 0 && <p className="text-sm text-zinc-500">Paste CSS rules or declarations to convert them.</p>}
          <ul data-testid="tw-out" className="flex flex-col gap-2">
            {rules.map((r, i) => {
              const cls = r.classes.join(' ')
              return (
                <li key={`${r.selector}-${i}`} className="flex flex-col gap-1 rounded-lg border border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-sky-300">{r.selector || 'declarations'}</code>
                    <div className="flex gap-1">
                      <CopyButton text={cls} label="Copy" />
                      <CopyButton text={`class="${cls}"`} label='class=""' />
                    </div>
                  </div>
                  <p data-testid={`tw-classes-${i}`} className={`break-words text-emerald-200 ${MONO}`}>
                    {r.classes.map((c) => (
                      <span key={c} className={c.includes('[') ? 'text-amber-200' : ''}>
                        {c}{' '}
                      </span>
                    ))}
                  </p>
                </li>
              )
            })}
          </ul>
          {arbitrary > 0 && (
            <p className="text-xs text-zinc-500">
              <span className="text-amber-200">Amber</span> classes use arbitrary values because the CSS value isn’t on Tailwind’s
              default scale — consider adding it to your theme or rounding to the nearest step.
            </p>
          )}
          <p className="text-xs text-zinc-500">Targets Tailwind CSS v3 defaults. min-width media queries at 640/768/1024/1280/1536px become sm/md/lg/xl/2xl.</p>
        </div>
      </div>
    </ToolShell>
  )
}
