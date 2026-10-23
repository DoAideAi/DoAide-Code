import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SqlMongoPage from './SqlMongoPage.jsx'

afterEach(cleanup)

describe('SqlMongoPage', () => {
  it('converts the first example', () => {
    render(<SqlMongoPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert SQL to MongoDB queries')
    expect(screen.getByTestId('sql-out').textContent).toBe(
      'db.users.find({ age: { $gte: 18 }, status: "active" }, { name: 1, email: 1, _id: 0 }).sort({ created_at: -1 }).limit(20)',
    )
  })

  it('switches examples and reports errors', () => {
    render(<SqlMongoPage />)
    fireEvent.click(screen.getByText('Group by'))
    expect(screen.getByTestId('sql-out').textContent).toContain('db.users.aggregate(')
    fireEvent.change(screen.getByTestId('sql-in'), { target: { value: 'SELECT * FROM a JOIN b ON a.id = b.id' } })
    expect(screen.getByTestId('sql-error').textContent).toContain('Joins are not supported')
  })
})
