import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import useTabTitle, { tabTitle } from './useTabTitle.js'

function Probe({ busy }) {
  useTabTitle(busy)
  return null
}

const setHidden = (hidden) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })

afterEach(() => {
  cleanup()
  setHidden(false)
})

describe('tabTitle', () => {
  it('says working, reply ready, or just the name', () => {
    expect(tabTitle(true, false)).toBe('● Working… · DoAide Code')
    expect(tabTitle(false, true)).toBe('✓ Reply ready · DoAide Code')
    expect(tabTitle(false, false)).toBe('DoAide Code')
  })
})

describe('useTabTitle', () => {
  it('shows working while busy and the plain name when the reply finishes in view', () => {
    const { rerender } = render(<Probe busy={false} />)
    expect(document.title).toBe('DoAide Code')
    rerender(<Probe busy />)
    expect(document.title).toBe('● Working… · DoAide Code')
    rerender(<Probe busy={false} />)
    expect(document.title).toBe('DoAide Code')
  })

  it('a reply finished in another tab says so until the tab is seen', () => {
    const { rerender } = render(<Probe busy />)
    setHidden(true)
    rerender(<Probe busy={false} />)
    expect(document.title).toBe('✓ Reply ready · DoAide Code')
    setHidden(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(document.title).toBe('DoAide Code')
  })
})
