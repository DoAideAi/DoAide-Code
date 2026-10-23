import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CsvPage from './CsvPage.jsx'

afterEach(cleanup)

describe('CsvPage', () => {
  it('converts the sample CSV to JSON and SQL', () => {
    render(<CsvPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert CSV to JSON or SQL')
    expect(screen.getByTestId('csv-stats').textContent).toBe('3 rows × 5 columns')
    const json = JSON.parse(screen.getByTestId('csv-out').textContent)
    expect(json[1]).toEqual({ id: 2, name: 'Lee, Jordan', email: 'jordan@example.com', age: 41, active: false })
    expect(json[2].age).toBeNull()
    fireEvent.click(screen.getByTestId('csv-format-sql'))
    fireEvent.change(screen.getByTestId('csv-table'), { target: { value: 'people' } })
    expect(screen.getByTestId('csv-out').textContent).toContain('INSERT INTO people (id, name, email, age, active) VALUES')
  })

  it('turns JSON into CSV and reports bad JSON', () => {
    render(<CsvPage />)
    fireEvent.click(screen.getByTestId('csv-dir-reverse'))
    fireEvent.change(screen.getByTestId('csv-in'), { target: { value: '[{"a":1,"b":"x"}]' } })
    expect(screen.getByTestId('csv-out').textContent).toBe('a,b\n1,x')
    fireEvent.change(screen.getByTestId('csv-in'), { target: { value: '[{' } })
    expect(screen.getByRole('alert').textContent).toContain('Invalid JSON')
  })
})
