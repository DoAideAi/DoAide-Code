import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PalettePage from './PalettePage.jsx'

afterEach(cleanup)

describe('PalettePage', () => {
  it('renders five swatches and CSS variables', () => {
    render(<PalettePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate a color palette')
    expect(screen.getByTestId('palette-swatch-0').textContent).toContain('#0ea5e9')
    expect(screen.getByTestId('palette-swatch-4')).toBeTruthy()
    expect(screen.getByTestId('palette-export').textContent).toContain('--color-1: #0ea5e9;')
  })

  it('follows a typed hex and switches scheme', () => {
    render(<PalettePage />)
    fireEvent.change(screen.getByTestId('palette-hex'), { target: { value: '#ff0000' } })
    fireEvent.click(screen.getByTestId('palette-scheme-triadic'))
    expect(screen.getByTestId('palette-swatch-1').textContent).toContain('#00ff00')
    expect(screen.getByTestId('palette-swatch-2').textContent).toContain('#0000ff')
  })

  it('ignores an incomplete hex and switches export format', () => {
    render(<PalettePage />)
    fireEvent.change(screen.getByTestId('palette-hex'), { target: { value: '#ff' } })
    expect(screen.getByTestId('palette-swatch-0').textContent).toContain('#0ea5e9')
    fireEvent.click(screen.getByTestId('palette-format-json'))
    expect(JSON.parse(screen.getByTestId('palette-export').textContent)).toHaveLength(5)
  })
})
