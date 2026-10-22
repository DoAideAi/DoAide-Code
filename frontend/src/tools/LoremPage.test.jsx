import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import LoremPage from './LoremPage.jsx'

afterEach(cleanup)

describe('LoremPage', () => {
  it('starts with three classic paragraphs', () => {
    render(<LoremPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate lorem ipsum text')
    const out = screen.getByTestId('lorem-out').value
    expect(out.startsWith('Lorem ipsum dolor')).toBe(true)
    expect(out.split('\n\n')).toHaveLength(3)
  })

  it('switches to a word count', () => {
    render(<LoremPage />)
    fireEvent.change(screen.getByTestId('lorem-unit'), { target: { value: 'words' } })
    fireEvent.change(screen.getByTestId('lorem-count'), { target: { value: '5' } })
    expect(screen.getByTestId('lorem-out').value.split(' ')).toHaveLength(5)
  })

  it('switches styles', () => {
    render(<LoremPage />)
    fireEvent.change(screen.getByTestId('lorem-style'), { target: { value: 'tech' } })
    expect(screen.getByTestId('lorem-out').value).not.toMatch(/^Lorem ipsum/)
  })

  it('regenerates on demand', () => {
    render(<LoremPage />)
    fireEvent.click(screen.getByTestId('lorem-again'))
    expect(screen.getByTestId('lorem-out').value.length).toBeGreaterThan(0)
  })
})
