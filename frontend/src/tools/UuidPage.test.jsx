import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import UuidPage from './UuidPage.jsx'

afterEach(cleanup)

const lines = () => screen.getByTestId('uuid-output').textContent.split('\n')

describe('UuidPage', () => {
  it('starts with five v4 UUIDs', () => {
    render(<UuidPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate UUIDs')
    expect(lines()).toHaveLength(5)
    for (const l of lines()) expect(l).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('generates a bulk batch of v7 in uppercase without hyphens', () => {
    render(<UuidPage />)
    fireEvent.change(screen.getByTestId('uuid-count'), { target: { value: '20' } })
    fireEvent.click(screen.getByTestId('uuid-version-v7'))
    fireEvent.click(screen.getByTestId('uuid-uppercase'))
    fireEvent.click(screen.getByTestId('uuid-hyphens'))
    expect(lines()).toHaveLength(20)
    expect(lines()[0]).toMatch(/^[0-9A-F]{12}7[0-9A-F]{19}$/)
  })

  it('decodes a pasted UUID', () => {
    render(<UuidPage />)
    fireEvent.change(screen.getByTestId('uuid-probe'), { target: { value: '017f22e2-79b0-7cc3-98c4-dc0c0c07398f' } })
    expect(screen.getByTestId('uuid-time').textContent).toBe('2022-02-22T19:22:22.000Z')
    fireEvent.change(screen.getByTestId('uuid-probe'), { target: { value: 'nope' } })
    expect(screen.getByRole('alert').textContent).toContain('Not a valid UUID')
  })
})
