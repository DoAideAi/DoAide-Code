import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ImagePage from './ImagePage.jsx'

afterEach(cleanup)

const png = () => new File(['fake-png-bytes'], 'logo.png', { type: 'image/png' })

describe('ImagePage', () => {
  it('converts a chosen image to every snippet', async () => {
    render(<ImagePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert an image to Base64')
    fireEvent.change(screen.getByTestId('img-input'), { target: { files: [png()] } })
    await waitFor(() => expect(screen.getByTestId('img-stats')).toBeTruthy())
    const expected = `data:image/png;base64,${btoa('fake-png-bytes')}`
    expect(screen.getByAltText('logo.png').getAttribute('src')).toBe(expected)
    expect(screen.getByTestId('img-copy-markdown')).toBeTruthy()
  })

  it('accepts a dropped file', async () => {
    render(<ImagePage />)
    fireEvent.drop(screen.getByTestId('img-drop'), { dataTransfer: { files: [png()] } })
    await waitFor(() => expect(screen.getByTestId('img-stats')).toBeTruthy())
  })

  it('rejects a non-image with an explanation', async () => {
    render(<ImagePage />)
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('img-input'), { target: { files: [pdf] } })
    await waitFor(() => expect(screen.getByTestId('img-error').textContent).toMatch(/Not a supported image/))
  })
})
