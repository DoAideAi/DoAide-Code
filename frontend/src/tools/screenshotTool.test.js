import { describe, expect, it } from 'vitest'
import { SHOT_THEMES, buildShot, escapeXml, tokenLines } from './screenshotTool.js'

describe('escapeXml', () => {
  it('escapes the XML specials', () => {
    expect(escapeXml('a < b && "c" > d')).toBe('a &lt; b &amp;&amp; &quot;c&quot; &gt; d')
  })
})

describe('tokenLines', () => {
  it('splits code into one token row per line', () => {
    const lines = tokenLines('const a = 1\nreturn a', 'js')
    expect(lines).toHaveLength(2)
    expect(lines[0].map((t) => t.text).join('')).toBe('const a = 1')
    expect(lines[0][0]).toEqual({ text: 'const', kind: 'keyword' })
  })

  it('cuts multi-line tokens at newlines', () => {
    const lines = tokenLines('/* one\ntwo */\nlet x', 'js')
    expect(lines).toHaveLength(3)
    expect(lines[0][0].kind).toBe('comment')
    expect(lines[1][0].kind).toBe('comment')
  })
})

describe('buildShot', () => {
  const code = 'function hi() {\n  return "hello" // greet\n}'

  it('produces a complete SVG with the theme colors', () => {
    const { svg, width, height } = buildShot({ code, lang: 'js', themeId: 'sunset' })
    expect(svg.startsWith('<svg xmlns=')).toBe(true)
    expect(svg).toContain('#ff0080') // sunset backdrop
    expect(svg).toContain('fill="#ffd166"') // sunset string color
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(svg).toContain(`width="${width}"`)
  })

  it('escapes code content', () => {
    const { svg } = buildShot({ code: 'if (a < b) {}', lang: 'js' })
    expect(svg).toContain('a &lt; b')
    expect(svg).not.toContain('a < b)')
  })

  it('draws window dots and a title only with chrome on', () => {
    const on = buildShot({ code, lang: 'js', title: 'hi.js' }).svg
    expect(on).toContain('#ff5f57')
    expect(on).toContain('hi.js')
    const off = buildShot({ code, lang: 'js', title: 'hi.js', window: false }).svg
    expect(off).not.toContain('#ff5f57')
    expect(off).not.toContain('hi.js')
  })

  it('grows with padding and flags truncation', () => {
    const small = buildShot({ code, lang: 'js', padding: 16 })
    const big = buildShot({ code, lang: 'js', padding: 96 })
    expect(big.width).toBe(small.width + 160)
    const long = buildShot({ code: Array(100).fill('x = 1').join('\n'), lang: 'py' })
    expect(long.truncated).toBe(true)
  })

  it('falls back to the first theme for an unknown id', () => {
    expect(buildShot({ code, themeId: 'nope' }).svg).toContain(SHOT_THEMES[0].backdrop[0])
  })
})
