// The code playground's runners. Code executes inside a sandboxed iframe (allow-scripts only,
// so it never touches this origin, its storage or its cookies) and reports console output back
// through postMessage. JavaScript runs natively; Python runs on Pyodide (CPython on WebAssembly)
// fetched from a CDN on first run.

export const PLAYGROUND_LANGUAGES = ['JavaScript', 'Python']

// Longer than this and the run is stopped (the iframe is removed, which ends even `while(true)`).
export const RUN_TIMEOUT_MS = { JavaScript: 5_000, Python: 90_000 }

export const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'

// What the runner posts back: {type: 'log' | 'warn' | 'error' | 'done' | 'loading'}.

// The shared prologue: console capture and error reporting, as srcdoc-safe HTML.
const CONSOLE_CAPTURE = `
const seen = new WeakSet()
const show = (v) => {
  if (typeof v === 'string') return v
  if (v instanceof Error) return String(v)
  try { return JSON.stringify(v, (k, x) => {
    if (typeof x === 'object' && x !== null) { if (seen.has(x)) return '[circular]'; seen.add(x) }
    if (typeof x === 'bigint') return String(x) + 'n'
    if (typeof x === 'function') return '[function ' + (x.name || '') + ']'
    if (x === undefined) return '[undefined]'
    return x
  }) ?? String(v) } catch { return String(v) }
}
const post = (type, text) => parent.postMessage({ doaide: true, type, text }, '*')
for (const kind of [['log','log'],['info','log'],['debug','log'],['warn','warn'],['error','error']]) {
  console[kind[0]] = (...args) => post(kind[1], args.map(show).join(' '))
}
window.onerror = (msg, src, line) => { post('error', line ? msg + ' (line ' + line + ')' : String(msg)); return true }
window.onunhandledrejection = (e) => post('error', 'Unhandled rejection: ' + show(e.reason))
`

// A fresh document that runs `code` as JavaScript the moment the iframe loads.
export function jsRunnerDoc(code) {
  // The code travels as JSON, so nothing in it (not even </script>) can escape the script tag.
  const json = JSON.stringify(code).replace(/</g, '\\u003c')
  return `<!doctype html><html><body><script>
${CONSOLE_CAPTURE}
try { (0, eval)(${json}) } catch (err) { post('error', String(err)) }
setTimeout(() => post('done'), 60)
</scr` + `ipt></body></html>`
}

// A persistent document that loads Pyodide once, then runs whatever code is posted to it.
// Pyodide touches sessionStorage while loading, which throws in a sandboxed document, so the
// first script replaces both storages with harmless in-memory ones.
export function pyRunnerDoc() {
  return `<!doctype html><html><body><script>
const mem = () => { const m = new Map(); return {
  getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)),
  removeItem: (k) => m.delete(k), clear: () => m.clear(),
  key: (i) => [...m.keys()][i] ?? null, get length() { return m.size },
} }
try {
  Object.defineProperty(window, 'sessionStorage', { value: mem() })
  Object.defineProperty(window, 'localStorage', { value: mem() })
} catch {}
</scr` + `ipt><script src="${PYODIDE_URL}"></script><script>
${CONSOLE_CAPTURE}
post('loading')
const ready = loadPyodide()
window.addEventListener('message', async (e) => {
  if (!e.data || e.data.type !== 'run') return
  try {
    const py = await ready
    py.setStdout({ batched: (t) => post('log', t) })
    py.setStderr({ batched: (t) => post('error', t) })
    const result = await py.runPythonAsync(e.data.code)
    if (result !== undefined && result !== null) post('log', String(result))
  } catch (err) {
    post('error', String(err))
  }
  post('done')
})
ready.then(() => post('ready'), (err) => { post('error', 'Python could not load: ' + String(err)); post('done') })
</scr` + `ipt></body></html>`
}

// True for messages our runner sent (pages can receive messages from anywhere).
export function isRunnerMessage(event, iframe) {
  return Boolean(
    event.data && event.data.doaide === true && iframe && event.source === iframe.contentWindow,
  )
}

export const JS_EXAMPLE = `// Try me: press Run (or Cmd/Ctrl+Enter)
const squares = Array.from({ length: 5 }, (_, i) => i * i)
console.log('squares:', squares)
console.log('sum:', squares.reduce((a, b) => a + b, 0))`

export const PY_EXAMPLE = `# Try me: press Run (or Cmd/Ctrl+Enter)
squares = [i * i for i in range(5)]
print('squares:', squares)
print('sum:', sum(squares))`
