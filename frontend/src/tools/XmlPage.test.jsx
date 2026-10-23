import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import XmlPage from './XmlPage.jsx'

afterEach(cleanup)

describe('XmlPage', () => {
  it('formats the sample and converts it to JSON', () => {
    render(<XmlPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Format and validate XML')
    expect(screen.getByTestId('xml-valid')).toBeTruthy()
    expect(screen.getByTestId('xml-out').textContent).toContain('\n    <item>\n      <title>CSV to JSON</title>')
    fireEvent.click(screen.getByTestId('xml-mode-json'))
    const json = JSON.parse(screen.getByTestId('xml-out').textContent)
    expect(json.rss.channel.item).toHaveLength(2)
  })

  it('points at the first error', () => {
    render(<XmlPage />)
    fireEvent.change(screen.getByTestId('xml-in'), { target: { value: '<a>\n<b>\n</a>' } })
    expect(screen.getByTestId('xml-error').textContent).toBe('Line 3, column 1: Expected </b> but found </a>')
  })
})
