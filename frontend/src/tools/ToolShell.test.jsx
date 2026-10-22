import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle, ToolFaqs } from './ToolShell.jsx'
import { TOOL_FAQS } from './toolFaqs.js'

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

describe('ToolFaqs', () => {
  it('renders the tool’s questions and answers', () => {
    render(<ToolFaqs slug="explain-code" />)
    expect(screen.getByText('Frequently asked questions')).toBeTruthy()
    for (const [q, a] of TOOL_FAQS['explain-code']) {
      expect(screen.getByText(q)).toBeTruthy()
      expect(screen.getByText(a)).toBeTruthy()
    }
  })

  it('renders nothing for a slug without FAQs', () => {
    const { container } = render(<ToolFaqs slug="no-such-tool" />)
    expect(container.innerHTML).toBe('')
  })
})
