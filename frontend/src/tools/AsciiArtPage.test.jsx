import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AsciiArtPage from './AsciiArtPage.jsx'

afterEach(cleanup)

describe('AsciiArtPage', () => {
  it('renders the default text', async () => {
    render(<AsciiArtPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Turn text into ASCII art')
    await waitFor(() => expect(screen.getByTestId('ascii-output').textContent).toContain('| | | |'))
  })

  it('changes font and wraps in a comment', async () => {
    render(<AsciiArtPage />)
    fireEvent.change(screen.getByTestId('ascii-input'), { target: { value: 'Yo' } })
    fireEvent.change(screen.getByTestId('ascii-font'), { target: { value: 'ANSI Shadow' } })
    fireEvent.change(screen.getByTestId('ascii-comment'), { target: { value: 'hash' } })
    await waitFor(() => expect(screen.getByTestId('ascii-output').textContent).toContain('# ██╗'))
  })

  it('opens the font gallery and picks a font from it', async () => {
    render(<AsciiArtPage />)
    fireEvent.click(screen.getByTestId('ascii-gallery-toggle'))
    await waitFor(() => expect(screen.getByTestId('ascii-gallery-Slant')).toBeTruthy())
    fireEvent.click(screen.getByTestId('ascii-gallery-Slant'))
    expect(screen.getByTestId('ascii-font').value).toBe('Slant')
  })
})
