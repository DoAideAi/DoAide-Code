import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import JsonPage from './JsonPage.jsx'

afterEach(cleanup)

describe('JsonPage', () => {
  it('validates live and shows the tree with stats', () => {
    render(<JsonPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Validate and explore JSON')
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: '{"name": "jo", "tags": [1, 2]}' } })
    expect(screen.getByTestId('json-valid').textContent).toContain('Valid JSON')
    expect(screen.getByTestId('json-tree').textContent).toContain('"name"')
    expect(screen.getByTestId('json-tree').textContent).toContain('"jo"')
  })

  it('reports the error line for broken JSON', () => {
    render(<JsonPage />)
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: '{\n"a": nope\n}' } })
    expect(screen.getByTestId('json-error').textContent).toMatch(/Invalid JSON/)
    expect(screen.queryByTestId('json-tree')).toBeNull()
  })

  it('formats and minifies in place', () => {
    render(<JsonPage />)
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByTestId('json-format'))
    expect(screen.getByTestId('json-in').value).toBe('{\n  "a": 1\n}')
    fireEvent.click(screen.getByTestId('json-minify'))
    expect(screen.getByTestId('json-in').value).toBe('{"a":1}')
  })

  it('collapses and expands tree nodes', () => {
    render(<JsonPage />)
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: '{"deep": {"deeper": {"deepest": 1}}}' } })
    // Depth 2 starts closed: the summary shows instead of the child.
    expect(screen.getByTestId('json-tree').textContent).not.toContain('"deepest"')
    fireEvent.click(screen.getByRole('button', { name: 'Expand "deeper"' }))
    expect(screen.getByTestId('json-tree').textContent).toContain('"deepest"')
  })

  it('keeps Format disabled while the JSON is broken', () => {
    render(<JsonPage />)
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: '{broken' } })
    expect(screen.getByTestId('json-format').disabled).toBe(true)
    expect(screen.getByTestId('json-minify').disabled).toBe(true)
  })

  it('searches, expands and shows the path of a clicked node', () => {
    render(<JsonPage />)
    const doc = { users: [{ name: 'Asha', address: { city: 'Pune' } }, { name: 'Ravi' }] }
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: JSON.stringify(doc) } })
    expect(screen.getByTestId('json-tree').textContent).not.toContain('Pune') // depth 3 starts closed
    fireEvent.change(screen.getByTestId('json-search'), { target: { value: 'pune' } })
    expect(screen.getByTestId('json-search-count').textContent).toBe('1 match')
    expect(screen.getByTestId('json-tree').textContent).toContain('"Pune"')
    fireEvent.click(screen.getByText('"city"'))
    expect(screen.getByTestId('json-path-jsonpath').textContent).toBe('$.users[0].address.city')
    expect(screen.getByTestId('json-path-javascript').textContent).toBe('data.users[0].address.city')

    fireEvent.change(screen.getByTestId('json-search'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('json-collapse-all'))
    expect(screen.getByTestId('json-tree').textContent).not.toContain('"name"')
    fireEvent.click(screen.getByTestId('json-expand-all'))
    expect(screen.getByTestId('json-tree').textContent).toContain('"Pune"')
  })
})
