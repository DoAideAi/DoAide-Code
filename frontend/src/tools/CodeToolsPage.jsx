import { useEffect, useRef, useState } from 'react'
import { CodeBlock, copyText, splitFences } from '../components/MessageList.jsx'
import { Markdown } from '../markdown.jsx'
import CodeEditor, { EDITOR_THEMES, saveEditorTheme, savedEditorTheme } from './CodeEditor.jsx'
import RecentSnippets from './RecentSnippets.jsx'
import ShortcutsHelp from './ShortcutsHelp.jsx'
import { rememberSnippet } from './snippets.js'
import ToolTabs from './ToolTabs.jsx'
import {
  LANGUAGES,
  MAX_CODE_CHARS,
  TARGET_LANGUAGES,
  applyMeta,
  fetchToolStats,
  readShared,
  runTool,
  shareLink,
  toolForPath,
  whatsappUrl,
} from './codeTools.js'

const PLACEHOLDER = `function average(nums) {
  let total = 0
  for (let i = 0; i <= nums.length; i++) total += nums[i]
  return total / nums.length
}`

function Answer({ text }) {
  return (
    <div data-testid="tool-answer" className="text-sm leading-relaxed text-zinc-200">
      {splitFences(text).map((part, i) =>
        part.kind === 'code' ? <CodeBlock key={i} value={part.value} lang={part.lang} /> : <Markdown key={i} text={part.value} />,
      )}
    </div>
  )
}

function CopyLink({ text, label, testid }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        }
      }}
      className="min-h-[44px] rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]"
    >
      {done ? 'Copied' : label}
    </button>
  )
}

