import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Composer, { suggestionsFor } from './Composer.jsx'

afterEach(cleanup)

function setup() {
  const onSend = vi.fn(() => true)
  render(<Composer busy={false} disabled={false} onSend={onSend} onStop={() => {}} />)
  const box = screen.getByLabelText('Message')
  fireEvent.change(box, { target: { value: 'fix the bug' } })
  return { onSend, box }
}

describe('keyboard shortcuts', () => {
  it.each([
    ['Cmd+Enter', { metaKey: true }],
    ['Ctrl+Enter', { ctrlKey: true }],
    ['Enter', {}],
  ])('%s sends the message', (_, keys) => {
    const { onSend, box } = setup()
    fireEvent.keyDown(box, { key: 'Enter', ...keys })
    expect(onSend).toHaveBeenCalledWith('fix the bug')
    expect(box.value).toBe('')
  })

  it('Cmd+Shift+Enter still sends; Shift+Enter alone does not', () => {
    const { onSend, box } = setup()
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true, metaKey: true })
    expect(onSend).toHaveBeenCalledOnce()
  })

  it('Escape clears the box without sending', () => {
    const { onSend, box } = setup()
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(box.value).toBe('')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('Enter while an IME is composing neither sends nor clears', () => {
    const { onSend, box } = setup()
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(box, { key: 'Escape', isComposing: true })
    expect(onSend).not.toHaveBeenCalled()
    expect(box.value).toBe('fix the bug')
  })
})

describe('suggestions', () => {
  it('offers common prompts and slash commands for a prefix', () => {
    expect(suggestionsFor('ex')).toEqual(['explain ', 'explain what this project does'])
    expect(suggestionsFor('add')).toEqual(['add tests for '])
    expect(suggestionsFor('/sw')).toEqual(['/switch-project '])
    expect(suggestionsFor('')).toEqual([])
    expect(suggestionsFor('fix the bug in router.py')).toEqual([])
    expect(suggestionsFor('review my changes')).toEqual([])
  })

  function typed(value) {
    const onSend = vi.fn(() => true)
    render(<Composer busy={false} disabled={false} onSend={onSend} onStop={() => {}} />)
    const box = screen.getByLabelText('Message')
    fireEvent.change(box, { target: { value } })
    return { onSend, box }
  }

  it('Tab takes the first suggestion; clicking takes that one', () => {
    const { box, onSend } = typed('ad')
    expect(screen.getByTestId('suggestions').textContent).toContain('add tests for')
    fireEvent.keyDown(box, { key: 'Tab' })
    expect(box.value).toBe('add tests for ')
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: 're' } })
    fireEvent.click(screen.getByRole('button', { name: 'refactor' }))
    expect(box.value).toBe('refactor ')
  })

  it('arrows highlight, Enter takes the highlighted one, Enter with none highlighted sends', () => {
    const { box, onSend } = typed('fi')
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(box.value).toBe('fix the failing tests')
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: 'fi' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('fi')
  })

  it('Escape hides suggestions, a second Escape clears the box', () => {
    const { box } = typed('ex')
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByTestId('suggestions')).toBeNull()
    expect(box.value).toBe('ex')
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(box.value).toBe('')
  })
})
