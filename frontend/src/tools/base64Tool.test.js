import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64 } from './base64Tool.js'

describe('encodeBase64', () => {
  it('encodes plain ASCII', () => {
    expect(encodeBase64('hello world')).toBe('aGVsbG8gd29ybGQ=')
  })
  it('handles UTF-8 (emoji and accents)', () => {
    expect(decodeBase64(encodeBase64('café 🚀')).out).toBe('café 🚀')
  })
  it('produces the URL-safe form without padding', () => {
    const out = encodeBase64('??>>', { urlSafe: true })
    expect(out).not.toMatch(/[+/=]/)
    expect(decodeBase64(out).out).toBe('??>>')
  })
})

describe('decodeBase64', () => {
  it('decodes standard Base64', () => {
    expect(decodeBase64('aGVsbG8=')).toEqual({ out: 'hello', binary: false })
  })
  it('forgives missing padding, URL-safe alphabet and whitespace', () => {
    expect(decodeBase64('aGVs\nbG8').out).toBe('hello')
    expect(decodeBase64('P8OpPz8_').out).toBe('?é???')
  })
  it('names the offending character', () => {
    expect(decodeBase64('abc$').error).toContain('"$"')
  })
  it('catches an impossible length', () => {
    expect(decodeBase64('aGVsbG8xx').error).toMatch(/off by one/)
  })
  it('shows binary data as a hex preview', () => {
    const res = decodeBase64(btoa('\x00\x01\x02\xff'))
    expect(res.binary).toBe(true)
    expect(res.out).toContain('00 01 02 ff')
  })
})
