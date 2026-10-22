import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import UnitPage from './UnitPage.jsx'

afterEach(cleanup)

describe('UnitPage', () => {
  it('converts px to rem as you type', () => {
    render(<UnitPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert developer units')
    fireEvent.change(screen.getByTestId('px-value'), { target: { value: '32' } })
    expect(screen.getByTestId('px-out').textContent).toContain('2rem')
  })

  it('respects a custom root font size', () => {
    render(<UnitPage />)
    fireEvent.change(screen.getByTestId('px-base'), { target: { value: '10' } })
    expect(screen.getByTestId('px-out').textContent).toContain('2.4rem')
  })

  it('converts between decimal and binary byte units', () => {
    render(<UnitPage />)
    fireEvent.change(screen.getByTestId('bytes-value'), { target: { value: '2' } })
    const out = screen.getByTestId('bytes-out').textContent
    expect(out).toContain('2097152') // 2 MiB in bytes
  })

  it('reads a unix timestamp', () => {
    render(<UnitPage />)
    fireEvent.change(screen.getByTestId('time-in'), { target: { value: '1700000000' } })
    expect(screen.getByTestId('time-out').textContent).toContain('2023-11-14T22:13:20.000Z')
  })

  it('converts a color and flags junk', () => {
    render(<UnitPage />)
    fireEvent.change(screen.getByTestId('color-in'), { target: { value: 'rgb(255, 0, 0)' } })
    expect(screen.getByTestId('color-out').textContent).toContain('#ff0000')
    fireEvent.change(screen.getByTestId('color-in'), { target: { value: 'reddish' } })
    expect(screen.getByText(/Not a color/)).toBeTruthy()
  })
})
