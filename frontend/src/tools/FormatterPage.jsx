// The code formatter (/tools/code-formatter): paste messy code, pick (or auto-detect) a language,
// get it back consistently indented. Runs in the page; nothing is uploaded.

import { useState } from 'react'
import CodeEditor, { savedEditorTheme } from './CodeEditor.jsx'
import RecentSnippets from './RecentSnippets.jsx'
import ShortcutsHelp from './ShortcutsHelp.jsx'
import { rememberSnippet } from './snippets.js'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { FORMAT_LANGUAGES, detectFormatLanguage, formatCode } from './format.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'code-formatter')
export const MAX_FORMAT_CHARS = 100_000

const PLACEHOLDER = `function greet(name){if(!name){return "hello"}
return "hello "+name}`

export default function FormatterPage() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('Auto-detect')
  const [indent, setIndent] = useState(2)
  const [result, setResult] = useState(null)
  const [historyAt, setHistoryAt] = useState(0)

  const tooLong = code.length > MAX_FORMAT_CHARS
  const run = () => {
    if (tooLong) return
    const chosen = language === 'Auto-detect' ? detectFormatLanguage(code) : language
    rememberSnippet('code-formatter', code, chosen)
    setHistoryAt(Date.now())
    setResult({ ...formatCode(chosen, code, { indent }), language: chosen })
  }

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-2">
        <label htmlFor="fmt-code" className="sr-only">
          Your code
        </label>
        <CodeEditor
          id="fmt-code"
          testid="fmt-code"
          value={code}
          onChange={setCode}
          onRun={run}
          placeholder={PLACEHOLDER}
          language={language === 'Auto-detect' ? '' : language}
          theme={savedEditorTheme()}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="fmt-language">
            Language
          </label>
          <select
            id="fmt-language"
            data-testid="fmt-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
          >
            {['Auto-detect', ...FORMAT_LANGUAGES].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="fmt-indent">
            Indentation
          </label>
          <select
            id="fmt-indent"
            data-testid="fmt-indent"
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
          <RecentSnippets
            scope="code-formatter"
            refreshKey={historyAt}
            onRestore={(s) => {
              setCode(s.code)
              if (FORMAT_LANGUAGES.includes(s.language)) setLanguage(s.language)
            }}
          />
          <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {code.length.toLocaleString()} / {MAX_FORMAT_CHARS.toLocaleString()}
          </span>
          <button
            type="button"
            data-testid="fmt-run"
            onClick={run}
            disabled={tooLong}
            className="min-h-[44px] rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]"
          >
            Format
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-500">Ctrl/⌘ + Enter to format. Your code never leaves this page.</p>
          <ShortcutsHelp />
        </div>
      </div>

      {result && !result.ok && (
        <p role="alert" data-testid="fmt-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <section aria-label="Formatted code" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">
              Formatted as {result.language}
            </h2>
            <div className="ml-auto flex gap-2">
              <CopyButton text={result.out} label="Copy result" testid="fmt-copy" />
              <button
                type="button"
                data-testid="fmt-use"
                onClick={() => {
                  setCode(result.out)
                  setResult(null)
                }}
                className={BUTTON}
              >
                Use as input
              </button>
            </div>
          </div>
          {result.note && <p className="text-xs text-zinc-500">{result.note}</p>}
          <pre data-testid="fmt-out" className="overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-zinc-200">
            {result.out}
          </pre>
        </section>
      )}
    </ToolShell>
  )
}
