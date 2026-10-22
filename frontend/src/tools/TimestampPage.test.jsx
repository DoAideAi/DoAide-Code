import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TimestampPage from './TimestampPage.jsx'

afterEach(cleanup)

describe('TimestampPage', () => {
  it('converts unix seconds to every representation', () => {
    render(<TimestampPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert timestamps')
    fireEvent.change(screen.getByTestId('ts-input'), { target: { value: '1700000000' } })
    expect(screen.getByTestId('ts-unix-ms').textContent).toBe('1700000000000')
    expect(screen.getByTestId('ts-iso').textContent).toBe('2023-11-14T22:13:20.000Z')
    expect(screen.getByTestId('ts-rfc').textContent).toBe('Tue, 14 Nov 2023 22:13:20 +0000')
    expect(screen.getByTestId('ts-kind').textContent).toMatch(/unix seconds/)
  })

  it('converts an ISO date and renders it in a chosen timezone', () => {
    render(<TimestampPage />)
    fireEvent.change(screen.getByTestId('ts-input'), { target: { value: '2023-11-14T22:13:20Z' } })
    fireEvent.change(screen.getByTestId('ts-zone'), { target: { value: 'UTC' } })
    expect(screen.getByTestId('ts-unix-s').textContent).toBe('1700000000')
    expect(screen.getByTestId('ts-zoned').textContent).toContain('14 Nov 2023')
  })

  it('explains unreadable input', () => {
    render(<TimestampPage />)
    fireEvent.change(screen.getByTestId('ts-input'), { target: { value: 'not a date' } })
    expect(screen.getByTestId('ts-error').textContent).toMatch(/ISO 8601/)
  })

  it('fills the current time from the Now button', () => {
    render(<TimestampPage />)
    fireEvent.click(screen.getByTestId('ts-now'))
    expect(screen.getByTestId('ts-input').value).toMatch(/^\d{13}$/)
  })
})
