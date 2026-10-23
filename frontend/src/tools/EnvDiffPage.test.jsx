import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import EnvDiffPage from './EnvDiffPage.jsx'

afterEach(cleanup)

describe('EnvDiffPage', () => {
  it('lists differences with masked values and flags duplicates', () => {
    render(<EnvDiffPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Compare .env files')
    expect(screen.getByTestId('env-row-SENTRY_DSN').textContent).toContain('Missing')
    expect(screen.getByTestId('env-row-FEATURE_BETA').textContent).toContain('Extra')
    const stripe = screen.getByTestId('env-row-STRIPE_SECRET_KEY')
    expect(stripe.textContent).toContain('Changed')
    expect(stripe.textContent).toContain('sk_••••')
    expect(stripe.textContent).not.toContain('sk_live')
    expect(screen.queryByTestId('env-row-REDIS_URL')).toBeNull()
    expect(screen.getByTestId('env-problems').textContent).toMatch(/LOG_LEVEL repeats line 5/)
    fireEvent.click(screen.getByTestId('env-reveal'))
    expect(screen.getByTestId('env-row-STRIPE_SECRET_KEY').textContent).toContain('sk_live_51Hx9example')
    fireEvent.click(screen.getByTestId('env-filter-all'))
    expect(screen.getByTestId('env-row-REDIS_URL').textContent).toContain('Same')
  })

  it('generates a .env.example with values stripped', () => {
    render(<EnvDiffPage />)
    fireEvent.click(screen.getByTestId('env-example'))
    expect(screen.getByTestId('env-example-out').textContent).toContain('STRIPE_SECRET_KEY=\n')
    expect(screen.getByTestId('env-example-out').textContent).not.toContain('sk_live')
  })
})
