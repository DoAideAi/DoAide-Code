import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import MarkdownTablePage from './MarkdownTablePage.jsx'

afterEach(cleanup)

describe('MarkdownTablePage', () => {
  it('renders the default table as markdown', () => {
    render(<MarkdownTablePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate a markdown table')
    expect(screen.getByTestId('mdtable-output').textContent).toContain('| Formatter ')
  })

  it('edits cells, adds rows and columns, cycles alignment', () => {
    render(<MarkdownTablePage />)
    fireEvent.change(screen.getByTestId('mdtable-cell-0-0'), { target: { value: 'Linter' } })
    fireEvent.click(screen.getByTestId('mdtable-add-row'))
    fireEvent.click(screen.getByTestId('mdtable-add-col'))
    fireEvent.click(screen.getByTestId('mdtable-align-1'))
    const md = screen.getByTestId('mdtable-output').textContent
    expect(md).toContain('| Linter ')
    expect(md).toContain('Column 4')
    expect(md.split('\n')).toHaveLength(5)
    expect(md.split('\n')[1]).toMatch(/^\| :-+ \| :-+ \|/)
  })

  it('removes a column and a row', () => {
    render(<MarkdownTablePage />)
    fireEvent.click(screen.getByTestId('mdtable-remove-col-2'))
    fireEvent.click(screen.getByTestId('mdtable-remove-row-0'))
    const md = screen.getByTestId('mdtable-output').textContent
    expect(md).not.toContain('Free')
    expect(md).not.toContain('Formatter')
  })

  it('imports CSV and reports empty input', () => {
    render(<MarkdownTablePage />)
    fireEvent.click(screen.getByTestId('mdtable-import'))
    expect(screen.getByRole('alert').textContent).toContain('Paste')
    fireEvent.change(screen.getByTestId('mdtable-paste'), { target: { value: 'x,y\n1,2' } })
    fireEvent.click(screen.getByTestId('mdtable-import'))
    expect(screen.getByTestId('mdtable-output').textContent).toBe('| x   | y   |\n| --- | --- |\n| 1   | 2   |')
  })
})
