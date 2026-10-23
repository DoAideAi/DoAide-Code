import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import YamlPage from './YamlPage.jsx'

afterEach(cleanup)

describe('YamlPage', () => {
  it('converts the sample YAML with merge keys to JSON', () => {
    render(<YamlPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert YAML to JSON and back')
    const json = JSON.parse(screen.getByTestId('yaml-out').textContent)
    expect(json.services.worker.restart).toBe('unless-stopped')
    expect(json.services.web.ports).toEqual(['3000:3000'])
  })

  it('shows errors and swaps direction', () => {
    render(<YamlPage />)
    fireEvent.change(screen.getByTestId('yaml-in'), { target: { value: 'a: [1' } })
    expect(screen.getByTestId('yaml-error').textContent).toMatch(/Line \d+/)
    fireEvent.change(screen.getByTestId('yaml-in'), { target: { value: 'a: 1' } })
    fireEvent.click(screen.getByTestId('yaml-swap'))
    expect(screen.getByTestId('yaml-in').value).toBe('{\n  "a": 1\n}')
    expect(screen.getByTestId('yaml-out').textContent).toBe('a: 1\n')
  })
})
