import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PasswordPage from './PasswordPage.jsx'

afterEach(cleanup)

describe('PasswordPage', () => {
  it('starts with one strong 20-character password', () => {
    render(<PasswordPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate a strong password')
    expect(screen.getByTestId('password-0').textContent).toHaveLength(20)
    expect(screen.getByTestId('password-strength-label').textContent).toBe('Very strong')
  })

  it('regenerates on option changes and in bulk', () => {
    render(<PasswordPage />)
    fireEvent.change(screen.getByTestId('password-length'), { target: { value: '8' } })
    fireEvent.click(screen.getByTestId('password-symbols'))
    expect(screen.getByTestId('password-0').textContent).toMatch(/^[A-Za-z0-9]{8}$/)
    fireEvent.change(screen.getByTestId('password-count'), { target: { value: '5' } })
    expect(screen.getByTestId('password-4')).toBeTruthy()
  })

  it('warns when every set is off', () => {
    render(<PasswordPage />)
    for (const k of ['upper', 'lower', 'digits', 'symbols']) fireEvent.click(screen.getByTestId(`password-${k}`))
    expect(screen.getByRole('alert').textContent).toContain('at least one')
  })

  it('checks a typed password', () => {
    render(<PasswordPage />)
    fireEvent.change(screen.getByTestId('password-check'), { target: { value: 'password' } })
    expect(screen.getByTestId('password-check-strength-label').textContent).toBe('Very weak')
  })
})
