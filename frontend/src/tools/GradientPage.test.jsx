import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GradientPage from './GradientPage.jsx'

afterEach(cleanup)

describe('GradientPage', () => {
  it('shows the default gradient CSS with a fallback line', () => {
    render(<GradientPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Build a CSS gradient')
    const css = screen.getByTestId('gradient-css').textContent
    expect(css).toContain('background: #ff0080;')
    expect(css).toContain('linear-gradient(135deg, #ff0080 0%, #7928ca 100%)')
  })

  it('updates the CSS when the angle moves', () => {
    render(<GradientPage />)
    fireEvent.change(screen.getByTestId('gradient-angle'), { target: { value: '45' } })
    expect(screen.getByTestId('gradient-css').textContent).toContain('linear-gradient(45deg,')
  })

  it('switches to radial (angle disappears)', () => {
    render(<GradientPage />)
    fireEvent.change(screen.getByTestId('gradient-type'), { target: { value: 'radial' } })
    expect(screen.getByTestId('gradient-css').textContent).toContain('radial-gradient(circle,')
    expect(screen.queryByTestId('gradient-angle')).toBeNull()
  })

  it('adds and removes stops within limits', () => {
    render(<GradientPage />)
    fireEvent.click(screen.getByTestId('gradient-add-stop'))
    expect(screen.getByTestId('gradient-stops').children.length).toBe(3)
    fireEvent.click(screen.getByLabelText('Remove stop 3'))
    expect(screen.getByTestId('gradient-stops').children.length).toBe(2)
    expect(screen.getByLabelText('Remove stop 1').disabled).toBe(true)
  })

  it('applies a preset', () => {
    render(<GradientPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Ocean' }))
    expect(screen.getByTestId('gradient-css').textContent).toContain('#2e3192')
  })
})
