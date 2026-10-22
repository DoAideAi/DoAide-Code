import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TemplatesPage from './TemplatesPage.jsx'
import { TEMPLATES } from './templates.js'

afterEach(cleanup)

describe('TemplatesPage', () => {
  it('lists every template with its category filter', () => {
    render(<TemplatesPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start from a code template')
    expect(screen.getByText(`${TEMPLATES.length} of ${TEMPLATES.length} templates`)).toBeTruthy()
    expect(screen.getByText('React functional component')).toBeTruthy()
  })

  it('filters by category and search', () => {
    render(<TemplatesPage />)
    fireEvent.click(screen.getByTestId('tpl-cat-Python'))
    expect(screen.queryByText('React functional component')).toBeNull()
    expect(screen.getByText('Python CLI (argparse)')).toBeTruthy()
    fireEvent.change(screen.getByTestId('tpl-search'), { target: { value: 'dataclass' } })
    expect(screen.queryByText('Python CLI (argparse)')).toBeNull()
    expect(screen.getByText('Python class (dataclass)')).toBeTruthy()
  })

  it('shows the empty state when nothing matches', () => {
    render(<TemplatesPage />)
    fireEvent.change(screen.getByTestId('tpl-search'), { target: { value: 'nothing-matches-this' } })
    expect(screen.getByTestId('tpl-empty')).toBeTruthy()
  })

  it('reveals the highlighted code on demand', () => {
    render(<TemplatesPage />)
    fireEvent.click(screen.getByTestId('tpl-toggle-react-hook'))
    expect(screen.getByTestId('tpl-code-react-hook').textContent).toContain('AbortController')
    fireEvent.click(screen.getByTestId('tpl-toggle-react-hook'))
    expect(screen.queryByTestId('tpl-code-react-hook')).toBeNull()
  })
})
