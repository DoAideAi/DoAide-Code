import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Base64Page from './Base64Page.jsx'

afterEach(cleanup)

describe('Base64Page', () => {
  it('encodes as you type', () => {
    render(<Base64Page />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Base64 encode and decode')
    fireEvent.change(screen.getByTestId('b64-text'), { target: { value: 'hello world' } })
    expect(screen.getByTestId('b64-encoded').value).toBe('aGVsbG8gd29ybGQ=')
  })

  it('decodes when pasting into the Base64 pane', () => {
    render(<Base64Page />)
    fireEvent.change(screen.getByTestId('b64-encoded'), { target: { value: 'aGVsbG8' } })
    expect(screen.getByTestId('b64-text').value).toBe('hello')
  })

  it('switches to the URL-safe alphabet', () => {
    render(<Base64Page />)
    fireEvent.change(screen.getByTestId('b64-text'), { target: { value: '??>>' } })
    fireEvent.click(screen.getByTestId('b64-urlsafe'))
    expect(screen.getByTestId('b64-encoded').value).toBe('Pz8-Pg')
  })

  it('reports bad Base64 without clobbering the text pane', () => {
    render(<Base64Page />)
    fireEvent.change(screen.getByTestId('b64-text'), { target: { value: 'keep me' } })
    fireEvent.change(screen.getByTestId('b64-encoded'), { target: { value: '!!!' } })
    expect(screen.getByTestId('b64-error').textContent).toMatch(/Not Base64/)
    expect(screen.getByTestId('b64-text').value).toBe('keep me')
  })
})
