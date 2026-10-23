import { describe, expect, it } from 'vitest'
import { EXPORTS, SCHEMES, contrastRatio, hexToHsl, hslToHex, normalizeHex, palette, randomHex, textColorFor } from './paletteTool.js'

describe('conversions', () => {
  it('normalizes hex input', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex('0ea5e9')).toBe('#0ea5e9')
    expect(normalizeHex('#12345')).toBeNull()
  })
  it('round-trips hex through HSL', () => {
    for (const hex of ['#0ea5e9', '#ff0000', '#123456', '#808080', '#ffffff']) expect(hslToHex(hexToHsl(hex))).toBe(hex)
  })
  it('knows primary hues', () => {
    expect(hexToHsl('#00ff00').map(Math.round)).toEqual([120, 100, 50])
  })
})

describe('palette', () => {
  it('returns five colors for every scheme, base included', () => {
    for (const scheme of Object.keys(SCHEMES)) {
      const colors = palette('#0ea5e9', scheme)
      expect(colors, scheme).toHaveLength(5)
      for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
    expect(palette('#0ea5e9', 'complementary')[0]).toBe('#0ea5e9')
  })
  it('puts the complement 180° away', () => {
    const [, , , comp] = palette('#ff0000', 'complementary')
    expect(Math.round(hexToHsl(comp)[0])).toBe(180)
  })
  it('spaces triadic hues 120° apart', () => {
    const hues = palette('#ff0000', 'triadic').slice(0, 3).map((c) => Math.round(hexToHsl(c)[0]))
    expect(hues).toEqual([0, 120, 240])
  })
})

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })
  it('picks readable label colors', () => {
    expect(textColorFor('#ffff00')).toBe('#000000')
    expect(textColorFor('#1e3a8a')).toBe('#ffffff')
  })
})

describe('exports and random', () => {
  it('formats every export', () => {
    const colors = ['#111111', '#222222']
    expect(EXPORTS.css(colors)).toContain('--color-2: #222222;')
    expect(EXPORTS.scss(colors)).toBe('$color-1: #111111;\n$color-2: #222222;')
    expect(EXPORTS.tailwind(colors)).toContain("200: '#222222',")
    expect(JSON.parse(EXPORTS.json(colors))).toEqual(colors)
  })
  it('makes valid random colors', () => {
    expect(randomHex(() => 0.5)).toMatch(/^#[0-9a-f]{6}$/)
  })
})
