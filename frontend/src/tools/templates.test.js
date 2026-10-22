import { describe, expect, it } from 'vitest'
import { TEMPLATES, TEMPLATE_CATEGORIES, filterTemplates } from './templates.js'

describe('templates', () => {
  it('every template is complete and in a known category', () => {
    for (const t of TEMPLATES) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/)
      expect(t.name.length).toBeGreaterThan(3)
      expect(t.description.length).toBeGreaterThan(10)
      expect(t.code.length).toBeGreaterThan(50)
      expect(TEMPLATE_CATEGORIES).toContain(t.category)
    }
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
  })

  it('filters by category', () => {
    const python = filterTemplates('Python')
    expect(python.length).toBeGreaterThan(0)
    expect(python.every((t) => t.category === 'Python')).toBe(true)
    expect(filterTemplates('All').length).toBe(TEMPLATES.length)
  })

  it('filters by search text across name, description and language', () => {
    expect(filterTemplates('All', 'retry').some((t) => t.id === 'fetch-retry')).toBe(true)
    expect(filterTemplates('All', 'PYTHON').length).toBeGreaterThan(0)
    expect(filterTemplates('All', 'zzz-no-match')).toEqual([])
    expect(filterTemplates('Python', 'server')).toEqual([]) // category and query combine
  })
})
