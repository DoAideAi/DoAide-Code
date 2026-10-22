import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import UrlPage from './UrlPage.jsx'

afterEach(cleanup)

describe('UrlPage', () => {
  it('encodes as you type in component mode', () => {
    render(<UrlPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('URL encode and decode')
    fireEvent.change(screen.getByTestId('url-plain'), { target: { value: 'a&b c' } })
    expect(screen.getByTestId('url-encoded').value).toBe('a%26b%20c')
  })

  it('keeps URL structure in whole-URL mode', () => {
    render(<UrlPage />)
    fireEvent.change(screen.getByTestId('url-plain'), { target: { value: 'https://x.com/a b?q=1' } })
    fireEvent.change(screen.getByTestId('url-mode'), { target: { value: 'url' } })
    expect(screen.getByTestId('url-encoded').value).toBe('https://x.com/a%20b?q=1')
  })

  it('decodes from the encoded pane, reading + as space', () => {
    render(<UrlPage />)
    fireEvent.change(screen.getByTestId('url-encoded'), { target: { value: 'caf%C3%A9+au+lait' } })
    expect(screen.getByTestId('url-plain').value).toBe('café au lait')
  })

  it('explains a stray % without clobbering the plain pane', () => {
    render(<UrlPage />)
    fireEvent.change(screen.getByTestId('url-plain'), { target: { value: 'keep' } })
    fireEvent.change(screen.getByTestId('url-encoded'), { target: { value: '100% sure' } })
    expect(screen.getByTestId('url-error').textContent).toMatch(/two hex digits/)
    expect(screen.getByTestId('url-plain').value).toBe('keep')
  })
})
