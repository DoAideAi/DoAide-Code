import { describe, expect, it } from 'vitest'
import { b64urlDecode, decodeJwt, describeClaims, expiryStatus, relTime } from './jwtTool.js'

// A real-shaped token: {"alg":"HS256","typ":"JWT"} . {"sub":"1234567890","name":"John Doe","iat":1516239022}
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

function makeToken(payload) {
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`
}

describe('b64urlDecode', () => {
  it('decodes url-safe base64 without padding', () => {
    expect(b64urlDecode('aGVsbG8')).toBe('hello')
  })
  it('returns null on garbage', () => {
    expect(b64urlDecode('!!!')).toBeNull()
  })
})

describe('decodeJwt', () => {
  it('decodes header, payload and signature', () => {
    const out = decodeJwt(SAMPLE)
    expect(out.header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(out.payload.name).toBe('John Doe')
    expect(out.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
  })

  it('ignores a leading Bearer prefix and whitespace', () => {
    expect(decodeJwt(`  Bearer ${SAMPLE} `).payload.sub).toBe('1234567890')
  })

  it('explains a wrong part count', () => {
    expect(decodeJwt('a.b').error).toMatch(/three dot-separated parts.*this has 2/)
  })

  it('explains undecodable and non-JSON parts', () => {
    expect(decodeJwt('!!.e30.x').error).toMatch(/header is not valid base64url/)
    expect(decodeJwt('aGk.e30.x').error).toMatch(/header decodes.*not valid JSON/)
  })
})

describe('expiryStatus', () => {
  const now = 1_700_000_000_000
  it('reports an expired token', () => {
    const s = expiryStatus({ exp: now / 1000 - 7200 }, now)
    expect(s.state).toBe('expired')
    expect(s.message).toContain('2 hours ago')
  })
  it('reports a still-valid token with time left', () => {
    const s = expiryStatus({ exp: now / 1000 + 86_400 }, now)
    expect(s.state).toBe('valid')
    expect(s.message).toContain('in 1 day')
  })
  it('reports nbf in the future', () => {
    expect(expiryStatus({ nbf: now / 1000 + 600 }, now).state).toBe('not-yet')
  })
  it('reports a missing exp', () => {
    expect(expiryStatus({}, now).state).toBe('no-exp')
  })
})

describe('describeClaims', () => {
  it('labels registered claims and formats time claims', () => {
    const now = 1_700_000_000_000
    const claims = describeClaims({ iss: 'auth.example.com', iat: now / 1000 - 60, custom: 'x' }, now)
    expect(claims.map((c) => c.name)).toEqual(['iss', 'iat'])
    expect(claims[0].label).toBe('Issuer')
    expect(claims[1].value).toContain('1 minute ago')
  })
  it('joins an audience array', () => {
    expect(describeClaims({ aud: ['a', 'b'] })[0].value).toBe('a, b')
  })
})

describe('relTime', () => {
  it('formats both directions', () => {
    expect(relTime(1000 * 90, 0)).toBe('in 2 minutes')
    expect(relTime(0, 1000 * 45)).toBe('45 seconds ago')
  })
})

describe('decodeJwt round trip', () => {
  it('decodes a token built here', () => {
    const out = decodeJwt(makeToken({ sub: 'u1', exp: 1_700_000_000 }))
    expect(out.payload).toEqual({ sub: 'u1', exp: 1_700_000_000 })
  })
})
