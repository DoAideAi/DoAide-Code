import { describe, expect, it } from 'vitest'
import { MAX_QR_CHARS, qrSvg, svgDataUrl } from './qrTool.js'

describe('qrSvg', () => {
  it('renders an SVG with a quiet zone', () => {
    const svg = qrSvg('https://code.doaide.com', { size: 256 })
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="256"')
    // Version 1 is 21 modules; any version plus margin 4 each side gives viewBox ≥ 29.
    const viewBox = /viewBox="0 0 (\d+) \1"/.exec(svg)
    expect(Number(viewBox[1])).toBeGreaterThanOrEqual(29)
    expect(svg).toContain('fill="#000000"')
  })

  it('is deterministic for the same input', () => {
    expect(qrSvg('same text')).toBe(qrSvg('same text'))
  })

  it('honors the error correction level', () => {
    // Higher correction needs more modules for the same text, so the code grows.
    const low = /viewBox="0 0 (\d+)/.exec(qrSvg('x'.repeat(100), { ecl: 'L' }))[1]
    const high = /viewBox="0 0 (\d+)/.exec(qrSvg('x'.repeat(100), { ecl: 'H' }))[1]
    expect(Number(high)).toBeGreaterThan(Number(low))
  })

  it('explains empty and oversized input', () => {
    expect(() => qrSvg('')).toThrow(/Type some text/)
    expect(() => qrSvg('x'.repeat(MAX_QR_CHARS + 1))).toThrow(/Too long/)
  })
})

describe('svgDataUrl', () => {
  it('URL-encodes the SVG', () => {
    expect(svgDataUrl('<svg a="b"/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%20a%3D%22b%22%2F%3E')
  })
})
