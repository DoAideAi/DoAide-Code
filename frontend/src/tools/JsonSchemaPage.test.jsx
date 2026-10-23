import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import JsonSchemaPage from './JsonSchemaPage.jsx'

afterEach(cleanup)

describe('JsonSchemaPage', () => {
  it('shows a schema for the sample JSON', () => {
    render(<JsonSchemaPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate a JSON Schema from JSON')
    const out = screen.getByTestId('schema-output').textContent
    expect(out).toContain('"$schema"')
    expect(out).toContain('"format": "email"')
    expect(out).toContain('"required"')
  })

  it('reacts to the option toggles', () => {
    render(<JsonSchemaPage />)
    fireEvent.click(screen.getByTestId('schema-formats'))
    expect(screen.getByTestId('schema-output').textContent).not.toContain('"format"')
    fireEvent.click(screen.getByTestId('schema-required'))
    expect(screen.getByTestId('schema-output').textContent).not.toContain('"required"')
  })

  it('reports invalid JSON', () => {
    render(<JsonSchemaPage />)
    fireEvent.change(screen.getByTestId('schema-input'), { target: { value: '{broken' } })
    expect(screen.getByTestId('schema-error').textContent).toMatch(/not valid json/i)
  })

  it('clears the input', () => {
    render(<JsonSchemaPage />)
    fireEvent.click(screen.getByTestId('schema-clear'))
    expect(screen.getByTestId('schema-input').value).toBe('')
    expect(screen.getByTestId('schema-output').textContent).toBe('')
  })
})
