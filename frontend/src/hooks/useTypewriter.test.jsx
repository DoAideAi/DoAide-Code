import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useTypewriter, { commonPrefix, speedFor } from './useTypewriter.js'

function Shown({ text, live, seen }) {
  return <p data-testid="shown">{useTypewriter(text, live, seen)}</p>
}
const shown = () => screen.getByTestId('shown').textContent
const frames = (n) => act(() => vi.advanceTimersByTime(16 * n))

beforeEach(() => {
  vi.useFakeTimers()
  // Frames as 16 ms timers, so fake timers drive them.
  vi.stubGlobal('requestAnimationFrame', (fn) => setTimeout(fn, 16))
  vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('speedFor', () => {
  it('catches up in 45 frames, never slower than 2 characters a frame', () => {
    expect(speedFor(0, 3)).toBe(2)
    expect(speedFor(0, 4500)).toBe(100)
    expect(speedFor(100, 1000)).toBe(20)
  })

  it('commonPrefix', () => {
    expect(commonPrefix('hello world', 'hello there')).toBe(6)
    expect(commonPrefix('', 'x')).toBe(0)
  })
})

describe('useTypewriter', () => {
  it('types a whole answer out over well under a second, even after the reply finished', () => {
    const answer = 'x'.repeat(900)
    const { rerender } = render(<Shown text="" live />)
    rerender(<Shown text={answer} live />)
    // The answer and "done" land together, as when the local answer passes its checks.
    rerender(<Shown text={answer} live={false} />)
    expect(shown().length).toBeLessThan(900)
    frames(5)
    const partway = shown().length
    expect(partway).toBeGreaterThan(0)
    expect(partway).toBeLessThan(900)
    frames(41)
    expect(shown()).toBe(answer)
  })

  it('shows replies that were already complete at once', () => {
    render(<Shown text="old answer" live={false} />)
    expect(shown()).toBe('old answer')
  })

  it('does not retype the draft the reader already saw', () => {
    const { rerender } = render(<Shown text="" live seen="The fix is" />)
    rerender(<Shown text="The fix is in app.py" live seen="The fix is" />)
    expect(shown().startsWith('The fix is')).toBe(true)
    frames(30)
    expect(shown()).toBe('The fix is in app.py')
  })

  it('respects reduced motion', () => {
    vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduce') }))
    const { rerender } = render(<Shown text="" live />)
    rerender(<Shown text="all of it" live />)
    expect(shown()).toBe('all of it')
  })
})
