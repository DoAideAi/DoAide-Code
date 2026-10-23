import { describe, expect, it } from 'vitest'
import { DEFAULT_GRID, areaNames, cleanAreaName, gridCss, gridHtml, invalidAreas, isValidTrack, resizeAreas, trackList } from './gridTool.js'

describe('isValidTrack', () => {
  it('accepts lengths, fr, keywords and functions', () => {
    for (const t of ['1fr', '2.5fr', '100px', '20%', 'auto', 'min-content', 'minmax(100px, 1fr)', 'fit-content(200px)']) expect(isValidTrack(t), t).toBe(true)
  })
  it('rejects typos', () => {
    for (const t of ['', '1 fr', 'px', 'banana']) expect(isValidTrack(t), t).toBe(false)
  })
})

describe('trackList', () => {
  it('collapses identical tracks into repeat()', () => {
    expect(trackList(['1fr', '1fr', '1fr'])).toBe('repeat(3, 1fr)')
    expect(trackList(['200px', '1fr'])).toBe('200px 1fr')
    expect(trackList(['auto'])).toBe('auto')
  })
})

describe('areas', () => {
  it('cleans names into CSS identifiers', () => {
    expect(cleanAreaName('Main Content')).toBe('main-content')
    expect(cleanAreaName('1st')).toBe('a-1st')
    expect(cleanAreaName('  ')).toBe('.')
  })
  it('lists names and resizes with dots', () => {
    expect(areaNames(DEFAULT_GRID.areas)).toEqual(['header', 'sidebar', 'main', 'footer'])
    expect(resizeAreas([['a', 'b']], 2, 3)).toEqual([['a', 'b', '.'], ['.', '.', '.']])
  })
  it('flags areas that are not rectangles', () => {
    expect(invalidAreas(DEFAULT_GRID.areas)).toEqual([])
    expect(invalidAreas([['a', 'b'], ['b', 'a']])).toEqual(['a', 'b'])
    expect(invalidAreas([['a', 'a'], ['a', '.']])).toEqual(['a'])
  })
})

describe('gridCss', () => {
  it('writes the container and area rules', () => {
    const css = gridCss(DEFAULT_GRID)
    expect(css).toContain('display: grid;')
    expect(css).toContain('grid-template-columns: repeat(3, 1fr);')
    expect(css).toContain('grid-template-rows: auto 1fr auto;')
    expect(css).toContain('gap: 16px;')
    expect(css).toContain('"header  header  header"')
    expect(css).toContain('"footer  footer  footer";')
    expect(css).toContain('.sidebar { grid-area: sidebar; }')
  })
  it('splits unequal gaps and drops broken areas', () => {
    const css = gridCss({ ...DEFAULT_GRID, columnGap: 8, rowGap: 24, areas: [['a', 'b'], ['b', 'a']] })
    expect(css).toContain('gap: 24px 8px;')
    expect(css).not.toContain('grid-template-areas')
  })
})

describe('gridHtml', () => {
  it('emits one div per area, or numbered cells', () => {
    expect(gridHtml(DEFAULT_GRID)).toContain('<div class="main">main</div>')
    const plain = gridHtml({ columns: ['1fr', '1fr'], rows: ['auto'], areas: [['.', '.']] })
    expect(plain.match(/<div>/g)).toHaveLength(2)
  })
})
