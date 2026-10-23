import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ComposePage from './ComposePage.jsx'

afterEach(cleanup)

describe('ComposePage', () => {
  it('flags the sample’s mistakes and lists the services', () => {
    render(<ComposePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Validate a docker-compose.yml')
    const issues = screen.getByTestId('compose-issues').textContent
    expect(issues).toContain('did you mean “environment”')
    expect(issues).toContain('“pgdata” is not declared')
    expect(issues).toContain('version is obsolete')
    expect(screen.getByTestId('compose-summary').textContent).toMatch(/2 errors/)
    expect(screen.getByTestId('compose-services').textContent).toContain('node:20-alpine')
  })

  it('shows a clean bill of health once fixed', () => {
    render(<ComposePage />)
    fireEvent.change(screen.getByTestId('compose-in'), { target: { value: 'services:\n  web:\n    image: nginx:1.27\n' } })
    expect(screen.getByTestId('compose-summary').textContent).toBe('✓ Valid compose file')
  })
})
