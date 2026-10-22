import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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

describe('@ file mentions', () => {
  it('finds the mention at the caret, not in an email address', async () => {
    const { mentionAt, insertMention } = await import('./Composer.jsx')
    expect(mentionAt('look at @src/ru', 15)).toEqual({ start: 8, query: 'src/ru' })
    expect(mentionAt('@', 1)).toEqual({ start: 0, query: '' })
    expect(mentionAt('mail me@x.com', 13)).toBeNull()
    expect(mentionAt('@a.py done', 10)).toBeNull()
    expect(insertMention('fix @ru now', 7, { start: 4, query: 'ru' }, 'src/runner.py')).toEqual({
      text: 'fix @src/runner.py now',
      caret: 19,
    })
  })

  it('typing @ offers project files; Enter inserts the picked one', async () => {
    vi.useFakeTimers()
    const findFiles = vi.fn(async (q) => ({ files: q === 'ru' ? ['src/runner.py', 'run.py'] : [] }))
    const onSend = vi.fn(() => true)
    render(<Composer busy={false} disabled={false} onSend={onSend} onStop={() => {}} findFiles={findFiles} />)
    const box = screen.getByLabelText('Message')
    expect(box.placeholder).toMatch(/@ to mention a file/)
    fireEvent.change(box, { target: { value: 'explain @ru', selectionStart: 11 } })
    await act(async () => vi.advanceTimersByTime(150))
    vi.useRealTimers()
    expect(findFiles).toHaveBeenCalledWith('ru')
    const list = screen.getByTestId('file-mentions')
    expect(list.textContent).toContain('runner.py')
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(box.value).toBe('explain @run.py ')
    expect(screen.queryByTestId('file-mentions')).toBeNull()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('Escape closes the picker and keeps the text', async () => {
    vi.useFakeTimers()
    render(<Composer busy={false} disabled={false} onSend={() => true} onStop={() => {}} findFiles={async () => ({ files: ['a.py'] })} />)
    const box = screen.getByLabelText('Message')
    fireEvent.change(box, { target: { value: '@a', selectionStart: 2 } })
    await act(async () => vi.advanceTimersByTime(150))
    vi.useRealTimers()
    expect(screen.getByTestId('file-mentions')).toBeTruthy()
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByTestId('file-mentions')).toBeNull()
    expect(box.value).toBe('@a')
  })
})
