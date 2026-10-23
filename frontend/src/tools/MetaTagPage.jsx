// The meta tag generator page (/tools/meta-tag-generator): a form on the left, the generated
// <head> block and a search-result preview on the right.

import { useMemo, useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { DESC_LIMIT, OG_TYPES, TITLE_LIMIT, TWITTER_CARDS, buildMetaTags, lengthHint } from './metaTagTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'meta-tag-generator')

const FIELD = 'min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:min-h-[40px]'
const LABEL = 'text-sm font-medium text-zinc-200'

function Hint({ value, limit }) {
  const { n, state } = lengthHint(value, limit)
  if (state === 'empty') return null
  return (
    <span className={`text-xs ${state === 'over' ? 'text-amber-400' : 'text-zinc-500'}`}>
      {n}/{limit}
      {state === 'over' && ' — may be cut off in search results'}
    </span>
  )
}

export default function MetaTagPage() {
  const [fields, setFields] = useState({
    title: '',
    description: '',
    url: '',
    image: '',
    siteName: '',
    twitterHandle: '',
    ogType: 'website',
    twitterCard: 'summary_large_image',
  })
  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }))
  const output = useMemo(() => buildMetaTags(fields), [fields])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="meta-title" className={LABEL}>
                Page title
              </label>
              <Hint value={fields.title} limit={TITLE_LIMIT} />
            </div>
            <input id="meta-title" data-testid="meta-title" className={FIELD} value={fields.title} onChange={set('title')} placeholder="Free Online JSON Formatter | MySite" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="meta-desc" className={LABEL}>
                Description
              </label>
              <Hint value={fields.description} limit={DESC_LIMIT} />
            </div>
            <textarea
              id="meta-desc"
              data-testid="meta-desc"
              className={`${FIELD} min-h-[80px] resize-y py-2`}
              value={fields.description}
              onChange={set('description')}
              placeholder="One or two sentences on what the page offers — this is your search-result pitch."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="meta-url" className={LABEL}>
              Canonical URL
            </label>
            <input id="meta-url" data-testid="meta-url" className={FIELD} value={fields.url} onChange={set('url')} placeholder="https://example.com/page" inputMode="url" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="meta-image" className={LABEL}>
              Social image URL <span className="font-normal text-zinc-500">(1200×630 recommended)</span>
            </label>
            <input id="meta-image" data-testid="meta-image" className={FIELD} value={fields.image} onChange={set('image')} placeholder="https://example.com/og.png" inputMode="url" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta-site" className={LABEL}>
                Site name
              </label>
              <input id="meta-site" data-testid="meta-site" className={FIELD} value={fields.siteName} onChange={set('siteName')} placeholder="MySite" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta-handle" className={LABEL}>
                Twitter/X handle
              </label>
              <input id="meta-handle" data-testid="meta-handle" className={FIELD} value={fields.twitterHandle} onChange={set('twitterHandle')} placeholder="@mysite" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta-ogtype" className={LABEL}>
                Open Graph type
              </label>
              <select id="meta-ogtype" data-testid="meta-ogtype" className={FIELD} value={fields.ogType} onChange={set('ogType')}>
                {OG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta-card" className={LABEL}>
                Twitter card
              </label>
              <select id="meta-card" data-testid="meta-card" className={FIELD} value={fields.twitterCard} onChange={set('twitterCard')}>
                {TWITTER_CARDS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {(fields.title || fields.description) && (
            <div className="flex flex-col gap-0.5 rounded-lg border border-zinc-800 p-4" data-testid="meta-serp">
              <p className="text-xs uppercase tracking-wide text-zinc-600">Search result preview</p>
              <p className="truncate text-xs text-emerald-400">{fields.url || 'https://example.com/page'}</p>
              <p className="truncate text-base text-sky-300">{fields.title.trim().slice(0, TITLE_LIMIT + 10) || 'Your page title'}</p>
              <p className="text-sm text-zinc-400">{(fields.description.trim() || 'Your description appears here.').slice(0, DESC_LIMIT + 10)}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">Generated tags</h2>
            {output && <CopyButton text={output} label="Copy tags" testid="meta-copy" />}
          </div>
          <pre
            data-testid="meta-output"
            className="min-h-[280px] flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-emerald-200"
          >
            {output || '— fill in the fields to generate your meta tags —'}
          </pre>
          <p className="text-xs text-zinc-500">
            Paste the block into your page’s <code className="text-zinc-400">&lt;head&gt;</code>. Everything is generated in your browser; nothing is uploaded.
          </p>
        </div>
      </div>
    </ToolShell>
  )
}
