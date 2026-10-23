import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FaviconPage from './FaviconPage.jsx'

afterEach(cleanup)

describe('FaviconPage', () => {
  it('renders the drop zone and no grid yet', () => {
    render(<FaviconPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate favicons from an image')
    expect(screen.getByTestId('favicon-drop')).toBeTruthy()
    expect(screen.queryByTestId('favicon-grid')).toBeNull()
  })

  it('rejects a non-image file with a readable error', async () => {
    render(<FaviconPage />)
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByTestId('favicon-input'), { target: { files: [file] } })
    expect((await screen.findByTestId('favicon-error')).textContent).toMatch(/not an image/i)
  })

  it('rejects an oversized image', async () => {
    render(<FaviconPage />)
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('favicon-input'), { target: { files: [big] } })
    expect((await screen.findByTestId('favicon-error')).textContent).toMatch(/too big/i)
  })
})
