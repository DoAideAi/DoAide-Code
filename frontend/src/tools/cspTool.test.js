import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { PRESETS, auditPolicy, buildPolicy, hashSource, makeNonce, parsePolicy, snippets } from './cspTool.js'

describe('buildPolicy', () => {
  it('writes directives in order with flags and the nonce', () => {
    const p = buildPolicy({ ...PRESETS.strict, reportUri: '/csp' }, { nonce: 'abc' })
    expect(p).toBe(
      "default-src 'self'; script-src 'nonce-abc' 'strict-dynamic'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp",
    )
  })
  it('drops meta-ignored directives for the meta tag', () => {
    const p = buildPolicy({ ...PRESETS.strict, reportUri: '/csp' }, { forMeta: true })
    expect(p).not.toMatch(/frame-ancestors|report-uri/)
  })
})

describe('parse and audit', () => {
  it('parses a header line', () => {
    const r = parsePolicy("Content-Security-Policy: default-src 'self'; Script-Src 'self' https://cdn.x; upgrade-insecure-requests; report-uri /r; foo bar")
    expect(r.policy).toEqual({ 'default-src': ["'self'"], 'script-src': ["'self'", 'https://cdn.x'] })
    expect(r.upgrade).toBe(true)
    expect(r.reportUri).toBe('/r')
    expect(r.other).toEqual([['foo', ['bar']]])
  })
  it('flags unsafe-inline, eval, wildcards and missing directives', () => {
    const texts = auditPolicy(parsePolicy("script-src 'self' 'unsafe-inline' 'unsafe-eval' *; img-src http://x")).map((f) => f.text)
    expect(texts.some((t) => t.includes("'unsafe-inline'"))).toBe(true)
    expect(texts.some((t) => t.includes("'unsafe-eval'"))).toBe(true)
    expect(texts.some((t) => t.includes('wildcard'))).toBe(true)
    expect(texts.some((t) => t.includes('plain http:'))).toBe(true)
    expect(texts.some((t) => t.includes('object-src'))).toBe(true)
    expect(texts.some((t) => t.includes('frame-ancestors'))).toBe(true)
  })
  it('accepts unsafe-inline next to a nonce and passes the strict preset', () => {
    const strict = auditPolicy({ ...PRESETS.strict, policy: { ...PRESETS.strict.policy, 'script-src': ["'nonce-x'", "'unsafe-inline'"] } })
    expect(strict.filter((f) => f.level === 'high')).toEqual([])
  })
})

describe('nonce, hash and snippets', () => {
  it('makes base64 nonces and sha256 sources', async () => {
    expect(makeNonce(webcrypto)).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(await hashSource("alert('hi')", webcrypto.subtle)).toBe("'sha256-XTqNqFSUlZHAW7f/OGNYSOEzxKhjdAAGMXoid2VEbJk='")
    await expect(hashSource('x', null)).rejects.toThrow(/secure context/)
  })
  it('escapes for each config format', () => {
    const s = Object.fromEntries(snippets("default-src 'self'", { reportOnly: true }))
    expect(s.Header).toBe("Content-Security-Policy-Report-Only: default-src 'self'")
    expect(s.nginx).toBe(`add_header Content-Security-Policy-Report-Only "default-src 'self'" always;`)
    expect(s.Express).toContain("'default-src \\'self\\''")
  })
})
