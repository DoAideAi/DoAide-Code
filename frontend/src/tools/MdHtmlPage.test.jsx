import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import MdHtmlPage from './MdHtmlPage.jsx'

afterEach(cleanup)

describe('MdHtmlPage', () => {
  it('renders the sample preview', () => {
    render(<MdHtmlPage />)
    expect(screen.getAllByRole('heading', { level: 1 })[0].textContent).toBe('Convert Markdown to HTML')
    expect(screen.getByTestId('mdh-preview').querySelector('table')).not.toBeNull()
  })

  it('converts typed markdown and shows the HTML source', () => {
    render(<MdHtmlPage />)
    fireEvent.change(screen.getByTestId('mdh-input'), { target: { value: '## Hi\n\n**bold**' } })
    fireEvent.click(screen.getByTestId('mdh-view-html'))
    expect(screen.getByTestId('mdh-html').value).toBe('<h2>Hi</h2>\n<p><strong>bold</strong></p>')
  })

  it('never renders raw HTML from the input', () => {
    render(<MdHtmlPage />)
    fireEvent.change(screen.getByTestId('mdh-input'), { target: { value: '<img src=x onerror=alert(1)>' } })
    expect(screen.getByTestId('mdh-preview').querySelector('img')).toBeNull()
    expect(screen.getByTestId('mdh-preview').textContent).toContain('<img')
  })
})
