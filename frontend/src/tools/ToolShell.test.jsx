import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ToolShell.jsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('ThemeToggle', () => {
  it('flips between dark and light and applies the choice to the page', () => {
    render(<ThemeToggle />)
    const button = screen.getByTestId('public-theme-toggle')
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode') // jsdom matchMedia is absent → dark
    fireEvent.click(button)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode')
    fireEvent.click(button)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
