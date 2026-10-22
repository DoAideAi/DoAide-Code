import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RecentSnippets from './RecentSnippets.jsx'
import { rememberSnippet, savedSnippets } from './snippets.js'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('RecentSnippets', () => {
  it('renders nothing while the history is empty', () => {
    render(<RecentSnippets scope="ai" onRestore={() => {}} />)
    expect(screen.queryByTestId('recent-snippets')).toBeNull()
  })

  it('restores the chosen snippet', () => {
    rememberSnippet('ai', 'x = 1', 'Python')
    rememberSnippet('ai', 'y = 2', 'Python')
    const onRestore = vi.fn()
    render(<RecentSnippets scope="ai" onRestore={onRestore} />)
    fireEvent.change(screen.getByTestId('recent-snippets'), { target: { value: '1' } })
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ code: 'x = 1' }))
  })

  it('clears the history', () => {
    rememberSnippet('ai', 'x = 1')
    render(<RecentSnippets scope="ai" onRestore={() => {}} />)
    fireEvent.click(screen.getByTestId('recent-clear'))
    expect(screen.queryByTestId('recent-snippets')).toBeNull()
    expect(savedSnippets('ai')).toEqual([])
  })

  it('picks up a new snippet when refreshKey changes', () => {
    rememberSnippet('ai', 'old')
    const { rerender } = render(<RecentSnippets scope="ai" onRestore={() => {}} refreshKey={1} />)
    rememberSnippet('ai', 'new')
    rerender(<RecentSnippets scope="ai" onRestore={() => {}} refreshKey={2} />)
    expect(screen.getByTestId('recent-snippets').textContent).toContain('new')
  })
})
