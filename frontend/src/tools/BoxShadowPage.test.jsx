import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import BoxShadowPage from './BoxShadowPage.jsx'

afterEach(cleanup)

describe('BoxShadowPage', () => {
  it('renders the default shadow CSS and preview', () => {
    render(<BoxShadowPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Build a CSS box shadow')
    expect(screen.getByTestId('shadow-css').textContent).toContain('box-shadow: 0px 8px 24px 0px rgba(0, 0, 0, 0.35);')
    expect(screen.getByTestId('shadow-preview').style.boxShadow).toContain('24px')
  })

  it('updates the CSS as a slider moves', () => {
    render(<BoxShadowPage />)
    fireEvent.change(screen.getByTestId('shadow-blur'), { target: { value: '50' } })
    expect(screen.getByTestId('shadow-css').textContent).toContain('50px')
    expect(screen.getByTestId('shadow-blur-value').textContent).toBe('50px')
  })

  it('adds, edits and removes layers', () => {
    render(<BoxShadowPage />)
    fireEvent.click(screen.getByTestId('shadow-add'))
    expect(screen.getByTestId('shadow-layer-1')).toBeTruthy()
    fireEvent.click(screen.getByTestId('shadow-inset'))
    expect(screen.getByTestId('shadow-css').textContent).toContain('inset')
    fireEvent.click(screen.getByTestId('shadow-remove'))
    expect(screen.queryByTestId('shadow-layer-1')).toBeNull()
    expect(screen.getByTestId('shadow-css').textContent).not.toContain('inset')
  })

  it('applies a preset', () => {
    render(<BoxShadowPage />)
    fireEvent.click(screen.getByTestId('shadow-preset-glow'))
    expect(screen.getByTestId('shadow-css').textContent).toContain('rgba(56, 189, 248')
  })
})
