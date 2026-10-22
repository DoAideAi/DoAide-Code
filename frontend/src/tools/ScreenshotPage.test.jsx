import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ScreenshotPage from './ScreenshotPage.jsx'

afterEach(cleanup)

describe('ScreenshotPage', () => {
  it('shows a live preview even before typing', () => {
    render(<ScreenshotPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Turn code into a shareable image')
    expect(screen.getByTestId('shot-preview').getAttribute('src')).toContain('data:image/svg+xml')
  })

  it('re-renders the preview with the typed code and picked theme', () => {
    render(<ScreenshotPage />)
    fireEvent.change(screen.getByTestId('shot-in'), { target: { value: 'print("hi")' } })
    fireEvent.click(screen.getByTestId('shot-theme-sunset'))
    const src = decodeURIComponent(screen.getByTestId('shot-preview').getAttribute('src'))
    expect(src).toContain('print')
    expect(src).toContain('#ff0080')
    expect(screen.getByTestId('shot-theme-sunset').getAttribute('aria-pressed')).toBe('true')
  })

  it('drops the window chrome on request', () => {
    render(<ScreenshotPage />)
    fireEvent.click(screen.getByTestId('shot-chrome'))
    expect(decodeURIComponent(screen.getByTestId('shot-preview').getAttribute('src'))).not.toContain('#ff5f57')
  })

  it('puts the title into the window bar', () => {
    render(<ScreenshotPage />)
    fireEvent.change(screen.getByTestId('shot-title'), { target: { value: 'app.js' } })
    expect(decodeURIComponent(screen.getByTestId('shot-preview').getAttribute('src'))).toContain('app.js')
  })
})