// The free tools page: no sign-in, one URL per tool (/tools/explain-code, …).
export default function CodeToolsPage({ initialPath = window.location.pathname, initialHash = window.location.hash }) {
  const [tool, setTool] = useState(() => toolForPath(initialPath))
  const shared = readShared(initialHash)
  const [code, setCode] = useState(shared?.code ?? '')
  const [language, setLanguage] = useState(LANGUAGES.includes(shared?.language) ? shared.language : LANGUAGES[0])
  const [target, setTarget] = useState('Python')
  const [editorTheme, setEditorTheme] = useState(savedEditorTheme)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  // How many snippets all visitors have analyzed; null until known (then the line stays away).
  const [analyzed, setAnalyzed] = useState(null)
  // Bumped after a run saves to the recent-snippets history, so the picker shows it.
  const [historyAt, setHistoryAt] = useState(0)

  useEffect(() => {
    let active = true
    fetchToolStats().then((count) => active && setAnalyzed(count))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => applyMeta(tool), [tool])
  useEffect(() => {
    const onPop = () => setTool(toolForPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // After a tab switch, focus moves to the new heading so screen readers hear where they landed.
  const headingRef = useRef(null)
  const choose = (next, event) => {
    event.preventDefault()
    if (next === tool) return
    window.history.pushState(null, '', `/tools/${next.slug}`)
    setTool(next)
    setAnswer('')
    setError(null)
    setTimeout(() => headingRef.current?.focus(), 0)
  }

  const run = async () => {
    if (loading) return
    if (!code.trim()) {
      setError('Paste some code first.')
      return
    }
    setLoading(true)
    setError(null)
    setAnswer('')
    rememberSnippet('ai', code, language === LANGUAGES[0] ? '' : language)
    setHistoryAt(Date.now())
    try {
      setAnswer(await runTool(tool.action, code, language, tool.needsTarget ? target : ''))
      setAnalyzed((count) => (count ? count + 1 : count))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tooLong = code.length > MAX_CODE_CHARS
  return (
    <div data-testid="tools-page" className="h-[100dvh] overflow-y-auto">
      <a
        href="#tool-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-md focus:bg-zinc-800 focus:px-3 focus:py-2 focus:text-sm focus:text-zinc-100"
      >
        Skip to the tool
      </a>
      <nav aria-label="Site" className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <a href="/" className="text-sm font-medium text-zinc-200 hover:text-zinc-50">
          DoAide Code
        </a>
        <a href="/" className="flex min-h-[44px] items-center rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]">
          Sign in
        </a>
      </nav>
      <main id="tool-main" tabIndex={-1} className="mx-auto flex max-w-4xl flex-col gap-5 px-4 pb-12 pt-4 focus:outline-none">
        <header className="flex flex-col gap-2">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-zinc-100 focus:outline-none sm:text-3xl">
            {tool.heading}
          </h1>
          <p className="text-sm text-zinc-400">{tool.description}</p>
          {analyzed && (
            <p data-testid="tool-stats" className="text-xs text-zinc-500">
              <span className="tabular-nums">{analyzed.toLocaleString()}</span> snippet{analyzed === 1 ? '' : 's'} analyzed so far
            </p>
          )}
        </header>

        <ToolTabs activeSlug={tool.slug} onChoose={choose} />

        <div className="flex flex-col gap-2">
          <label htmlFor="tool-code" className="sr-only">
            Your code
          </label>
          <CodeEditor
            id="tool-code"
            testid="tool-code"
            value={code}
            onChange={setCode}
            onRun={run}
            placeholder={PLACEHOLDER}
            language={language}
            theme={editorTheme}
          />
          {/* Selects and the counter on one line; actions on their own line on phones, where they
              share the width and stay 44px tall for thumbs. */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="tool-language">
              Language
            </label>
            <select
              id="tool-language"
              data-testid="tool-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            {tool.needsTarget && (
              <>
                <span className="text-xs text-zinc-500">to</span>
                <label className="sr-only" htmlFor="tool-target">
                  Convert to
                </label>
                <select
                  id="tool-target"
                  data-testid="tool-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
                >
                  {TARGET_LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </>
            )}
            <label className="sr-only" htmlFor="tool-theme">
              Editor theme
            </label>
            <select
              id="tool-theme"
              data-testid="tool-theme"
              value={editorTheme}
              onChange={(e) => {
                setEditorTheme(e.target.value)
                saveEditorTheme(e.target.value)
              }}
              className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
            >
              {Object.keys(EDITOR_THEMES).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <RecentSnippets
              scope="ai"
              refreshKey={historyAt}
              onRestore={(s) => {
                setCode(s.code)
                if (LANGUAGES.includes(s.language)) setLanguage(s.language)
              }}
            />
            <span className={`ml-auto text-xs tabular-nums ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
              {code.length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Always there (inactive until there is code), so the Run button never jumps. */}
            <a
              data-testid="tool-whatsapp"
              href={code.trim() ? whatsappUrl(tool, code, language) : undefined}
              aria-disabled={!code.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-emerald-700/60 px-3 text-sm text-emerald-300 hover:bg-emerald-900/30 sm:min-h-[40px] sm:flex-none ${
                code.trim() ? '' : 'pointer-events-none opacity-40'
              }`}
            >
              Share on WhatsApp
            </a>
            <div className="hidden flex-1 sm:block" />
            <button
              type="button"
              data-testid="tool-run"
              onClick={run}
              disabled={loading || tooLong}
              className="min-h-[44px] flex-1 rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px] sm:flex-none"
            >
              {loading ? 'Thinking…' : tool.button}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-zinc-500">Ctrl/⌘ + Enter to run. Don't paste passwords or API keys.</p>
            <ShortcutsHelp />
          </div>
        </div>

        {error && (
          <p role="alert" data-testid="tool-error" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {loading && (
          <div data-testid="tool-loading" aria-live="polite" className="flex flex-col gap-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-zinc-800" />
          </div>
        )}
        {answer && (
          <section aria-label="Answer" aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
            <Answer text={answer} />
            <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
              <CopyLink text={answer} label="Copy answer" testid="tool-copy" />
              <CopyLink text={shareLink(tool, code, language)} label="Copy link to this code" testid="tool-link" />
            </div>
          </section>
        )}

        <section className="mt-6 flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-400">
          <h2 className="text-sm font-medium text-zinc-200">Want this inside your own project?</h2>
          <p>
            DoAide Code is an AI coding assistant that works on your whole codebase. It tries a free model on your
            laptop first and uses Claude only when it needs to, so most tasks cost nothing.
          </p>
          <a href="/" className="self-start text-sky-300 underline hover:text-sky-200">
            Learn more about DoAide Code
          </a>
        </section>
      </main>
    </div>
  )
}
