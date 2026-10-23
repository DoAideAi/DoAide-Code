import { describe, expect, it } from 'vitest'
import { CATEGORIES, STATUS_CODES, categoryOf, filterCodes } from './httpStatusTool.js'

describe('STATUS_CODES', () => {
  it('covers the essential codes, sorted and unique', () => {
    const codes = STATUS_CODES.map(([c]) => c)
    for (const c of [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]) {
      expect(codes).toContain(c)
    }
    expect(codes).toEqual([...codes].sort((a, b) => a - b))
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every entry has four non-empty fields and a known category', () => {
    const cats = CATEGORIES.map(([d]) => d)
    for (const entry of STATUS_CODES) {
      expect(entry).toHaveLength(4)
      for (const field of entry.slice(1)) expect(String(field).length).toBeGreaterThan(1)
      expect(cats).toContain(categoryOf(entry[0]))
    }
  })
})

describe('filterCodes', () => {
  it('matches by number prefix', () => {
    expect(filterCodes('40').map(([c]) => c)).toContain(404)
    expect(filterCodes('404')[0][0]).toBe(404)
    expect(filterCodes('418')).toHaveLength(1)
  })

  it('matches by name and description text', () => {
    expect(filterCodes('teapot').map(([c]) => c)).toEqual([418])
    expect(filterCodes('rate limit').map(([c]) => c)).toContain(429)
  })

  it('filters by category', () => {
    const fives = filterCodes('', '5')
    expect(fives.length).toBeGreaterThan(5)
    expect(fives.every(([c]) => c >= 500)).toBe(true)
  })

  it('combines query and category', () => {
    expect(filterCodes('timeout', '5').map(([c]) => c)).toEqual([504])
  })

  it('returns everything for an empty query', () => {
    expect(filterCodes('')).toHaveLength(STATUS_CODES.length)
  })
})
