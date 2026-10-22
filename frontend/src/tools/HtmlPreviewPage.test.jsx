import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HtmlPreviewPage from './HtmlPreviewPage.jsx'

afterEach(cleanup)

describe('HtmlPreviewPage', () => {
  it('renders the sample document in a sandboxed frame', () => {
    render(<HtmlPreviewPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Preview HTML, CSS and JavaScript live')
    const frame = screen.getByTestId('hp-frame')
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame.getAttribute('srcdoc')).toContain('Click me')
  })

  it('rebuilds the preview after typing settles', () => {
    vi.useFakeTimers()
    try {
      render(<HtmlPreviewPage />)
      fireEvent.change(screen.getByTestId('hp-html'), { target: { value: '<p>fresh</p>' } })
      act(() => vi.advanceTimersByTime(500))
      expect(screen.getByTestId('hp-frame').getAttribute('srcdoc')).toContain('<p>fresh</p>')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps all three panes in the document', () => {
    vi.useFakeTimers()
    try {
      render(<HtmlPreviewPage />)
      fireEvent.change(screen.getByTestId('hp-css'), { target: { value: 'em{color:teal}' } })
      fireEvent.change(screen.getByTestId('hp-js'), { target: { value: 'window.x=1' } })
      act(() => vi.advanceTimersByTime(500))
      const doc = screen.getByTestId('hp-frame').getAttribute('srcdoc')
      expect(doc).toContain('em{color:teal}')
      expect(doc).toContain('window.x=1')
    } finally {
      vi.useRealTimers()
    }
  })
})
