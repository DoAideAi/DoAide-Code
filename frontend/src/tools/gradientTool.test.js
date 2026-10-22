import { describe, expect, it } from 'vitest'
import { GRADIENT_PRESETS, gradientCss, gradientSnippet, spreadStops } from './gradientTool.js'

const stops = [
  { color: '#ff0080', pos: 0 },
  { color: '#7928ca', pos: 100 },
]

describe('gradientCss', () => {
  it('builds a linear gradient with the angle', () => {
    expect(gradientCss({ type: 'linear', angle: 135, stops })).toBe('linear-gradient(135deg, #ff0080 0%, #7928ca 100%)')
  })
  it('builds radial and conic forms', () => {
    expect(gradientCss({ type: 'radial', angle: 0, stops })).toBe('radial-gradient(circle, #ff0080 0%, #7928ca 100%)')
    expect(gradientCss({ type: 'conic', angle: 45, stops })).toContain('conic-gradient(from 45deg,')
  })
  it('sorts stops by position', () => {
    const out = gradientCss({ type: 'linear', angle: 90, stops: [stops[1], stops[0]] })
    expect(out.indexOf('#ff0080')).toBeLessThan(out.indexOf('#7928ca'))
  })
})

describe('gradientSnippet', () => {
  it('includes a solid fallback using the first stop', () => {
    const snippet = gradientSnippet({ type: 'linear', angle: 90, stops })
    expect(snippet.split('\n')[0]).toBe('background: #ff0080;')
    expect(snippet).toContain('linear-gradient(90deg,')
  })
})

describe('spreadStops', () => {
  it('spaces three stops at 0, 50, 100', () => {
    const out = spreadStops([stops[0], { color: '#ffffff', pos: 10 }, stops[1]])
    expect(out.map((s) => s.pos)).toEqual([0, 50, 100])
  })
})

describe('GRADIENT_PRESETS', () => {
  it('all produce valid css with 2+ stops', () => {
    for (const p of GRADIENT_PRESETS) {
      expect(p.stops.length).toBeGreaterThanOrEqual(2)
      expect(gradientCss(p)).toMatch(/gradient\(/)
    }
  })
})
