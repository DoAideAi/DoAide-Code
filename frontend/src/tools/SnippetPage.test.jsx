import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SnippetPage from './SnippetPage.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const SNIPPET = { id: 'abc12345', code: 'def hi():\n    return 1', language: 'python', title: 'Hello', views: 4 }

describe('SnippetPage', () => {
  it('loads and shows the snippet with its title, language and views', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => SNIPPET }))
    render(<SnippetPage path="/s/abc12345" />)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hello'))
    expect(screen.getByTestId('snippet-code').textContent).toContain('def hi():')
    expect(screen.getByText(/python · 4 views/)).toBeTruthy()
    expect(document.title).toContain('Hello')
  })

  it('shows a not-found message for a dead link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
    render(<SnippetPage path="/s/zzzzzzzz" />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('No snippet lives at this link.'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Snippet not found')
  })

  it('treats a malformed path as not found without calling the server', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<SnippetPage path="/s/not!an!id" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Snippet not found')
    expect(fetch).not.toHaveBeenCalled()
  })
})
