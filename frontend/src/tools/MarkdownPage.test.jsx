import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import MarkdownPage, { countWords } from './MarkdownPage.jsx'

afterEach(cleanup)

describe('countWords', () => {
  it('counts prose words and skips code fences', () => {
    expect(countWords('hello world')).toBe(2)
    expect(countWords('one\n```\nlet a = 1\n```\ntwo')).toBe(2)
    expect(countWords('')).toBe(0)
  })
})

describe('MarkdownPage', () => {
  it('renders typed markdown live in the preview', () => {
    render(<MarkdownPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Write Markdown, preview it live')
    fireEvent.change(screen.getByTestId('md-in'), { target: { value: '# Title\n\nSome **bold** text' } })
    const preview = screen.getByTestId('md-preview')
    expect(preview.querySelector('strong').textContent).toBe('bold')
    expect(preview.textContent).toContain('Title')
  })

  it('renders fenced code through the highlighting code block', () => {
    render(<MarkdownPage />)
    fireEvent.change(screen.getByTestId('md-in'), { target: { value: 'before\n\n```js\nconst a = 1\n```' } })
    expect(screen.getByTestId('md-preview').querySelector('pre').textContent).toContain('const a = 1')
  })

  it('shows a placeholder note and zero words when empty', () => {
    render(<MarkdownPage />)
    expect(screen.getByTestId('md-preview').textContent).toMatch(/appears here/)
    expect(screen.getByText('0 words')).toBeTruthy()
  })
})
