import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SqlPage from './SqlPage.jsx'

afterEach(cleanup)

describe('SqlPage', () => {
  it('formats a query and reports no problems', () => {
    render(<SqlPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Format and validate SQL')
    fireEvent.change(screen.getByTestId('sql-in'), { target: { value: 'select id from users where active = true' } })
    fireEvent.click(screen.getByTestId('sql-run'))
    expect(screen.getByTestId('sql-out').textContent).toContain('SELECT id\nFROM users\nWHERE active = true')
    expect(screen.getByTestId('sql-ok')).toBeTruthy()
  })

  it('lists problems for a broken query', () => {
    render(<SqlPage />)
    fireEvent.change(screen.getByTestId('sql-in'), { target: { value: "select (a, from t where s = 'oops" } })
    fireEvent.click(screen.getByTestId('sql-run'))
    const problems = screen.getByTestId('sql-problems').textContent
    expect(problems).toMatch(/Unterminated string/)
    expect(problems).toMatch(/unclosed parenthesis/i)
  })

  it('warns on DELETE without WHERE in amber, not red', () => {
    render(<SqlPage />)
    fireEvent.change(screen.getByTestId('sql-in'), { target: { value: 'delete from users' } })
    fireEvent.click(screen.getByTestId('sql-run'))
    const alert = screen.getByText(/removes every row/)
    expect(alert.className).toContain('amber')
  })

  it('moves the result back into the editor', () => {
    render(<SqlPage />)
    fireEvent.change(screen.getByTestId('sql-in'), { target: { value: 'select 1' } })
    fireEvent.click(screen.getByTestId('sql-run'))
    fireEvent.click(screen.getByTestId('sql-use'))
    expect(screen.getByTestId('sql-in').value).toBe('SELECT 1\n')
    expect(screen.queryByTestId('sql-out')).toBeNull()
  })
})
