import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTAINER, DEFAULT_ITEM, containerCss, flexboxCss, itemCss } from './flexboxTool.js'

describe('containerCss', () => {
  it('emits only non-default properties plus display and gap', () => {
    expect(containerCss(DEFAULT_CONTAINER)).toBe('.container {\n  display: flex;\n  gap: 8px;\n}')
    const css = containerCss({ ...DEFAULT_CONTAINER, justifyContent: 'center', gap: 0 })
    expect(css).toContain('justify-content: center;')
    expect(css).not.toContain('gap')
    expect(css).not.toContain('flex-direction')
  })
})

describe('itemCss', () => {
  it('returns null for an all-default item', () => {
    expect(itemCss(DEFAULT_ITEM, 0)).toBeNull()
  })
  it('emits the flex shorthand and align-self', () => {
    const css = itemCss({ grow: 1, shrink: 0, basis: '200px', alignSelf: 'center' }, 2)
    expect(css).toContain('.item-3')
    expect(css).toContain('flex: 1 0 200px;')
    expect(css).toContain('align-self: center;')
  })
})

describe('flexboxCss', () => {
  it('stitches container and only the customized items together', () => {
    const css = flexboxCss(DEFAULT_CONTAINER, [DEFAULT_ITEM, { ...DEFAULT_ITEM, grow: 2 }])
    expect(css).toContain('.container')
    expect(css).not.toContain('.item-1')
    expect(css).toContain('.item-2')
    expect(css).toContain('flex: 2 1 auto;')
  })
})
