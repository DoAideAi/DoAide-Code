import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSnippet, fetchSnippet, snippetIdForPath } from './snippetShare.js'

afterEach(() => vi.unstubAllGlobals())

const ok = (body, status = 200) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })

describe('snippetIdForPath', () => {
  it('finds the id in /s/ paths and nothing else', () => {
    expect(snippetIdForPath('/s/aB3xY9kQ')).toBe('aB3xY9kQ')
    expect(snippetIdForPath('/s/abc123')).toBe('abc123')
    expect(snippetIdForPath('/s/')).toBeNull()
    expect(snippetIdForPath('/s/has-dash')).toBeNull()
    expect(snippetIdForPath('/s/way-too-long-for-an-id')).toBeNull()
    expect(snippetIdForPath('/tools/share-code')).toBeNull()
  })
})

describe('createSnippet', () => {
  it('posts the code and returns the link', async () => {
    const fetch = ok({ id: 'abc12345', url: 'https://code.doaide.com/s/abc12345' }, 201)
    vi.stubGlobal('fetch', fetch)
    const result = await createSnippet('x = 1', 'Python', 'Tiny')
    expect(result.url).toContain('/s/abc12345')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ code: 'x = 1', language: 'Python', title: 'Tiny' })
  })

  it('surfaces the server message on failure', async () => {
    vi.stubGlobal('fetch', ok({ detail: 'Paste some code first.' }, 400))
    await expect(createSnippet('')).rejects.toThrow('Paste some code first.')
  })
})

describe('fetchSnippet', () => {
  it('returns the stored snippet', async () => {
    vi.stubGlobal('fetch', ok({ id: 'abc12345', code: 'x = 1', language: 'python', title: '', views: 3 }))
    expect((await fetchSnippet('abc12345')).code).toBe('x = 1')
  })

  it('says so when the link is dead', async () => {
    vi.stubGlobal('fetch', ok({}, 404))
    await expect(fetchSnippet('zzzzzzzz')).rejects.toThrow('No snippet lives at this link.')
  })
})
