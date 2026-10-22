// The string utilities (/tools/string-utilities): one input, every conversion live — cases,
// slug, reversed — with counts along the top.

import { useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { CASES, MAX_STRING_CHARS, countString, reverseString, slugify } from './stringTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'string-utilities')

function Row({ label, value, testid }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 py-2 last:border-b-0">
      <span className="w-40 shrink-0 text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <code data-testid={testid} className="min-w-0 flex-1 break-all font-mono text-[13px] text-zinc-200">
        {value}
      </code>
      <CopyButton text={value} testid={`${testid}-copy`} />
    </div>
  )
}

export default function StringPage() {
  const [text, setText] = useState('')
  const counts = countString(text)
  const slug = (label) => `str-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="str-input" className="text-sm font-medium text-zinc-200">
          Your text
        </label>
        <textarea
          id="str-input"
          data-testid="str-input"
          value={text}
          maxLength={MAX_STRING_CHARS}
          onChange={(e) => setText(e.target.value)}
          placeholder="hello world example"
          spellCheck={false}
          className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <p data-testid="str-counts" className="text-xs text-zinc-500">
          {counts.chars} characters · {counts.words} words · {counts.lines} lines · {counts.bytes} UTF-8 bytes. Nothing leaves this page.
        </p>
      </div>

      {text.trim() && (
        <div className="flex flex-col rounded-lg border border-zinc-800 p-4">
          {CASES.map(([label, fn]) => (
            <Row key={label} label={label} value={fn(text)} testid={slug(label)} />
          ))}
          <Row label="Slug" value={slugify(text)} testid="str-slug" />
          <Row label="Reversed" value={reverseString(text)} testid="str-reversed" />
        </div>
      )}
    </ToolShell>
  )
}
