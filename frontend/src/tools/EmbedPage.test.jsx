import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import EmbedPage from './EmbedPage.jsx'
import { MAX_EMBED_CODE } from './embedTool.js'

afterEach(cleanup)

describe('EmbedPage', () => {
  it('shows the snippet and preview once there is code', () => {
    render(<EmbedPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Embed a code snippet on your site')
    expect(screen.queryByTestId('embed-snippet')).toBeNull()
    fireEvent.change(screen.getByTestId('embed-code'), { target: { value: 'print("hi")' } })
    expect(screen.getByTestId('embed-snippet').textContent).toContain('<iframe src="https://code.doaide.com/embed#code=')
    expect(screen.getByTestId('embed-preview').getAttribute('src')).toContain('/embed#code=')
  })

  it('carries the chosen language and tool into the snippet', () => {
    render(<EmbedPage />)
    fireEvent.change(screen.getByTestId('embed-code'), { target: { value: 'x = 1' } })
    fireEvent.change(screen.getByTestId('embed-language'), { target: { value: 'Python' } })
    fireEvent.change(screen.getByTestId('embed-action'), { target: { value: 'code-review' } })
    const snippet = screen.getByTestId('embed-snippet').textContent
    expect(snippet).toContain('lang=Python')
    expect(snippet).toContain('tool=code-review')
  })

  it('refuses code longer than the embed limit', () => {
    render(<EmbedPage />)
    fireEvent.change(screen.getByTestId('embed-code'), { target: { value: 'x'.repeat(MAX_EMBED_CODE + 1) } })
    expect(screen.queryByTestId('embed-snippet')).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(/too much code/)
  })
})
