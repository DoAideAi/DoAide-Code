import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import HashPage from './HashPage.jsx'

afterEach(cleanup)

describe('HashPage', () => {
  it('hashes as you type', async () => {
    render(<HashPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate SHA hashes')
    fireEvent.change(screen.getByTestId('hash-in'), { target: { value: 'hello' } })
    await waitFor(() =>
      expect(screen.getByTestId('hash-SHA-256').textContent).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      ),
    )
    expect(screen.getByTestId('hash-SHA-1').textContent).toHaveLength(40)
    expect(screen.getByTestId('hash-SHA-512').textContent).toHaveLength(128)
  })

  it('shows the empty-string digests on load', async () => {
    render(<HashPage />)
    await waitFor(() =>
      expect(screen.getByTestId('hash-SHA-1').textContent).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709'),
    )
  })
})
