import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import RegexPage from './RegexPage.jsx'

afterEach(cleanup)

describe('RegexPage', () => {
  it('highlights matches live and lists them', () => {
    render(<RegexPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Test regular expressions')
    fireEvent.change(screen.getByTestId('rx-pattern'), { target: { value: '\\d+' } })
    fireEvent.change(screen.getByTestId('rx-text'), { target: { value: 'a 12 b 345' } })
    expect(screen.getByTestId('rx-count').textContent).toBe('2 matches')
    const marks = screen.getByTestId('rx-highlight').querySelectorAll('mark')
    expect([...marks].map((m) => m.textContent)).toEqual(['12', '345'])
    expect(screen.getByTestId('rx-table')).toBeTruthy()
  })

  it('shows capture groups in the table', () => {
    render(<RegexPage />)
    fireEvent.change(screen.getByTestId('rx-pattern'), { target: { value: '(\\w+)@(\\w+)' } })
    fireEvent.change(screen.getByTestId('rx-text'), { target: { value: 'jo@ex' } })
    expect(screen.getByTestId('rx-table').textContent).toContain('$1: jo')
    expect(screen.getByTestId('rx-table').textContent).toContain('$2: ex')
  })

  it('reports an invalid pattern', () => {
    render(<RegexPage />)
    fireEvent.change(screen.getByTestId('rx-pattern'), { target: { value: '(bad' } })
    expect(screen.getByTestId('rx-error').textContent).toMatch(/Invalid regular expression/)
  })

  it('toggles flags', () => {
    render(<RegexPage />)
    fireEvent.change(screen.getByTestId('rx-pattern'), { target: { value: 'A' } })
    fireEvent.change(screen.getByTestId('rx-text'), { target: { value: 'aaa' } })
    expect(screen.getByTestId('rx-count').textContent).toBe('No matches.')
    fireEvent.click(screen.getByTestId('rx-flag-i'))
    expect(screen.getByTestId('rx-count').textContent).toBe('3 matches')
    fireEvent.click(screen.getByTestId('rx-flag-g'))
    expect(screen.getByTestId('rx-count').textContent).toBe('1 match')
  })
})
