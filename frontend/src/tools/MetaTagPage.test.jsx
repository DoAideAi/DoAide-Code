import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import MetaTagPage from './MetaTagPage.jsx'

afterEach(cleanup)

describe('MetaTagPage', () => {
  it('starts empty with a placeholder output', () => {
    render(<MetaTagPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate SEO meta tags')
    expect(screen.getByTestId('meta-output').textContent).toMatch(/fill in the fields/i)
    expect(screen.queryByTestId('meta-serp')).toBeNull()
  })

  it('generates tags and a search preview as fields are filled', () => {
    render(<MetaTagPage />)
    fireEvent.change(screen.getByTestId('meta-title'), { target: { value: 'My Tool' } })
    fireEvent.change(screen.getByTestId('meta-desc'), { target: { value: 'Does things.' } })
    fireEvent.change(screen.getByTestId('meta-url'), { target: { value: 'https://x.io/t' } })
    const out = screen.getByTestId('meta-output').textContent
    expect(out).toContain('<title>My Tool</title>')
    expect(out).toContain('og:title')
    expect(out).toContain('twitter:card')
    expect(screen.getByTestId('meta-serp').textContent).toContain('My Tool')
  })

  it('warns when the title is too long', () => {
    render(<MetaTagPage />)
    fireEvent.change(screen.getByTestId('meta-title'), { target: { value: 'x'.repeat(70) } })
    expect(screen.getByText(/may be cut off/i)).toBeTruthy()
  })
})
