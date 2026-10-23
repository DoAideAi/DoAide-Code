import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PerfAuditPage from './PerfAuditPage.jsx'

afterEach(cleanup)

describe('PerfAuditPage', () => {
  it('shows the server checklist before any input', () => {
    render(<PerfAuditPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Audit a page’s performance')
    expect(screen.getByText(/server checklist/i)).toBeTruthy()
    expect(screen.queryByTestId('perf-score')).toBeNull()
  })

  it('scores a clean page 100 with passed checks', () => {
    render(<PerfAuditPage />)
    fireEvent.change(screen.getByTestId('perf-input'), {
      target: { value: '<html><head><meta charset="utf-8"><meta name="viewport" content="x"><title>t</title></head><body><p>hi</p></body></html>' },
    })
    expect(screen.getByTestId('perf-score').textContent).toBe('100')
    expect(screen.getByTestId('perf-passed').textContent).toContain('Viewport meta tag present')
  })

  it('lists findings for a problematic page', () => {
    render(<PerfAuditPage />)
    fireEvent.change(screen.getByTestId('perf-input'), {
      target: { value: '<html><head><script src="/a.js"></script></head><body><img src="/x.png"></body></html>' },
    })
    const findings = screen.getByTestId('perf-findings').textContent
    expect(findings).toMatch(/render-blocking/i)
    expect(findings).toMatch(/viewport/i)
    expect(Number(screen.getByTestId('perf-score').textContent)).toBeLessThan(100)
  })

  it('reports non-HTML input', () => {
    render(<PerfAuditPage />)
    fireEvent.change(screen.getByTestId('perf-input'), { target: { value: 'nope, just text' } })
    expect(screen.getByTestId('perf-error').textContent).toMatch(/does not look like html/i)
  })
})
