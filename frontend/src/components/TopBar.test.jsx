import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TopBar from './TopBar.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('refresh button', () => {
  it('is an icon shown on phones and desktop alike, with an accessible name', () => {
    render(<TopBar project="alpha" color="green" busy={false} />)
    const button = screen.getByRole('button', { name: 'Refresh' })
    expect(button.querySelector('svg').getAttribute('class')).not.toContain('sm:hidden')
    expect(button.className).not.toContain('hidden')
  })

  it('reloads the page when tapped', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<TopBar project="alpha" color="green" busy={false} />)
    fireEvent.click(screen.getByTestId('refresh'))
    expect(reload).toHaveBeenCalledOnce()
  })
})
