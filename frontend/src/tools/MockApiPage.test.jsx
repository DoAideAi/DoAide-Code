import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MockApiPage from './MockApiPage.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MockApiPage', () => {
  it('starts with sample endpoints and blocks duplicates', () => {
    render(<MockApiPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mock an API in seconds')
    expect(screen.getByTestId('mock-endpoint-2')).toBeTruthy()
    fireEvent.change(screen.getByTestId('mock-path-1'), { target: { value: '/users' } })
    expect(screen.getByRole('alert').textContent).toContain('Same method and path')
    expect(screen.getByTestId('mock-save').disabled).toBe(true)
  })

  it('saves the mock and shows its URLs', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'abc12345', url: 'https://code.doaide.com/api/mock/abc12345' }) })
    vi.stubGlobal('fetch', fetch)
    render(<MockApiPage />)
    fireEvent.click(screen.getByTestId('mock-save'))
    expect((await screen.findByTestId('mock-base-url')).textContent).toBe('https://code.doaide.com/api/mock/abc12345')
    expect(screen.getByTestId('mock-url-1').textContent).toBe('GET https://code.doaide.com/api/mock/abc12345/users/1')
    expect(JSON.parse(fetch.mock.calls[0][1].body).endpoints).toHaveLength(3)
  })
})
