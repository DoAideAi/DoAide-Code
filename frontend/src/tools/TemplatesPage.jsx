// The code templates library (/tools/code-templates): browse pre-built starting points by
// category, preview them highlighted, copy one, or send it into the AI tools.

import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/MessageList.jsx'
import { TOOLS, shareLink } from './codeTools.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { TEMPLATES, TEMPLATE_CATEGORIES, filterTemplates } from './templates.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'code-templates')
const EXPLAIN = TOOLS.find((t) => t.slug === 'explain-code')

function TemplateCard({ template }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-zinc-100">{template.name}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{template.description}</p>
        </div>
        <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">{template.language}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={`tpl-toggle-${template.id}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={BUTTON}
        >
          {open ? 'Hide code' : 'View code'}
        </button>
        <CopyButton text={template.code} label="Copy code" testid={`tpl-copy-${template.id}`} />
        <a
          href={shareLink(EXPLAIN, template.code, template.language)}
          className="flex min-h-[44px] items-center rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]"
        >
          Explain with AI
        </a>
      </div>
      {open && (
        <div data-testid={`tpl-code-${template.id}`}>
          <CodeBlock value={template.code} lang={template.language.toLowerCase()} />
        </div>
      )}
    </article>
  )
}

export default function TemplatesPage() {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const shown = useMemo(() => filterTemplates(category, query), [category, query])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Template categories" className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`tpl-cat-${c}`}
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
              className={`min-h-[44px] shrink-0 rounded-md px-3 text-sm sm:min-h-[36px] ${
                c === category ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="tpl-search" className="sr-only">
            Search templates
          </label>
          <input
            id="tpl-search"
            data-testid="tpl-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates (fetch, class, server, …)"
            className="min-h-[44px] w-full rounded-lg border border-zinc-800 bg-shade/40 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:max-w-sm"
          />
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-zinc-500">
        {shown.length} of {TEMPLATES.length} templates
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
      {shown.length === 0 && (
        <p data-testid="tpl-empty" className="text-sm text-zinc-500">
          Nothing matches that search — try a language name or “server”, “test”, “class”.
        </p>
      )}
    </ToolShell>
  )
}
