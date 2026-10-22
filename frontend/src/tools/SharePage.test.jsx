import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SharePage from './SharePage.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SharePage', () => {
  it('creates a link and shows it with copy and WhatsApp buttons', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'abc12345', url: 'https://code.doaide.com/s/abc12345' }),
    })
    vi.stubGlobal('fetch', fetch)
    render(<SharePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Share code with a short link')
    expect(screen.getByTestId('share-run').disabled).toBe(true)
    fireEvent.change(screen.getByTestId('share-code'), { target: { value: 'x = 1' } })
    fireEvent.click(screen.getByTestId('share-run'))
    await waitFor(() => expect(screen.getByTestId('share-link').textContent).toContain('/s/abc12345'))
    expect(screen.getByTestId('share-copy')).toBeTruthy()
  })

  it('shows the server error when creation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ detail: 'Too fast.' }) }),
    )
    render(<SharePage />)
    fireEvent.change(screen.getByTestId('share-code'), { target: { value: 'x = 1' } })
    fireEvent.click(screen.getByTestId('share-run'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Too fast.'))
  })

  it('refuses code over the share limit without calling the server', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<SharePage />)
    fireEvent.change(screen.getByTestId('share-code'), { target: { value: 'x'.repeat(20_001) } })
    expect(screen.getByRole('alert').textContent).toMatch(/too much code/)
    fireEvent.click(screen.getByTestId('share-run'))
    expect(fetch).not.toHaveBeenCalled()
  })
})
