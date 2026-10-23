import { describe, expect, it } from 'vitest'
import { AMBIGUOUS, DEFAULT_OPTIONS, SETS, activeSets, crackTime, estimateEntropy, generatePassword, generatedEntropy, randomInt, strength } from './passwordTool.js'

describe('randomInt', () => {
  it('stays in range and rejects biased draws', () => {
    for (let i = 0; i < 200; i++) {
      const n = randomInt(7)
      expect(n >= 0 && n < 7).toBe(true)
    }
    const draws = [0xffffffff, 10]
    expect(randomInt(7, (buf) => (buf[0] = draws.shift()))).toBe(3)
  })
})

describe('generatePassword', () => {
  it('respects length and includes every chosen set', () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePassword({ ...DEFAULT_OPTIONS, length: 12 })
      expect(p).toHaveLength(12)
      for (const set of Object.values(SETS)) expect([...p].some((c) => set.includes(c))).toBe(true)
    }
  })
  it('only uses allowed characters', () => {
    const p = generatePassword({ ...DEFAULT_OPTIONS, length: 128, symbols: false, excludeAmbiguous: true, exclude: 'abc' })
    expect(p).toMatch(/^[A-Za-z0-9]+$/)
    for (const c of [...AMBIGUOUS, 'a', 'b', 'c']) expect(p).not.toContain(c)
  })
  it('returns empty when nothing is selected', () => {
    expect(generatePassword({ ...DEFAULT_OPTIONS, lower: false, upper: false, digits: false, symbols: false })).toBe('')
  })
  it('drops sets emptied by exclusions', () => {
    expect(Object.keys(activeSets({ ...DEFAULT_OPTIONS, upper: false, lower: false, symbols: false, exclude: '0123456789' }))).toEqual([])
  })
})

describe('entropy and strength', () => {
  it('computes exact entropy for generated passwords', () => {
    expect(generatedEntropy({ ...DEFAULT_OPTIONS, length: 10, upper: false, symbols: false })).toBeCloseTo(10 * Math.log2(36))
  })
  it('scores weak patterns lower than random strings', () => {
    expect(estimateEntropy('password1234')).toBeLessThan(estimateEntropy('k9#Tq2!vXm4z'))
    expect(strength(estimateEntropy('password')).label).toBe('Very weak')
    expect(strength(estimateEntropy('aaaaaaaaaaaa'))).toMatchObject({ label: 'Very weak' })
    expect(strength(130).label).toBe('Very strong')
    expect(estimateEntropy('')).toBe(0)
  })
  it('describes crack times', () => {
    expect(crackTime(10)).toBe('instantly')
    expect(crackTime(40)).toBe('54 seconds')
    expect(crackTime(60)).toBe('1 year')
    expect(crackTime(200)).toBe('millions of centuries+')
  })
})
