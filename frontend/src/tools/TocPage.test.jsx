import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TocPage from './TocPage.jsx'

afterEach(cleanup)

describe('TocPage', () => {
  it('builds a TOC for the sample README', () => {
    render(<TocPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate a markdown table of contents')
    const lines = screen.getByTestId('toc-out').textContent.split('\n')
    expect(lines[0]).toBe('- [Installation](#installation)')
    expect(lines[1]).toBe('  - [With npm](#with-npm)')
  })

  it('follows level, numbering and link options, and inserts into the document', () => {
    render(<TocPage />)
    fireEvent.change(screen.getByTestId('toc-max'), { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('toc-ordered'))
    fireEvent.click(screen.getByTestId('toc-links'))
    expect(screen.getByTestId('toc-out').textContent).toBe('1. Installation\n2. Usage\n3. API reference\n4. Contributing\n5. License')
    fireEvent.click(screen.getByText('Insert into document'))
    expect(screen.getByTestId('toc-in').value).toContain('# My Project\n\n<!-- toc -->\n\n1. Installation')
  })
})
