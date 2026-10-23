import { describe, expect, it } from 'vitest'
import { REFERENCE, decode, encode } from './htmlEntityTool.js'

describe('encode', () => {
  const s = '<a href="x">Café & “quotes” 😀</a>'
  it('minimal escapes only markup characters', () => {
    expect(encode(s, 'minimal')).toBe('&lt;a href=&quot;x&quot;&gt;Café &amp; “quotes” 😀&lt;/a&gt;')
  })
  it('named uses names, numeric fallback for the rest', () => {
    expect(encode(s, 'named')).toBe('&lt;a href=&quot;x&quot;&gt;Caf&eacute; &amp; &ldquo;quotes&rdquo; &#128512;&lt;/a&gt;')
  })
  it('numeric and hex encode by code point', () => {
    expect(encode('é<', 'numeric')).toBe('&#233;&#60;')
    expect(encode('é😀', 'hex')).toBe('&#xE9;&#x1F600;')
  })
  it('can escape ASCII punctuation too', () => {
    expect(encode('a-b c', 'numeric', { everything: true })).toBe('a&#45;b c')
  })
})

describe('decode', () => {
  it('decodes named, decimal and hex references', () => {
    expect(decode('&lt;p&gt; &copy; &#169; &#xA9; &#X1F600; &hellip;')).toBe('<p> © © © 😀 …')
  })
  it('falls back to the browser for rarer names', () => {
    expect(decode('&bigstar; &check;')).toBe('★ ✓')
  })
  it('leaves unknown or invalid references alone', () => {
    expect(decode('&notanentity; &#0; &#xD800; & alone')).toBe('&notanentity; &#0; &#xD800; & alone')
  })
  it('round-trips every encoding mode', () => {
    const s = '<div class="a">Ünïcödé — 5 × 3 ≠ 16 & 😀 \'x\'</div>'
    for (const mode of ['minimal', 'named', 'numeric', 'hex']) expect(decode(encode(s, mode)), mode).toBe(s)
  })
})

describe('REFERENCE', () => {
  it('lists unique names with code points', () => {
    expect(new Set(REFERENCE.map((r) => r[1])).size).toBe(REFERENCE.length)
    expect(REFERENCE.find((r) => r[1] === 'copy')[2]).toBe(169)
  })
})
