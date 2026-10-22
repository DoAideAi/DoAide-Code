import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MessageList, { oldestServerId } from './MessageList.jsx'

const msg = (id, role = 'user') => ({ id, role, content: `#${id}`, status: 'done', created_at: 0 })

afterEach(cleanup)

describe('Load earlier messages', () => {
  it('shows the button only when older messages remain and a loader is given', () => {
    const { rerender } = render(<MessageList messages={[msg('a')]} hasMore={false} onLoadEarlier={vi.fn()} />)
    expect(screen.queryByTestId('load-earlier')).toBeNull()
    rerender(<MessageList messages={[msg('a')]} hasMore onLoadEarlier={null} />)
    expect(screen.queryByTestId('load-earlier')).toBeNull()
    rerender(<MessageList messages={[msg('a')]} hasMore onLoadEarlier={vi.fn()} />)
    expect(screen.getByTestId('load-earlier').textContent).toBe('Load earlier messages')
  })

  it('calls the loader, shows progress, and reports a failure so it can be retried', async () => {
    let finish
    const onLoadEarlier = vi.fn(() => new Promise((resolve, reject) => (finish = { resolve, reject })))
    render(<MessageList messages={[msg('a')]} hasMore onLoadEarlier={onLoadEarlier} />)
    const button = screen.getByTestId('load-earlier')
    fireEvent.click(button)
    expect(onLoadEarlier).toHaveBeenCalledTimes(1)
    expect(button.textContent).toBe('Loading…')
    expect(button.disabled).toBe(true)
    await act(async () => finish.reject(new Error('offline')))
    expect(button.textContent).toBe('Could not load, try again')
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    await act(async () => finish.resolve())
    expect(button.textContent).toBe('Load earlier messages')
  })

  it('does not jump to the bottom when older messages are added above', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { rerender } = render(<MessageList messages={[msg('c'), msg('d')]} />)
    scrollIntoView.mockClear()
    rerender(<MessageList messages={[msg('a'), msg('b'), msg('c'), msg('d')]} />)
    expect(scrollIntoView).not.toHaveBeenCalled()
    rerender(<MessageList messages={[msg('a'), msg('b'), msg('c'), msg('d'), msg('e')]} />)
    expect(scrollIntoView).toHaveBeenCalled()
    delete Element.prototype.scrollIntoView
  })
})

describe('oldestServerId', () => {
  it('skips client-only notices', () => {
    expect(oldestServerId([{ id: 'notice-1' }, { id: 'm1' }, { id: 'm2' }])).toBe('m1')
    expect(oldestServerId([{ id: 'notice-1' }])).toBeNull()
    expect(oldestServerId([])).toBeNull()
  })
})
