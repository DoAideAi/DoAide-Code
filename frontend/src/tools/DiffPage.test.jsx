import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import DiffPage from './DiffPage.jsx'
import { MAX_DIFF_CHARS } from './DiffPage.jsx'

afterEach(cleanup)

describe('DiffPage', () => {
  it('diffs live, side by side, with stats', () => {
    render(<DiffPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Compare two versions of your code')
    fireEvent.change(screen.getByTestId('diff-old'), { target: { value: 'a\nold\nz' } })
    fireEvent.change(screen.getByTestId('diff-new'), { target: { value: 'a\nnew\nz' } })
    expect(screen.getByTestId('diff-split')).toBeTruthy()
    expect(screen.getByTestId('diff-stats').textContent).toBe('+1 −1 lines')
    expect(screen.getByText('old')).toBeTruthy()
    expect(screen.getByText('new')).toBeTruthy()
  })

  it('switches to the unified view', () => {
    render(<DiffPage />)
    fireEvent.change(screen.getByTestId('diff-old'), { target: { value: 'a' } })
    fireEvent.change(screen.getByTestId('diff-new'), { target: { value: 'b' } })
    fireEvent.click(screen.getByTestId('diff-view'))
    expect(screen.getByTestId('diff-unified')).toBeTruthy()
    expect(screen.queryByTestId('diff-split')).toBeNull()
  })

  it('swaps the two sides', () => {
    render(<DiffPage />)
    fireEvent.change(screen.getByTestId('diff-old'), { target: { value: 'left' } })
    fireEvent.change(screen.getByTestId('diff-new'), { target: { value: 'right' } })
    fireEvent.click(screen.getByTestId('diff-swap'))
    expect(screen.getByTestId('diff-old').value).toBe('right')
    expect(screen.getByTestId('diff-new').value).toBe('left')
  })

  it('says when the sides are identical', () => {
    render(<DiffPage />)
    fireEvent.change(screen.getByTestId('diff-old'), { target: { value: 'same' } })
    fireEvent.change(screen.getByTestId('diff-new'), { target: { value: 'same' } })
    expect(screen.getByTestId('diff-same')).toBeTruthy()
    expect(screen.queryByTestId('diff-split')).toBeNull()
  })

  it('refuses text beyond the size cap', () => {
    render(<DiffPage />)
    fireEvent.change(screen.getByTestId('diff-old'), { target: { value: 'x'.repeat(MAX_DIFF_CHARS + 1) } })
    expect(screen.getByRole('alert').textContent).toMatch(/too much to compare/)
  })

  it('has the skip link and the tool switcher with a New badge', () => {
    render(<DiffPage />)
    expect(screen.getByText('Skip to the tool').getAttribute('href')).toBe('#tool-main')
    const active = screen.getByRole('link', { name: /Diff checker/ })
    expect(active.getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByText('New').length).toBeGreaterThan(0)
  })
})
