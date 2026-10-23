import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TailwindPage from './TailwindPage.jsx'

afterEach(cleanup)

describe('TailwindPage', () => {
  it('converts the sample card', () => {
    render(<TailwindPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Convert CSS to Tailwind')
    const card = screen.getByTestId('tw-classes-0').textContent
    expect(card).toContain('flex flex-col gap-3 p-6 max-w-md bg-white border border-[#e5e7eb] rounded-xl')
    expect(card).toContain('hover:border-[#3b82f6]')
    expect(card).toContain('md:flex-row md:p-8')
    expect(screen.getByTestId('tw-classes-1').textContent.trim()).toBe('text-xl font-semibold leading-tight text-[#111827]')
  })

  it('converts pasted declarations', () => {
    render(<TailwindPage />)
    fireEvent.change(screen.getByTestId('tw-in'), { target: { value: 'display: grid; grid-template-columns: repeat(2, 1fr);' } })
    expect(screen.getByTestId('tw-classes-0').textContent.trim()).toBe('grid grid-cols-2')
  })
})
