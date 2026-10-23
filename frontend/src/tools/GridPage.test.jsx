import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GridPage from './GridPage.jsx'

afterEach(cleanup)

describe('GridPage', () => {
  it('renders the default layout CSS and preview cells', () => {
    render(<GridPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Build a CSS grid layout')
    expect(screen.getByTestId('grid-css').textContent).toContain('grid-template-areas:')
    expect(screen.getByTestId('grid-cell-2-2').textContent).toBe('footer')
  })

  it('adds a column and edits a track', () => {
    render(<GridPage />)
    fireEvent.click(screen.getByTestId('grid-columns-add'))
    expect(screen.getByTestId('grid-cell-0-3').textContent).toBe('.')
    fireEvent.change(screen.getByTestId('grid-columns-0'), { target: { value: '250px' } })
    expect(screen.getByTestId('grid-css').textContent).toContain('grid-template-columns: 250px 1fr 1fr 1fr;')
  })

  it('paints cells and warns about non-rectangular areas', () => {
    render(<GridPage />)
    fireEvent.change(screen.getByTestId('grid-brush'), { target: { value: 'header' } })
    fireEvent.click(screen.getByTestId('grid-cell-1-1'))
    expect(screen.getByTestId('grid-area-error').textContent).toContain('header')
    expect(screen.getByTestId('grid-css').textContent).not.toContain('grid-template-areas')
    fireEvent.click(screen.getByTestId('grid-clear-areas'))
    expect(screen.queryByTestId('grid-area-error')).toBeNull()
  })

  it('changes the gap', () => {
    render(<GridPage />)
    fireEvent.change(screen.getByTestId('grid-row-gap'), { target: { value: '30' } })
    expect(screen.getByTestId('grid-css').textContent).toContain('gap: 30px 16px;')
  })
})
