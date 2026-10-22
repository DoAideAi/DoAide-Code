import { describe, expect, it } from 'vitest'
import { TOOLS } from './codeTools.js'
import { UTIL_TOOLS, slugForPath, utilForPath } from './utilTools.js'

describe('utilTools', () => {
  it('reads the slug out of a /tools path', () => {
    expect(slugForPath('/tools/diff-checker')).toBe('diff-checker')
    expect(slugForPath('/tools/diff-checker/')).toBe('diff-checker')
    expect(slugForPath('/tools')).toBe('')
  })

  it('finds a utility by path, and leaves AI tools alone', () => {
    expect(utilForPath('/tools/diff-checker').title).toBe('Code Diff Checker')
    expect(utilForPath('/tools/explain-code')).toBeNull()
    expect(utilForPath('/tools')).toBeNull()
  })

  it('never reuses an AI tool slug', () => {
    const ai = new Set(TOOLS.map((t) => t.slug))
    for (const t of UTIL_TOOLS) expect(ai.has(t.slug)).toBe(false)
  })

  it('gives every utility the fields the pages and meta tags need', () => {
    for (const t of UTIL_TOOLS) {
      expect(t.slug).toMatch(/^[a-z-]+$/)
      expect(t.title).toBeTruthy()
      expect(t.heading).toBeTruthy()
      expect(t.description).toMatch(/no sign-up/)
    }
  })
})
