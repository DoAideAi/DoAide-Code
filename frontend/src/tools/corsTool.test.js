import { describe, expect, it } from 'vitest'
import { checkCors, corsConfigs, parseHeaders, preflightReasons } from './corsTool.js'

const base = { origin: 'https://app.example.com', url: 'https://api.example.com/users' }
const fails = (r) => r.steps.filter((s) => !s.ok).map((s) => s.text)

describe('parseHeaders', () => {
  it('reads a status line, lowercases names and joins repeats', () => {
    const { status, headers } = parseHeaders('HTTP/2 204\nVary: Origin\nvary: Accept\nX-A:1')
    expect(status).toBe(204)
    expect(headers.get('vary')).toBe('Origin, Accept')
    expect(headers.get('x-a')).toBe('1')
  })
})

describe('preflightReasons', () => {
  const h = (t) => parseHeaders(t).headers
  it('treats safelisted requests as simple', () => {
    expect(preflightReasons('GET', h('Accept: */*'))).toEqual([])
    expect(preflightReasons('POST', h('Content-Type: text/plain;charset=utf-8\nCookie: a=1'))).toEqual([])
  })
  it('explains what triggers a preflight', () => {
    expect(preflightReasons('PUT', h(''))).toEqual(['the method PUT is not GET, HEAD or POST'])
    expect(preflightReasons('POST', h('Content-Type: application/json\nAuthorization: Bearer x'))).toHaveLength(2)
  })
})

describe('checkCors', () => {
  it('short-circuits same origin', () => {
    expect(checkCors({ ...base, url: 'https://app.example.com/x' }).crossOrigin).toBe(false)
  })
  it('blocks a missing header and allows a matching one', () => {
    expect(fails(checkCors({ ...base, responseText: '' }))[0]).toMatch(/no Access-Control-Allow-Origin/)
    const ok = checkCors({ ...base, responseText: 'Access-Control-Allow-Origin: https://app.example.com' })
    expect(ok.allowed).toBe(true)
    expect(ok.notes.join(' ')).toMatch(/Vary: Origin/)
  })
  it('rejects * and missing Allow-Credentials with credentials', () => {
    const r = checkCors({ ...base, credentials: true, responseText: 'Access-Control-Allow-Origin: *' })
    expect(fails(r).join(' ')).toMatch(/wildcard/)
    expect(fails(r).join(' ')).toMatch(/Allow-Credentials/)
  })
  it('checks preflight methods and headers, Authorization never covered by *', () => {
    const r = checkCors({
      ...base,
      method: 'DELETE',
      requestHeaders: 'Authorization: Bearer t\nX-Trace: 1',
      preflightText: 'HTTP/1.1 204\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: GET, POST\nAccess-Control-Allow-Headers: *',
      responseText: 'Access-Control-Allow-Origin: *',
    })
    expect(r.preflight).toHaveLength(3)
    const f = fails(r)
    expect(f.some((t) => t.includes('DELETE'))).toBe(true)
    expect(f.some((t) => t.includes('authorization') && t.includes('never covers'))).toBe(true)
    expect(f.some((t) => t.includes('x-trace'))).toBe(false)
  })
  it('fails a non-2xx preflight and flags unexposed headers', () => {
    expect(fails(checkCors({ ...base, method: 'PUT', preflightText: 'HTTP/1.1 404', responseText: 'Access-Control-Allow-Origin: *' }))[0]).toMatch(/status 404/)
    const r = checkCors({ ...base, responseText: 'Access-Control-Allow-Origin: *\nX-Total-Count: 9\nContent-Type: application/json' })
    expect(r.notes.join(' ')).toMatch(/x-total-count/)
  })
  it('reports bad URLs', () => {
    expect(checkCors({ origin: 'nope', url: '' }).error).toBeTruthy()
  })
})

describe('corsConfigs', () => {
  it('writes a config per server', () => {
    const c = Object.fromEntries(corsConfigs({ origins: ['https://a.com'], methods: ['GET', 'POST'], headers: ['Content-Type'], credentials: true, maxAge: 600 }))
    expect(Object.keys(c)).toEqual(['nginx', 'Express', 'FastAPI', 'Apache'])
    expect(c.nginx).toContain('"https://a.com" $http_origin;')
    expect(c.nginx).toContain('add_header Access-Control-Allow-Credentials true always;')
    expect(c.Express).toContain("origin: ['https://a.com']")
    expect(c.FastAPI).toContain('allow_credentials=True')
    expect(c.Apache).toContain('^(https://a\\.com)$')
    expect(corsConfigs({ origins: ['*'], methods: ['GET'], headers: [] })[0][1]).toContain('Access-Control-Allow-Origin * always')
  })
})
