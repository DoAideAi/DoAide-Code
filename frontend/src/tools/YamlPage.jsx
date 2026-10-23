// The YAML ↔ JSON converter page (/tools/yaml-to-json): type on the left, read the other format on
// the right, with the line of any syntax error. Runs in the page.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { jsonToYaml, yamlToJson } from './yamlTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'yaml-to-json')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'

const SAMPLE = `# docker-compose style config
defaults: &defaults
  restart: unless-stopped
  environment:
    NODE_ENV: production

services:
  web:
    <<: *defaults
    image: node:20-alpine
    ports:
      - "3000:3000"
  worker:
    <<: *defaults
    image: node:20-alpine
    command: npm run worker
`

export default function YamlPage() {
  const [toYaml, setToYaml] = useState(false) // false: YAML → JSON
  const [text, setText] = useState(SAMPLE)
  const [indent, setIndent] = useState(2)
  const [multiDoc, setMultiDoc] = useState(false)

  const result = useMemo(() => (toYaml ? jsonToYaml(text, { indent, multiDoc }) : yamlToJson(text, indent)), [text, toYaml, indent, multiDoc])
  const output = (toYaml ? result.yaml : result.json) ?? ''
  const [from, to] = toYaml ? ['JSON', 'YAML'] : ['YAML', 'JSON']

  // Flip direction, carrying the current output over as the new input when there is one.
  const swap = () => {
    if (output) setText(output)
    setToYaml(!toYaml)
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
        <button type="button" data-testid="yaml-swap" className={`${BUTTON} border-sky-800 text-sky-300`} onClick={swap}>
          {from} → {to} ⇄
        </button>
        <label className="flex items-center gap-2">
          Indent
          <select data-testid="yaml-indent" value={indent} onChange={(e) => setIndent(Number(e.target.value))} className="min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 sm:min-h-[36px]">
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </label>
        {toYaml && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={multiDoc} onChange={(e) => setMultiDoc(e.target.checked)} className="h-4 w-4 accent-sky-500" />
            Top-level array as --- documents
          </label>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {from}
          <textarea
            data-testid="yaml-in"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            spellCheck={false}
            className={`w-full resize-y rounded-lg border bg-shade/40 p-3 text-zinc-200 ${MONO} ${result.error ? 'border-rose-800' : 'border-zinc-800'}`}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>
              {to}
              {result.documents > 1 && <span className="text-zinc-500"> — {result.documents} documents as an array</span>}
            </span>
            <CopyButton text={output} label={`Copy ${to}`} testid="yaml-copy" />
          </div>
          {result.error ? (
            <p role="alert" data-testid="yaml-error" className="rounded border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
              {result.error.line ? `Line ${result.error.line}, column ${result.error.col}: ` : ''}
              {result.error.message}
            </p>
          ) : (
            <pre data-testid="yaml-out" className={`max-h-[36rem] min-h-[10rem] overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-emerald-200 ${MONO}`}>
              {output}
            </pre>
          )}
          <p className="text-xs text-zinc-500">YAML 1.2: only true/false are booleans, so yes/no/on/off stay strings. Anchors, aliases and &lt;&lt; merge keys are expanded.</p>
        </div>
      </div>
    </ToolShell>
  )
}
