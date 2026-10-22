import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CronPage from './CronPage.jsx'

afterEach(cleanup)

describe('CronPage', () => {
  it('describes the default expression and lists next runs', () => {
    render(<CronPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Build a cron expression')
    expect(screen.getByTestId('cron-description').textContent).toBe('Every 15 minutes.')
    expect(screen.getByTestId('cron-runs').children.length).toBe(5)
  })

  it('updates as you type and explains weekday schedules', () => {
    render(<CronPage />)
    fireEvent.change(screen.getByTestId('cron-in'), { target: { value: '0 9 * * 1-5' } })
    expect(screen.getByTestId('cron-description').textContent).toBe('At 09:00, on Monday to Friday.')
  })

  it('applies a preset on click', () => {
    render(<CronPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Daily at midnight' }))
    expect(screen.getByTestId('cron-in').value).toBe('0 0 * * *')
    expect(screen.getByTestId('cron-description').textContent).toBe('At 00:00.')
  })

  it('shows a clear error for a bad expression', () => {
    render(<CronPage />)
    fireEvent.change(screen.getByTestId('cron-in'), { target: { value: '* * *' } })
    expect(screen.getByTestId('cron-error').textContent).toMatch(/5 fields/)
    expect(screen.queryByTestId('cron-runs')).toBeNull()
  })
})
