// The table of contents generator page (/tools/markdown-toc): paste markdown, pick the heading
// levels and list style, copy the TOC — or the whole document with the TOC inserted.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { buildToc, extractHeadings, insertToc } from './tocTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'markdown-toc')

const SELECT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

const SAMPLE = `# My Project

A short description of what it does.

## Installation

### With npm

### With Docker

## Usage

### Configuration options

### Environment variables

## API reference

## Contributing

## License
`

export default function TocPage() {
  const [md, setMd] = useState(SAMPLE)
  const [minLevel, setMinLevel] = useState(2)
  const [maxLevel, setMaxLevel] = useState(3)
  const [ordered, setOrdered] = useState(false)
  const [indent, setIndent] = useState(2)
  const [links, setLinks] = useState(true)

  const headings = useMemo(() => extractHeadings(md), [md])
  const toc = buildToc(headings, { minLevel, maxLevel, ordered, indent, links })
  const shown = headings.filter((h) => h.level >= minLevel && h.level <= maxLevel)
  const top = shown.length ? Math.min(...shown.map((h) => h.level)) : 1

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
        <label className="flex items-center gap-2">
          From
          <select aria-label="Smallest heading level" data-testid="toc-min" value={minLevel} onChange={(e) => setMinLevel(Math.min(Number(e.target.value), maxLevel))} className={SELECT}>
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <option key={l} value={l}>
                H{l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          to
          <select aria-label="Deepest heading level" data-testid="toc-max" value={maxLevel} onChange={(e) => setMaxLevel(Math.max(Number(e.target.value), minLevel))} className={SELECT}>
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <option key={l} value={l}>
                H{l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Indent
          <select aria-label="Indent" value={indent} onChange={(e) => setIndent(Number(e.target.value))} className={SELECT}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" data-testid="toc-ordered" checked={ordered} onChange={(e) => setOrdered(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Numbered
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" data-testid="toc-links" checked={links} onChange={(e) => setLinks(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Anchor links
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Your markdown
          <textarea
            data-testid="toc-in"
            value={md}
            onChange={(e) => setMd(e.target.value)}
            rows={18}
            spellCheck={false}
            placeholder="# Paste a README or any markdown"
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 ${MONO}`}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-300">
            <span>
              Table of contents <span className="text-zinc-500">· {shown.length} of {headings.length} headings</span>
            </span>
            <div className="flex gap-1">
              <CopyButton text={toc} label="Copy TOC" testid="toc-copy" />
              <CopyButton text={insertToc(md, toc)} label="Copy document with TOC" testid="toc-copy-doc" />
              <button type="button" className={BUTTON} onClick={() => setMd(insertToc(md, toc))} disabled={!toc}>
                Insert into document
              </button>
            </div>
          </div>
          <pre data-testid="toc-out" className={`min-h-[120px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-emerald-200 ${MONO}`}>
            {toc || 'No headings in that range yet — headings start with #, ##, ###…'}
          </pre>
          {shown.length > 0 && (
            <nav aria-label="Preview" className="rounded-lg border border-zinc-800 p-3 text-sm">
              <p className="pb-1 text-xs text-zinc-500">Preview</p>
              <ul className="flex flex-col gap-0.5">
                {shown.map((h) => (
                  <li key={h.line} style={{ paddingLeft: `${(h.level - top) * 1.1}rem` }} className="text-sky-300">
                    {h.text} <span className="font-mono text-xs text-zinc-600">#{h.slug}</span>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <p className="text-xs text-zinc-500">
            Anchors follow GitHub’s rules (also used by GitLab, VS Code and most static site generators). “Insert” wraps the TOC
            in &lt;!-- toc --&gt; markers, so running it again replaces the old one.
          </p>
        </div>
      </div>
    </ToolShell>
  )
}
