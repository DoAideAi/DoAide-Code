import { describe, expect, it } from 'vitest'
import { decodeUrl, encodeUrl } from './urlTool.js'

describe('encodeUrl', () => {
  it('component mode encodes reserved characters', () => {
    expect(encodeUrl('a&b=c d?')).toBe('a%26b%3Dc%20d%3F')
  })
  it('url mode keeps URL structure', () => {
    expect(encodeUrl('https://x.com/a b?q=1&r=2', 'url')).toBe('https://x.com/a%20b?q=1&r=2')
  })
  it('handles UTF-8', () => {
    expect(encodeUrl('café')).toBe('caf%C3%A9')
  })
})

describe('decodeUrl', () => {
  it('decodes percent sequences and + as space', () => {
    expect(decodeUrl('caf%C3%A9+au%20lait').out).toBe('café au lait')
  })
  it('explains a stray percent sign', () => {
    expect(decodeUrl('100% sure').error).toMatch(/%.*not followed by two hex digits/)
  })
})
