import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ComplexityPage from './ComplexityPage.jsx'

afterEach(cleanup)

const CODE = `function pick(a, b) {
  if (a && b) return a
  return b
}`

describe('ComplexityPage', () => {
  it('analyzes pasted code into a report table', () => {
    render(<ComplexityPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Measure code complexity')
    fireEvent.change(screen.getByTestId('cx-in'), { target: { value: CODE } })
    fireEvent.click(screen.getByTestId('cx-run'))
    const report = screen.getByTestId('cx-report')
    expect(report.textContent).toContain('pick')
    expect(report.textContent).toContain('3 · simple') // 1 + if + &&
    expect(screen.getByText('Max nesting')).toBeTruthy()
  })

  it('does nothing on empty input', () => {
    render(<ComplexityPage />)
    fireEvent.click(screen.getByTestId('cx-run'))
    expect(screen.queryByTestId('cx-report')).toBeNull()
  })

  it('says so when no functions are found', () => {
    render(<ComplexityPage />)
    fireEvent.change(screen.getByTestId('cx-in'), { target: { value: 'const a = 1\nconst b = 2' } })
    fireEvent.click(screen.getByTestId('cx-run'))
    expect(screen.getByText(/No function definitions found/)).toBeTruthy()
  })
})
