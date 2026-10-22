import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ShortcutsHelp from './ShortcutsHelp.jsx'

afterEach(cleanup)

describe('ShortcutsHelp', () => {
  it('opens from the button, closes on Escape, and gives focus back', () => {
    render(<ShortcutsHelp />)
    const button = screen.getByTestId('shortcuts-open')
    fireEvent.click(button)
    const panel = screen.getByTestId('shortcuts-panel')
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(panel)
    expect(panel.textContent).toContain('Run the tool')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('shortcuts-panel')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('opens on ? outside of inputs, but not inside one', () => {
    render(
      <div>
        <input data-testid="field" />
        <ShortcutsHelp />
      </div>,
    )
    fireEvent.keyDown(screen.getByTestId('field'), { key: '?' })
    expect(screen.queryByTestId('shortcuts-panel')).toBeNull()
    fireEvent.keyDown(document.body, { key: '?' })
    expect(screen.getByTestId('shortcuts-panel')).toBeTruthy()
  })

  it('closes from the Close button', () => {
    render(<ShortcutsHelp />)
    fireEvent.click(screen.getByTestId('shortcuts-open'))
    fireEvent.click(screen.getByTestId('shortcuts-close'))
    expect(screen.queryByTestId('shortcuts-panel')).toBeNull()
  })
})
