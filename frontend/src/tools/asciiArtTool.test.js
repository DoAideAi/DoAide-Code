import { describe, expect, it } from 'vitest'
import { FONTS, renderAscii, wrapComment } from './asciiArtTool.js'

describe('renderAscii', () => {
  it('renders the Standard font', async () => {
    const art = await renderAscii('Hi', 'Standard')
    expect(art.split('\n')[0]).toBe('  _   _ _')
    expect(art).not.toMatch(/ +$/m)
  })
  it('loads every listed font', async () => {
    for (const font of Object.keys(FONTS)) {
      const art = await renderAscii('Ab1', font)
      expect(art.split('\n').length, font).toBeGreaterThan(1)
    }
  })
  it('renders each input line as its own block and keeps blank lines', async () => {
    const art = await renderAscii('A\n\nB', 'Small')
    const one = await renderAscii('A', 'Small')
    expect(art.startsWith(one)).toBe(true)
    expect(art.split('\n').length).toBeGreaterThan(one.split('\n').length * 2)
  })
  it('wraps at a maximum width', async () => {
    const wide = await renderAscii('wrap this text please', 'Standard')
    const narrow = await renderAscii('wrap this text please', 'Standard', { width: 60 })
    expect(Math.max(...narrow.split('\n').map((l) => l.length))).toBeLessThanOrEqual(60)
    expect(narrow.split('\n').length).toBeGreaterThan(wide.split('\n').length)
  })
  it('rejects unknown fonts', async () => {
    await expect(renderAscii('x', 'Nope')).rejects.toThrow('Unknown font')
  })
})

describe('wrapComment', () => {
  it('prefixes line comments without trailing spaces', () => {
    expect(wrapComment('a\n\nb', 'slash')).toBe('// a\n//\n// b')
    expect(wrapComment('a', 'hash')).toBe('# a')
    expect(wrapComment('a', 'dash')).toBe('-- a')
  })
  it('defuses closing tokens inside block comments', () => {
    expect(wrapComment('x */ y', 'block')).toBe('/*\nx * / y\n*/')
    expect(wrapComment('a -- b', 'html')).toBe('<!--\na - - b\n-->')
  })
  it('leaves plain art alone', () => {
    expect(wrapComment('art', 'none')).toBe('art')
  })
})
