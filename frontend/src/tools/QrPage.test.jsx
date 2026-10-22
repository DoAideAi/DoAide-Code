import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import QrPage from './QrPage.jsx'

afterEach(cleanup)

describe('QrPage', () => {
  it('shows a QR code for the default URL', () => {
    render(<QrPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate a QR code')
    expect(screen.getByTestId('qr-image').getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })

  it('updates as the text changes', () => {
    render(<QrPage />)
    const before = screen.getByTestId('qr-image').getAttribute('src')
    fireEvent.change(screen.getByTestId('qr-input'), { target: { value: 'something else entirely' } })
    expect(screen.getByTestId('qr-image').getAttribute('src')).not.toBe(before)
  })

  it('redraws for a different error correction level', () => {
    render(<QrPage />)
    const before = screen.getByTestId('qr-image').getAttribute('src')
    fireEvent.change(screen.getByTestId('qr-ecl'), { target: { value: 'H' } })
    expect(screen.getByTestId('qr-image').getAttribute('src')).not.toBe(before)
  })

  it('hides the code and buttons when the text is cleared', () => {
    render(<QrPage />)
    fireEvent.change(screen.getByTestId('qr-input'), { target: { value: '  ' } })
    expect(screen.queryByTestId('qr-image')).toBeNull()
    expect(screen.queryByTestId('qr-save-png')).toBeNull()
  })
})
