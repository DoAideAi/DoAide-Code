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
    fireEvent.click(screen.getByRole('button', { name: /"deeper"/ }))
    expect(screen.getByTestId('json-tree').textContent).toContain('"deepest"')
  })

  it('keeps Format disabled while the JSON is broken', () => {
    render(<JsonPage />)
    fireEvent.change(screen.getByTestId('json-in'), { target: { value: '{broken' } })
    expect(screen.getByTestId('json-format').disabled).toBe(true)
    expect(screen.getByTestId('json-minify').disabled).toBe(true)
  })
})
