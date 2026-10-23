import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SvgOptimizerPage from './SvgOptimizerPage.jsx'

afterEach(cleanup)

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><!-- hi --><rect x="1.23456" y="0" width="5" height="5"/></svg>'

describe('SvgOptimizerPage', () => {
  it('starts with a placeholder', () => {
    render(<SvgOptimizerPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Optimize an SVG')
    expect(screen.getByText(/appears here/i)).toBeTruthy()
  })

  it('optimizes pasted SVG and shows savings + preview', () => {
    render(<SvgOptimizerPage />)
    fireEvent.change(screen.getByTestId('svg-input'), { target: { value: SVG } })
    expect(screen.getByTestId('svg-output').textContent).toContain('x="1.23"')
    expect(screen.getByTestId('svg-output').textContent).not.toContain('<!--')
    expect(screen.getByTestId('svg-savings').textContent).toMatch(/smaller/)
    expect(screen.getByTestId('svg-preview').getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })

  it('precision select changes the rounding', () => {
    render(<SvgOptimizerPage />)
    fireEvent.change(screen.getByTestId('svg-input'), { target: { value: SVG } })
    fireEvent.change(screen.getByTestId('svg-precision'), { target: { value: '0' } })
    expect(screen.getByTestId('svg-output').textContent).toContain('x="1"')
  })

  it('reports invalid SVG', () => {
    render(<SvgOptimizerPage />)
    fireEvent.change(screen.getByTestId('svg-input'), { target: { value: '<p>nope</p>' } })
    expect(screen.getByTestId('svg-error').textContent).toMatch(/not valid svg/i)
  })
})
