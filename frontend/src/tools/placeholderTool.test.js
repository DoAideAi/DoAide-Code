import { describe, expect, it } from 'vitest'
import { autoTextColor, buildSvg, fitFontSize, normalizeHex, parseSize, svgDataUri } from './placeholderTool.js'

describe('placeholder helpers', () => {
  it('parses sizes', () => {
    expect(parseSize('1200x630')).toEqual({ width: 1200, height: 630 })
    expect(parseSize(' 300 ')).toEqual({ width: 300, height: 300 })
    expect(parseSize('99999×10')).toEqual({ width: 4000, height: 10 })
    expect(parseSize('big')).toBeNull()
  })

  it('normalizes hex colors and picks readable text', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex('zzz')).toBeNull()
    expect(autoTextColor('#ffffff')).toBe('#1f2937')
    expect(autoTextColor('#0f172a')).toBe('#f9fafb')
  })

  it('fits text to the box', () => {
    expect(fitFontSize(1200, 630, '1200 × 630')).toBe(160) // width-bound: 960px / (10 chars × 0.6em)
    expect(fitFontSize(728, 90, 'Banner')).toBeLessThanOrEqual(37)
  })

  it('builds escaped multi-line SVG', () => {
    const svg = buildSvg({ width: 400, height: 200, bg: '#ccc', fg: '#333', text: 'A & B\n<hero>' })
    expect(svg).toContain('width="400" height="200"')
    expect(svg).toContain('A &amp; B')
    expect(svg).toContain('&lt;hero&gt;')
    expect(svg.match(/<tspan/g)).toHaveLength(2)
    expect(buildSvg({ width: 10, height: 10, bg: '#000', fg: '#fff' })).toContain('10 × 10')
    expect(svgDataUri('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E')
  })
})
