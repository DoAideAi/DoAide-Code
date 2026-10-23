import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PlaceholderPage from './PlaceholderPage.jsx'

afterEach(cleanup)

const svgText = () => decodeURIComponent(screen.getByTestId('ph-preview').getAttribute('src').split(',')[1])

describe('PlaceholderPage', () => {
  it('starts as an Open Graph sized image', () => {
    render(<PlaceholderPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate placeholder images')
    expect(svgText()).toContain('width="1200" height="630"')
    expect(svgText()).toContain('1200 × 630')
  })

  it('follows size, colors and custom text', () => {
    render(<PlaceholderPage />)
    fireEvent.click(screen.getByText('Avatar'))
    fireEvent.change(screen.getByTestId('ph-bg'), { target: { value: '#000' } })
    fireEvent.change(screen.getByTestId('ph-text'), { target: { value: 'Hero\\nImage' } })
    const svg = svgText()
    expect(svg).toContain('width="150" height="150"')
    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('fill="#f9fafb"') // auto light text on black
    expect(svg.match(/<tspan/g)).toHaveLength(2)
    fireEvent.change(screen.getByTestId('ph-width'), { target: { value: '99999' } })
    expect(screen.getByTestId('ph-width').value).toBe('4000')
  })
})
