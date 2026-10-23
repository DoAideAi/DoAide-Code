import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CspPage from './CspPage.jsx'

afterEach(cleanup)

describe('CspPage', () => {
  it('builds a policy from a preset and toggles', () => {
    render(<CspPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Build a Content Security Policy')
    fireEvent.click(screen.getByTestId('csp-preset-spa'))
    expect(screen.getByTestId('csp-out-header').textContent).toMatch(/^Content-Security-Policy: default-src 'none'; script-src 'self';/)
    fireEvent.click(screen.getByTestId('csp-kw-script-src-unsafe-inline'))
    expect(screen.getByTestId('csp-out-header').textContent).toContain("script-src 'self' 'unsafe-inline';")
    expect(screen.getByTestId('csp-findings').textContent).toContain("'unsafe-inline'")
    fireEvent.click(screen.getByTestId('csp-report-only'))
    expect(screen.getByTestId('csp-out-nginx').textContent).toMatch(/^add_header Content-Security-Policy-Report-Only/)
    expect(screen.getByTestId('csp-out-meta').textContent).not.toContain('frame-ancestors')
  })

  it('audits a pasted policy and loads it into the builder', () => {
    render(<CspPage />)
    fireEvent.click(screen.getByTestId('csp-tab-audit'))
    expect(screen.getByTestId('csp-findings').textContent).toContain('wildcard')
    fireEvent.change(screen.getByTestId('csp-paste'), { target: { value: "default-src 'self'; object-src 'none'" } })
    fireEvent.click(screen.getByTestId('csp-edit'))
    expect(screen.getByTestId('csp-out-header').textContent).toBe("Content-Security-Policy: default-src 'self'; object-src 'none'")
  })
})
