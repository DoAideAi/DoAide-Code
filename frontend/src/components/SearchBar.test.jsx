import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SearchBar, { highlightText } from './SearchBar.jsx'

afterEach(cleanup)

const messages = [
  { id: '1', role: 'user', content: 'How do I fix the login bug?', status: 'done' },
  { id: '2', role: 'assistant', content: 'The login bug is caused by a missing token check.', status: 'done' },
  { id: '3', role: 'system', content: 'Session started', status: 'done' },
  { id: '4', role: 'user', content: 'Can you refactor this function?', status: 'done' },
]

describe('highlightText', () => {
  it('returns original text when query is empty', () => {
    expect(highlightText('hello world', '')).toEqual(['hello world'])
  })

  it('splits text around matches', () => {
    const parts = highlightText('the login bug is here', 'login')
    expect(parts).toEqual([
      { text: 'the ', highlight: false },
      { text: 'login', highlight: true },
      { text: ' bug is here', highlight: false },
    ])
  })

  it('handles multiple matches', () => {
    const parts = highlightText('fix the bug, another bug here', 'bug')
    expect(parts.filter((p) => p.highlight)).toHaveLength(2)
  })

  it('is case-insensitive', () => {
    const parts = highlightText('Login page', 'login')
    expect(parts[0]).toEqual({ text: 'Login', highlight: true })
  })
})

describe('SearchBar', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SearchBar messages={messages} open={false} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the search input when open', () => {
    render(<SearchBar messages={messages} open={true} onClose={() => {}} />)
    expect(screen.getByTestId('search-input')).toBeTruthy()
  })

  it('shows results matching the query', () => {
    render(<SearchBar messages={messages} open={true} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'login' } })
    // Should match user message and assistant message, but not system
    expect(screen.getByText('2 results')).toBeTruthy()
  })

  it('excludes system messages from results', () => {
    render(<SearchBar messages={messages} open={true} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'Session' } })
    expect(screen.getByText('No matches found')).toBeTruthy()
  })

  it('does not search with less than 2 characters', () => {
    render(<SearchBar messages={messages} open={true} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'a' } })
    expect(screen.queryByText(/result/)).toBeNull()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SearchBar messages={messages} open={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('search-close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
