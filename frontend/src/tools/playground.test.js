import { describe, expect, it } from 'vitest'
import { isRunnerMessage, jsRunnerDoc, pyRunnerDoc } from './playground.js'

describe('jsRunnerDoc', () => {
  it('carries the code as JSON so nothing can escape the script tag', () => {
    const doc = jsRunnerDoc('console.log("</script><img src=x>")')
    expect(doc).not.toContain('</script><img')
    expect(doc).toContain('\\u003c/script')
    expect(doc).toContain('(0, eval)(')
  })

  it('captures console output and errors', () => {
    const doc = jsRunnerDoc('1 + 1')
    for (const piece of ['console[kind[0]]', 'window.onerror', 'onunhandledrejection', "post('done')"]) {
      expect(doc).toContain(piece)
    }
  })
})

describe('pyRunnerDoc', () => {
  it('loads Pyodide and waits for run messages', () => {
    const doc = pyRunnerDoc()
    expect(doc).toContain('cdn.jsdelivr.net/pyodide')
    expect(doc).toContain('loadPyodide()')
    expect(doc).toContain("e.data.type !== 'run'")
    expect(doc).toContain('runPythonAsync')
  })

  it('shims the storages Pyodide touches before loading it (they throw when sandboxed)', () => {
    const doc = pyRunnerDoc()
    expect(doc.indexOf("'sessionStorage'")).toBeGreaterThan(-1)
    expect(doc.indexOf("'sessionStorage'")).toBeLessThan(doc.indexOf('pyodide.js'))
  })
})

describe('isRunnerMessage', () => {
  const win = {}
  const iframe = { contentWindow: win }
  it('accepts only marked messages from the runner iframe', () => {
    expect(isRunnerMessage({ data: { doaide: true, type: 'log' }, source: win }, iframe)).toBe(true)
    expect(isRunnerMessage({ data: { doaide: true, type: 'log' }, source: {} }, iframe)).toBe(false)
    expect(isRunnerMessage({ data: { type: 'log' }, source: win }, iframe)).toBe(false)
    expect(isRunnerMessage({ data: null, source: win }, iframe)).toBe(false)
    expect(isRunnerMessage({ data: { doaide: true }, source: win }, null)).toBe(false)
  })
})
