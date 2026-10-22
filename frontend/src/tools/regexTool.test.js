import { describe, expect, it } from 'vitest'
import { runRegex } from './regexTool.js'

describe('runRegex', () => {
  it('finds every match with g', () => {
    const { ok, matches } = runRegex('a.', 'g', 'ab ac ad')
    expect(ok).toBe(true)
    expect(matches.map((m) => m.text)).toEqual(['ab', 'ac', 'ad'])
    expect(matches[1].index).toBe(3)
  })

  it('finds only the first match without g', () => {
    expect(runRegex('a.', '', 'ab ac').matches).toHaveLength(1)
  })

  it('reports a bad pattern instead of throwing', () => {
    const result = runRegex('(unclosed', 'g', 'x')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Invalid regular expression/)
  })

  it('captures numbered and named groups', () => {
    const { matches } = runRegex('(?<user>\\w+)@(\\w+)', 'g', 'jo@ex.com')
    expect(matches[0].groups).toEqual(['jo', 'ex'])
    expect(matches[0].named).toEqual({ user: 'jo' })
  })

  it('cuts the text into segments covering everything', () => {
    const { segments } = runRegex('b+', 'g', 'abba')
    expect(segments).toEqual([
      { text: 'a', match: null },
      { text: 'bb', match: 0 },
      { text: 'a', match: null },
    ])
  })

  it('survives zero-length matches', () => {
    const { matches } = runRegex('x*', 'g', 'ab')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.length).toBeLessThan(10)
  })

  it('respects the i and m flags', () => {
    expect(runRegex('^a', 'gim', 'x\nAb').matches).toHaveLength(1)
    expect(runRegex('^a', 'g', 'x\nAb').matches).toHaveLength(0)
  })

  it('handles an empty pattern as no matches', () => {
    const { matches, segments } = runRegex('', 'g', 'abc')
    expect(matches).toEqual([])
    expect(segments).toEqual([{ text: 'abc', match: null }])
  })
})
