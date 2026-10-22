import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TopBar from './TopBar.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('refresh button', () => {
  it('is an icon shown on phones and desktop alike, with an accessible name', () => {
    render(<TopBar project="alpha" color="green" busy={false} />)
    const button = screen.getByRole('button', { name: 'Refresh' })
    expect(button.querySelector('svg').getAttribute('class')).not.toContain('sm:hidden')
    expect(button.className).not.toContain('hidden')
  })

  it('reloads the page when tapped', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<TopBar project="alpha" color="green" busy={false} />)
    fireEvent.click(screen.getByTestId('refresh'))
    expect(reload).toHaveBeenCalledOnce()
  })
})

describe('theme toggle', () => {
  it('flips dark and light, saves the choice and offers the other mode', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    render(<TopBar project="alpha" color="green" busy={false} />)
    const toggle = screen.getByTestId('theme-toggle')
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode')
    expect(toggle.querySelector('svg').getAttribute('class')).not.toContain('sm:hidden')
    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('doaide-theme')).toBe('light')
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode')
    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('doaide-theme')).toBe('dark')
  })

  it('starts from the saved choice', () => {
    localStorage.setItem('doaide-theme', 'light')
    render(<TopBar project="alpha" color="green" busy={false} />)
    expect(screen.getByTestId('theme-toggle').getAttribute('aria-label')).toBe('Switch to dark mode')
  })
})
