import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeroDemo, { SCENES } from './HeroDemo.jsx'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('HeroDemo', () => {
  it('types the prompt, shows the code, then types the answer with the model badge', () => {
    render(<HeroDemo />)
    const demo = screen.getByTestId('hero-demo')
    expect(demo.textContent).not.toContain(SCENES[0].prompt)
    act(() => vi.advanceTimersByTime(20_000))
    expect(demo.textContent).toContain(SCENES[0].prompt)
    expect(demo.textContent).toContain('filter')
    expect(demo.textContent).toContain(SCENES[0].answer)
    expect(demo.textContent).toContain(SCENES[0].model)
  })

  it('moves on to the next scene after a hold', () => {
    render(<HeroDemo />)
    act(() => vi.advanceTimersByTime(20_000)) // scene 1 finishes; the hold timer is set on re-render
    act(() => vi.advanceTimersByTime(20_000)) // the hold elapses and the next scene starts typing
    act(() => vi.advanceTimersByTime(2_000))
    expect(screen.getByTestId('hero-demo').textContent).toContain(SCENES[1].prompt)
  })

  it('shows the first scene whole, unanimated, under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })))
    render(<HeroDemo />)
    const demo = screen.getByTestId('hero-demo')
    expect(demo.textContent).toContain(SCENES[0].prompt)
    expect(demo.textContent).toContain(SCENES[0].answer)
    expect(demo.textContent).toContain(SCENES[0].model)
  })
})
