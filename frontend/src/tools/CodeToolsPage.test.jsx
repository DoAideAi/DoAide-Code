import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CodeToolsPage from './CodeToolsPage.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CodeToolsPage', () => {
  it('runs the tool without signing in and renders the answer with code', async () => {
    let resolve
    vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => (resolve = r))))
    render(<CodeToolsPage initialPath="/tools/find-bugs" initialHash="" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Find bugs in your code')
    expect(screen.getByTestId('tool-whatsapp').getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByTestId('tool-whatsapp').getAttribute('href')).toBeNull()
    fireEvent.click(screen.getByTestId('tool-run'))
    expect(screen.getByTestId('tool-error').textContent).toBe('Paste some code first.')
    fireEvent.change(screen.getByTestId('tool-code'), { target: { value: 'for (i = 0; i <= n; i++)' } })
    fireEvent.click(screen.getByTestId('tool-run'))
    expect(screen.getByTestId('tool-loading')).toBeTruthy()
    expect(screen.getByTestId('tool-run').disabled).toBe(true)
    resolve({ ok: true, json: async () => ({ answer: 'Off by one.\n\n```js\ni < n\n```' }) })
    await waitFor(() => expect(screen.getByTestId('tool-answer')).toBeTruthy())
    expect(screen.getByTestId('tool-answer').textContent).toContain('Off by one.')
    expect(screen.getByTestId('code-lang').textContent).toBe('js')
    expect(JSON.parse(fetch.mock.calls.at(-1)[1].body).action).toBe('bugs')
  })

  it('opens shared code and offers WhatsApp sharing', () => {
    const hash = '#code=' + btoa('x = 1').replace(/=+$/, '') + '&lang=Python'
    render(<CodeToolsPage initialPath="/tools/explain-code" initialHash={hash} />)
    expect(screen.getByTestId('tool-code').value).toBe('x = 1')
    expect(screen.getByTestId('tool-language').value).toBe('Python')
    expect(screen.getByTestId('tool-whatsapp').getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('switches tools in place and moves focus to the new heading', async () => {
    render(<CodeToolsPage initialPath="/tools/explain-code" initialHash="" />)
    fireEvent.click(screen.getByRole('tab', { name: 'Review' }))
    expect(window.location.pathname).toBe('/tools/code-review')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('Free AI code review')
    await waitFor(() => expect(document.activeElement).toBe(heading))
  })

  it('links the utilities from the tool switcher, with a skip link', () => {
    render(<CodeToolsPage initialPath="/tools/explain-code" initialHash="" />)
    expect(screen.getByRole('link', { name: /Diff checker/ }).getAttribute('href')).toBe('/tools/diff-checker')
    expect(screen.getByText('Skip to the tool').getAttribute('href')).toBe('#tool-main')
  })

  it('remembers a run in the recent snippets history', async () => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ answer: 'ok' }) })))
    render(<CodeToolsPage initialPath="/tools/explain-code" initialHash="" />)
    expect(screen.queryByTestId('recent-snippets')).toBeNull()
    fireEvent.change(screen.getByTestId('tool-code'), { target: { value: 'x = 1' } })
    fireEvent.click(screen.getByTestId('tool-run'))
    await waitFor(() => expect(screen.getByTestId('tool-answer')).toBeTruthy())
    expect(screen.getByTestId('recent-snippets').textContent).toContain('x = 1')
  })

  it('converts with a chosen target language', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ answer: 'converted' }) })))
    render(<CodeToolsPage initialPath="/tools/convert-code" initialHash="" />)
    fireEvent.change(screen.getByTestId('tool-code'), { target: { value: 'x = 1' } })
    fireEvent.change(screen.getByTestId('tool-target'), { target: { value: 'Go' } })
    fireEvent.click(screen.getByTestId('tool-run'))
    await waitFor(() => expect(screen.getByTestId('tool-answer')).toBeTruthy())
    expect(JSON.parse(fetch.mock.calls.at(-1)[1].body)).toMatchObject({ action: 'convert', target: 'Go' })
  })

  it('hides the target picker away from Convert', () => {
    render(<CodeToolsPage initialPath="/tools/optimize-code" initialHash="" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Optimize your code for performance')
    expect(screen.queryByTestId('tool-target')).toBeNull()
  })

  it('shows how many snippets were analyzed once the stats arrive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ snippets: 1234 }) })))
    render(<CodeToolsPage initialPath="/tools/explain-code" initialHash="" />)
    await waitFor(() => expect(screen.getByTestId('tool-stats').textContent).toBe('1,234 snippets analyzed so far'))
  })

  it('shows the server error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ detail: 'Wait a few minutes.' }) })))
    render(<CodeToolsPage initialPath="/tools/code-review" initialHash="" />)
    fireEvent.change(screen.getByTestId('tool-code'), { target: { value: 'x' } })
    fireEvent.click(screen.getByTestId('tool-run'))
    await waitFor(() => expect(screen.getByTestId('tool-error').textContent).toBe('Wait a few minutes.'))
  })
})
