import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Landing from './Landing.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Landing', () => {
  it('explains the product to signed-out visitors', () => {
    render(<Landing clientId="" onCredential={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/free models first/i)
    expect(screen.getByText('Claude only when needed')).toBeTruthy()
    expect(screen.getByText('Get started in three steps')).toBeTruthy()
  })

  it('shows the live snippet count when the stats arrive, and nothing when they fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ snippets: 57 }) })))
    render(<Landing clientId="" onCredential={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('landing-stats').textContent).toBe('57 snippets analyzed so far'))
    cleanup()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))
    render(<Landing clientId="" onCredential={() => {}} />)
    expect(screen.queryByTestId('landing-stats')).toBeNull()
  })

  it('shows sign-in errors', () => {
    render(<Landing clientId="" onCredential={() => {}} error="Sign-in was rejected for this account." />)
    expect(screen.getByText('Sign-in was rejected for this account.')).toBeTruthy()
  })

  it('groups the tools into popular, AI and utility sections', () => {
    render(<Landing clientId="" onCredential={() => {}} />)
    expect(screen.getByTestId('landing-popular').querySelectorAll('a')).toHaveLength(4)
    expect(screen.getByTestId('landing-ai-tools').querySelectorAll('a')).toHaveLength(7)
    const utils = screen.getByTestId('landing-utils')
    expect(utils.querySelectorAll('a')).toHaveLength(4)
    expect(utils.textContent).toContain('New')
    expect(utils.querySelector('a').getAttribute('href')).toBe('/tools/diff-checker')
  })

  it('offers a skip link to the main content', () => {
    render(<Landing clientId="" onCredential={() => {}} />)
    expect(screen.getByText('Skip to main content').getAttribute('href')).toBe('#landing-main')
  })
})
