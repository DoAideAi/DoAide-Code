import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import StringPage from './StringPage.jsx'

afterEach(cleanup)

describe('StringPage', () => {
  it('converts every case as you type', () => {
    render(<StringPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert, count and slugify strings')
    fireEvent.change(screen.getByTestId('str-input'), { target: { value: 'hello world example' } })
    expect(screen.getByTestId('str-camelcase').textContent).toBe('helloWorldExample')
    expect(screen.getByTestId('str-snake-case').textContent).toBe('hello_world_example')
    expect(screen.getByTestId('str-kebab-case').textContent).toBe('hello-world-example')
    expect(screen.getByTestId('str-slug').textContent).toBe('hello-world-example')
    expect(screen.getByTestId('str-reversed').textContent).toBe('elpmaxe dlrow olleh')
  })

  it('counts characters, words, lines and bytes', () => {
    render(<StringPage />)
    fireEvent.change(screen.getByTestId('str-input'), { target: { value: 'one two\nthree' } })
    expect(screen.getByTestId('str-counts').textContent).toMatch(/13 characters · 3 words · 2 lines · 13 UTF-8 bytes/)
  })

  it('shows no conversion table for empty input', () => {
    render(<StringPage />)
    expect(screen.queryByTestId('str-slug')).toBeNull()
  })
})
