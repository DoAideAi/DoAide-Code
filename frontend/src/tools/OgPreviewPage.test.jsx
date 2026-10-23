import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import OgPreviewPage from './OgPreviewPage.jsx'

afterEach(cleanup)

describe('OgPreviewPage', () => {
  it('previews the sample head', () => {
    render(<OgPreviewPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Preview Open Graph link cards')
    expect(screen.getByTestId('og-fb-title').textContent).toBe('60+ free developer tools — DoAide Code')
    expect(screen.getByTestId('og-google-title').textContent).toBe('Free Online Code Tools | DoAide Code')
    expect(screen.getByTestId('og-checks').textContent).toContain('og:image is set')
  })

  it('updates from pasted HTML and edited fields', () => {
    render(<OgPreviewPage />)
    fireEvent.change(screen.getByTestId('og-html'), { target: { value: '<title>Only a title</title>' } })
    expect(screen.getByTestId('og-fb-title').textContent).toBe('Only a title')
    expect(screen.getByTestId('og-checks').textContent).toContain('Missing og:image')
    fireEvent.change(screen.getByTestId('og-field-title'), { target: { value: 'Edited' } })
    expect(screen.getByTestId('og-fb-title').textContent).toBe('Edited')
  })
})
