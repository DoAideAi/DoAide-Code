// The code playground (/tools/code-playground): type JavaScript or Python, press Run, see the
// output. JavaScript runs in a fresh sandboxed iframe per run; Python runs on Pyodide in one
// persistent iframe, so the ~10 MB runtime downloads once per visit, on the first run.

import { useEffect, useRef, useState } from 'react'
import CodeEditor from './CodeEditor.jsx'
import ShortcutsHelp from './ShortcutsHelp.jsx'
import ToolShell, { BUTTON } from './ToolShell.jsx'
import {
  JS_EXAMPLE,
  PLAYGROUND_LANGUAGES,
  PY_EXAMPLE,
  RUN_TIMEOUT_MS,
  isRunnerMessage,
  jsRunnerDoc,
  pyRunnerDoc,
} from './playground.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'code-playground')

const LINE_CLASS = {
  log: 'text-zinc-200',
  warn: 'text-amber-300',
  error: 'text-red-300',
  note: 'text-zinc-500 italic',
}

export default function PlaygroundPage() {
  const [language, setLanguage] = useState(PLAYGROUND_LANGUAGES[0])
  const [code, setCode] = useState(JS_EXAMPLE)
  const [lines, setLines] = useState([])
  const [running, setRunning] = useState(false)
  const [doc, setDoc] = useState(null) // the JS iframe's srcdoc for the current run
  const [pyLive, setPyLive] = useState(false) // the Python iframe stays once started
  const frameRef = useRef(null)
  const pyFrameRef = useRef(null)
  const timerRef = useRef(null)
  const edited = useRef(false)

  // Swapping language swaps the example, but never code someone typed.
  const pickLanguage = (next) => {
    setLanguage(next)
    setLines([])
    if (!edited.current) setCode(next === 'Python' ? PY_EXAMPLE : JS_EXAMPLE)
  }

  const stop = (note) => {
    clearTimeout(timerRef.current)
    setRunning(false)
    setDoc(null)
    if (note) setLines((old) => [...old, { kind: 'error', text: note }])
  }

  const run = () => {
    if (running || !code.trim()) return
    setLines([])
    setRunning(true)
    if (language === 'Python') {
      if (pyLive) pyFrameRef.current?.contentWindow?.postMessage({ type: 'run', code }, '*')
      else setPyLive(true) // the iframe mounts, loads Pyodide, and asks for the code when ready
    } else {
      setDoc(null) // a fresh iframe per run, so state never leaks between runs
      setTimeout(() => setDoc(jsRunnerDoc(code)), 0)
    }
    timerRef.current = setTimeout(() => {
      if (language === 'Python') {
        setPyLive(false)
        stop('That took too long and was stopped. The Python runtime will reload on the next run.')
      } else {
        stop('That took too long (over 5 seconds) and was stopped.')
      }
    }, RUN_TIMEOUT_MS[language])
  }

  // Output arrives from whichever runner iframe is live.
  const codeRef = useRef(code)
  codeRef.current = code
  useEffect(() => {
    const onMessage = (e) => {
      const fromJs = isRunnerMessage(e, frameRef.current)
      const fromPy = isRunnerMessage(e, pyFrameRef.current)
      if (!fromJs && !fromPy) return
      const { type, text } = e.data
      if (type === 'loading') setLines([{ kind: 'note', text: 'Downloading the Python runtime (~10 MB, once per visit)…' }])
      else if (type === 'ready') {
        setLines([])
        pyFrameRef.current?.contentWindow?.postMessage({ type: 'run', code: codeRef.current }, '*')
      } else if (type === 'done') {
        clearTimeout(timerRef.current)
        setRunning(false)
        setLines((old) => (old.length ? old : [{ kind: 'note', text: 'Ran with no output.' }]))
      } else setLines((old) => [...old, { kind: type, text }])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="playground-language">
            Language
          </label>
          <select
            id="playground-language"
            data-testid="playground-language"
            value={language}
            onChange={(e) => pickLanguage(e.target.value)}
            className="min-h-[44px] rounded-md border border-zinc-800 bg-surface px-2 text-sm text-zinc-300 sm:min-h-[40px]"
          >
            {PLAYGROUND_LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button
            type="button"
            data-testid="playground-run"
            onClick={run}
            disabled={running || !code.trim()}
            className={`${BUTTON} disabled:opacity-50`}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          <ShortcutsHelp />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="playground-code" className="text-xs font-medium text-zinc-400">
            Your code
          </label>
          <CodeEditor
            id="playground-code"
            testid="playground-code"
            value={code}
            onChange={(value) => {
              edited.current = true
              setCode(value)
            }}
            onRun={run}
            language={language}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Code runs in a sandboxed frame in your browser: it never reaches a server and can't touch this site's data.
          JavaScript runs natively; Python runs on Pyodide (CPython compiled to WebAssembly).
        </p>
      </div>

      <section aria-label="Output" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-200">Output</h2>
        <pre
          data-testid="playground-output"
          aria-live="polite"
          className="min-h-[80px] overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-shade/40 p-3 font-mono text-[16px] leading-relaxed sm:text-[13px]"
        >
          {lines.map((l, i) => (
            <span key={i} className={`block ${LINE_CLASS[l.kind] ?? LINE_CLASS.log}`}>
              {l.text}
            </span>
          ))}
        </pre>
      </section>

      {doc !== null && (
        <iframe
          ref={frameRef}
          data-testid="playground-frame"
          sandbox="allow-scripts"
          srcDoc={doc}
          title="JavaScript runner"
          className="hidden"
        />
      )}
      {pyLive && (
        <iframe
          ref={pyFrameRef}
          data-testid="playground-py-frame"
          sandbox="allow-scripts"
          srcDoc={pyRunnerDoc()}
          title="Python runner"
          className="hidden"
        />
      )}
    </ToolShell>
  )
}
