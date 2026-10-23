import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TextDiffPage from './TextDiffPage.jsx'

afterEach(cleanup)

const type = (id, value) => fireEvent.change(screen.getByTestId(id), { target: { value } })

describe('TextDiffPage', () => {
  it('shows counts and highlights changed words', () => {
    render(<TextDiffPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Compare two texts')
    type('text-diff-old', 'The quick brown fox\nsame line')
    type('text-diff-new', 'The slow brown fox\nsame line')
    expect(screen.getByTestId('text-diff-stats').textContent).toContain('+1')
    expect(screen.getAllByTestId('text-diff-word').map((m) => m.textContent)).toEqual(['quick', 'slow'])
    expect(screen.getByTestId('text-diff-old-count').textContent).toBe('6 words · 29 chars')
  })

  it('reports a match when ignoring case', () => {
    render(<TextDiffPage />)
    type('text-diff-old', 'Hello')
    type('text-diff-new', 'hello')
    expect(screen.queryByTestId('text-diff-same')).toBeNull()
    fireEvent.click(screen.getByTestId('text-diff-ignoreCase'))
    expect(screen.getByTestId('text-diff-same').textContent).toContain('with the selected options')
  })

  it('hides unchanged lines and swaps sides', () => {
    render(<TextDiffPage />)
    type('text-diff-old', 'a\nb\nc')
    type('text-diff-new', 'a\nB\nc')
    fireEvent.click(screen.getByTestId('text-diff-only-changes'))
    expect(screen.getByTestId('text-diff-result').textContent).not.toContain('a')
    fireEvent.click(screen.getByTestId('text-diff-swap'))
    expect(screen.getByTestId('text-diff-old').value).toBe('a\nB\nc')
  })
})
