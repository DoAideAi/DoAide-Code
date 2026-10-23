import { afterEach, describe, expect, it, vi } from 'vitest'
import { STARTER, createMock, curlFor, duplicateOf, endpointProblem, fetchMock, jsonWarning, samplePath } from './mockApiTool.js'

afterEach(() => vi.unstubAllGlobals())

const ep = (patch) => ({ method: 'GET', path: '/a', status: 200, delay_ms: 0, content_type: 'application/json', body: '{}', ...patch })
const ok = (body, status = 200) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })

describe('mock endpoint checks', () => {
  it('accepts the starter endpoints', () => {
    for (const e of STARTER) expect(endpointProblem(e)).toBeNull()
  })

  it('names bad paths, statuses and delays', () => {
    expect(endpointProblem(ep({ path: '/a b' }))).toContain('Paths')
    expect(endpointProblem(ep({ status: '99' }))).toContain('Status')
    expect(endpointProblem(ep({ delay_ms: 6000 }))).toContain('Delay')
  })

  it('warns on JSON bodies that do not parse, ignoring {{params}}', () => {
    expect(jsonWarning(ep({ body: '{"id": {{id}}}' }))).toBeNull()
    expect(jsonWarning(ep({ body: '{oops' }))).toContain('valid JSON')
    expect(jsonWarning(ep({ body: '{oops', content_type: 'text/plain' }))).toBeNull()
  })

  it('finds duplicates regardless of slashes', () => {
    const eps = [ep({ path: '/users/' }), ep({ path: 'users' }), ep({ method: 'POST', path: '/users' })]
    expect(duplicateOf(eps, 1)).toBe(0)
    expect(duplicateOf(eps, 2)).toBe(-1)
  })
})

describe('mock URLs and snippets', () => {
  it('fills :params with a sample value', () => {
    expect(samplePath('users/:id/posts/:postId')).toBe('/users/1/posts/1')
  })

  it('builds curl commands', () => {
    expect(curlFor('https://x/api/mock/abc', ep({ path: '/users/:id' }))).toBe('curl https://x/api/mock/abc/users/1')
    expect(curlFor('https://x/m', ep({ method: 'POST' }))).toContain("-X POST https://x/m/a -H 'Content-Type: application/json'")
  })
})

describe('mock API calls', () => {
  it('posts numeric status and delay', async () => {
    const fetch = ok({ id: 'abc12345', url: 'https://x/api/mock/abc12345' }, 201)
    vi.stubGlobal('fetch', fetch)
    await createMock('Demo', [ep({ status: '404', delay_ms: '100' })])
    const sent = JSON.parse(fetch.mock.calls[0][1].body)
    expect(sent.endpoints[0]).toMatchObject({ status: 404, delay_ms: 100 })
  })

  it('reports a missing mock', async () => {
    vi.stubGlobal('fetch', ok({}, 404))
    await expect(fetchMock('zzzzzzzz')).rejects.toThrow('No mock API')
    await expect(fetchMock('../x')).rejects.toThrow('No mock API')
  })
})
