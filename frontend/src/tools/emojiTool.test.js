import { describe, expect, it } from 'vitest'
import { EMOJIS, GROUP_NAMES, emojiFormats, filterEmojis } from './emojiTool.js'

describe('EMOJIS', () => {
  it('is a substantial, well-formed set', () => {
    expect(EMOJIS.length).toBeGreaterThan(180)
    const seen = new Set()
    for (const [emoji, name, kw, group] of EMOJIS) {
      expect(emoji.length).toBeGreaterThan(0)
      expect(name.length).toBeGreaterThan(1)
      expect(kw.length).toBeGreaterThan(1)
      expect(GROUP_NAMES).toContain(group)
      expect(seen.has(emoji), `duplicate ${emoji}`).toBe(false)
      seen.add(emoji)
    }
  })
})

describe('filterEmojis', () => {
  it('finds by name and by keyword', () => {
    expect(filterEmojis('rocket')[0][0]).toBe('🚀')
    expect(filterEmojis('lgtm')[0][0]).toBe('👍')
    expect(filterEmojis('docker')[0][0]).toBe('🐳')
  })
  it('filters by group and combines with a query', () => {
    const faces = filterEmojis('', 'Faces & reactions')
    expect(faces.length).toBeGreaterThan(10)
    expect(faces.every(([, , , g]) => g === 'Faces & reactions')).toBe(true)
    expect(filterEmojis('rocket', 'Faces & reactions')).toHaveLength(0)
  })
  it('returns everything for an empty query', () => {
    expect(filterEmojis('')).toHaveLength(EMOJIS.length)
  })
})

describe('emojiFormats', () => {
  it('encodes a simple emoji', () => {
    expect(emojiFormats('🚀')).toEqual({
      char: '🚀',
      unicode: 'U+1F680',
      html: '&#x1F680;',
      js: '\\u{1F680}',
      css: '\\1F680',
    })
  })
  it('handles multi-codepoint sequences', () => {
    const f = emojiFormats('⚠️')
    expect(f.unicode).toBe('U+26A0 U+FE0F')
    expect(f.html).toBe('&#x26A0;&#xFE0F;')
  })
})
