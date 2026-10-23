import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import BcryptPage from './BcryptPage.jsx'

afterEach(cleanup)

describe('BcryptPage', () => {
  it('generates a hash and verifies it', async () => {
    render(<BcryptPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate and verify bcrypt hashes')
    fireEvent.change(screen.getByLabelText('Cost factor'), { target: { value: '4' } })
    expect(screen.getByTestId('bcrypt-cost').textContent).toBe('4')
    fireEvent.change(screen.getByTestId('bcrypt-password'), { target: { value: 's3cret' } })
    fireEvent.click(screen.getByTestId('bcrypt-generate'))
    await waitFor(() => expect(screen.getByTestId('bcrypt-results').textContent).toMatch(/\$2b\$04\$/))
    const hash = screen.getByTestId('bcrypt-results').querySelector('code').textContent

    fireEvent.change(screen.getByTestId('bcrypt-check-password'), { target: { value: 's3cret' } })
    fireEvent.change(screen.getByTestId('bcrypt-check-hash'), { target: { value: hash } })
    expect(screen.getByTestId('bcrypt-parsed').textContent).toContain('$2b$')
    fireEvent.click(screen.getByTestId('bcrypt-verify'))
    await waitFor(() => expect(screen.getByTestId('bcrypt-verdict').textContent).toMatch(/Match/))
  })

  it('reports a malformed hash', async () => {
    render(<BcryptPage />)
    fireEvent.change(screen.getByTestId('bcrypt-check-hash'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByTestId('bcrypt-verify'))
    await waitFor(() => expect(screen.getByTestId('bcrypt-verdict').textContent).toMatch(/Not a bcrypt hash/))
  })
})
