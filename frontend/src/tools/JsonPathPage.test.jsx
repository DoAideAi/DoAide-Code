import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import JsonPathPage from './JsonPathPage.jsx'

afterEach(cleanup)

describe('JsonPathPage', () => {
  it('shows the sample tree and gives a path on click', () => {
    render(<JsonPathPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Find the JSONPath of any value')
    // Row 3 of the sample is users[0].name = "Asha".
    fireEvent.click(screen.getByTestId('jp-node-3'))
    expect(screen.getByTestId('jp-jsonpath').textContent).toBe('$.users[0].name')
    expect(screen.getByTestId('jp-js').textContent).toBe('data.users[0].name')
  })

  it('handles awkward keys with quotes', () => {
    render(<JsonPathPage />)
    fireEvent.change(screen.getByTestId('jp-input'), { target: { value: '{"first name": "Jo"}' } })
    fireEvent.click(screen.getByTestId('jp-node-1'))
    expect(screen.getByTestId('jp-jsonpath').textContent).toBe("$['first name']")
  })

  it('explains invalid JSON with the line', () => {
    render(<JsonPathPage />)
    fireEvent.change(screen.getByTestId('jp-input'), { target: { value: '{\n  "a": 1,\n}' } })
    expect(screen.getByTestId('jp-error').textContent).toMatch(/line 3/)
    expect(screen.queryByTestId('jp-tree')).toBeNull()
  })

  it('clears the picked path when the JSON changes', () => {
    render(<JsonPathPage />)
    fireEvent.click(screen.getByTestId('jp-node-0'))
    fireEvent.change(screen.getByTestId('jp-input'), { target: { value: '[1]' } })
    expect(screen.queryByTestId('jp-picked')).toBeNull()
  })
})
