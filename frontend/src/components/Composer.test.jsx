import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Composer from './Composer.jsx'

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
