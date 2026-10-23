import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import BaseConverterPage from './BaseConverterPage.jsx'

afterEach(cleanup)

describe('BaseConverterPage', () => {
  it('updates every base from one field', () => {
    render(<BaseConverterPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert binary, hex, octal and decimal')
    fireEvent.change(screen.getByTestId('base-hex'), { target: { value: '0x1F' } })
    expect(screen.getByTestId('base-dec').value).toBe('31')
    expect(screen.getByTestId('base-bin').value).toBe('11111')
    expect(screen.getByTestId('base-oct').value).toBe('37')
    fireEvent.change(screen.getByTestId('base-bin'), { target: { value: '102' } })
    expect(screen.getByRole('alert').textContent).toMatch(/valid number/)
  })

  it('shows signed readings and bitwise results at the chosen width', () => {
    render(<BaseConverterPage />)
    fireEvent.change(screen.getByTestId('base-dec'), { target: { value: '-1' } })
    fireEvent.click(screen.getByTestId('base-width-8'))
    expect(screen.getByTestId('base-bits').textContent).toBe('1111 1111')
    expect(screen.getByTestId('base-unsigned').textContent).toBe('255')
    expect(screen.getByTestId('base-signed').textContent).toBe('-1')
    expect(screen.getByTestId('base-op-and').textContent).toBe('15')
    expect(screen.getByTestId('base-op-not').textContent).toBe('0')
  })
})
