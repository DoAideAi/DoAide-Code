import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FormatterPage from './FormatterPage.jsx'

afterEach(cleanup)

describe('FormatterPage', () => {
  it('formats auto-detected JSON', () => {
    render(<FormatterPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Format messy code')
    fireEvent.change(screen.getByTestId('fmt-code'), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByTestId('fmt-run'))
    expect(screen.getByTestId('fmt-out').textContent).toBe('{\n  "a": 1\n}\n')
    expect(screen.getByText('Formatted as JSON')).toBeTruthy()
  })

  it('shows the error for broken input in a chosen language', () => {
    render(<FormatterPage />)
    fireEvent.change(screen.getByTestId('fmt-language'), { target: { value: 'JSON' } })
    fireEvent.change(screen.getByTestId('fmt-code'), { target: { value: '{oops' } })
    fireEvent.click(screen.getByTestId('fmt-run'))
    expect(screen.getByTestId('fmt-error').textContent).toMatch(/not valid JSON/)
  })

  it('asks for code before formatting nothing', () => {
    render(<FormatterPage />)
    fireEvent.click(screen.getByTestId('fmt-run'))
    expect(screen.getByTestId('fmt-error').textContent).toBe('Paste some code first.')
  })

  it('moves the result back into the editor', () => {
    render(<FormatterPage />)
    fireEvent.change(screen.getByTestId('fmt-code'), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByTestId('fmt-run'))
    fireEvent.click(screen.getByTestId('fmt-use'))
    expect(screen.getByTestId('fmt-code').value).toBe('{\n  "a": 1\n}\n')
    expect(screen.queryByTestId('fmt-out')).toBeNull()
  })

  it('honors the indent choice', () => {
    render(<FormatterPage />)
    fireEvent.change(screen.getByTestId('fmt-indent'), { target: { value: '4' } })
    fireEvent.change(screen.getByTestId('fmt-code'), { target: { value: '{"a":1}' } })
    fireEvent.click(screen.getByTestId('fmt-run'))
    expect(screen.getByTestId('fmt-out').textContent).toBe('{\n    "a": 1\n}\n')
  })
})
