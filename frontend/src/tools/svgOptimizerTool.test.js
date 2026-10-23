import { describe, expect, it } from 'vitest'
import { optimizeSvg, savingsLabel } from './svgOptimizerTool.js'

const MESSY = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Exported from an editor -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/ns" viewBox="0 0 100.000001 100.499999">
  <title>My icon</title>
  <metadata>junk</metadata>
  <g inkscape:label="Layer 1">
    <path d="M 10.123456 10.987654 L 90.000001 90.111111 Z" stroke-width="2.000001"/>
  </g>
  <g></g>
</svg>`

describe('optimizeSvg', () => {
  it('strips prolog, comments, metadata, titles and editor namespaces', () => {
    const { svg } = optimizeSvg(MESSY)
    expect(svg).not.toContain('<?xml')
    expect(svg).not.toContain('<!--')
    expect(svg).not.toContain('metadata')
    expect(svg).not.toContain('<title>')
    expect(svg).not.toContain('inkscape')
    expect(svg.startsWith('<svg')).toBe(true)
  })

  it('rounds numbers and compacts path data', () => {
    const { svg } = optimizeSvg(MESSY)
    expect(svg).toContain('M10.12 10.99L90 90.11Z')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).toContain('viewBox="0 0 100 100.5"')
  })

  it('removes now-empty groups and collapses whitespace', () => {
    const { svg } = optimizeSvg(MESSY)
    expect(svg).not.toContain('<g></g>')
    expect(svg).not.toContain('>\n')
  })

  it('reports savings and honors precision/title options', () => {
    const result = optimizeSvg(MESSY, { precision: 4, removeTitles: false })
    expect(result.svg).toContain('<title>')
    expect(result.svg).toContain('10.1235')
    expect(result.saved).toBe(result.before - result.after)
    expect(result.after).toBeLessThan(result.before)
  })

  it('rejects empty and invalid input readably', () => {
    expect(() => optimizeSvg('  ')).toThrow(/paste some svg/i)
    expect(() => optimizeSvg('<div>not svg</div>')).toThrow(/not valid svg/i)
    expect(() => optimizeSvg('<svg><unclosed</svg>')).toThrow(/not valid svg/i)
  })
})

describe('savingsLabel', () => {
  it('formats bytes and percent', () => {
    expect(savingsLabel({ before: 2048, after: 1024, saved: 1024 })).toBe('2.0 KB → 1.0 KB (50% smaller)')
    expect(savingsLabel({ before: 100, after: 80, saved: 20 })).toBe('100 B → 80 B (20% smaller)')
  })
})
