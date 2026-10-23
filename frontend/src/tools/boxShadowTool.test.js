import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYER, PRESETS, cssColor, layerCss, shadowCss } from './boxShadowTool.js'

describe('cssColor', () => {
  it('converts hex + opacity to rgba', () => {
    expect(cssColor('#000000', 35)).toBe('rgba(0, 0, 0, 0.35)')
    expect(cssColor('#38bdf8', 55)).toBe('rgba(56, 189, 248, 0.55)')
  })
  it('keeps the hex at full opacity', () => {
    expect(cssColor('#123456', 100)).toBe('#123456')
  })
})

describe('layerCss', () => {
  it('renders offsets, blur, spread and inset', () => {
    expect(layerCss({ ...DEFAULT_LAYER })).toBe('0px 8px 24px 0px rgba(0, 0, 0, 0.35)')
    expect(layerCss({ ...DEFAULT_LAYER, inset: true, x: 2 })).toMatch(/^inset 2px /)
  })
})

describe('shadowCss', () => {
  it('joins multiple layers across lines', () => {
    const css = shadowCss(PRESETS[1][1])
    expect(css.startsWith('box-shadow: ')).toBe(true)
    expect(css).toContain(',\n')
    expect(css.endsWith(';')).toBe(true)
  })
  it('handles one layer and none', () => {
    expect(shadowCss([DEFAULT_LAYER])).not.toContain('\n')
    expect(shadowCss([])).toBe('box-shadow: none;')
  })
})

describe('PRESETS', () => {
  it('every preset layer has the full shape', () => {
    for (const [name, layers] of PRESETS) {
      expect(name.length).toBeGreaterThan(2)
      for (const layer of layers) {
        for (const key of Object.keys(DEFAULT_LAYER)) expect(layer).toHaveProperty(key)
      }
    }
  })
})
