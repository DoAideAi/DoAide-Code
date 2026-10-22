import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOOLS, applyMeta, readShared, runTool, shareLink, toolForPath, whatsappUrl } from './codeTools.js'

afterEach(() => vi.unstubAllGlobals())

describe('code tools', () => {
  it('finds the tool for a path, the first by default', () => {
    expect(toolForPath('/tools/find-bugs').action).toBe('bugs')
    expect(toolForPath('/tools/code-review/').action).toBe('review')
    expect(toolForPath('/tools')).toBe(TOOLS[0])
    expect(toolForPath('/tools/nope')).toBe(TOOLS[0])
  })

  it('round-trips code (unicode included) through a share link fragment', () => {
    const code = 'const s = "héllo ✓"\n// ```fence```'
    const link = shareLink(TOOLS[1], code, 'JavaScript')
    expect(link.startsWith('https://code.doaide.com/tools/code-review#code=')).toBe(true)
    expect(readShared(link.slice(link.indexOf('#')))).toEqual({ code, language: 'JavaScript' })
    expect(shareLink(TOOLS[0], 'x'.repeat(5000))).toBe('https://code.doaide.com/tools/explain-code')
    expect(readShared('')).toBeNull()
    expect(readShared('#code=%%%')).toBeNull()
  })

  it('builds a WhatsApp message with a preview and the link', () => {
    const url = new URL(whatsappUrl(TOOLS[0], 'print(1)\n', 'Python'))
    expect(url.origin).toBe('https://wa.me')
    const text = url.searchParams.get('text')
    expect(text).toContain('Python code')
    expect(text).toContain('print(1)')
    expect(text).toContain('https://code.doaide.com/tools/explain-code#code=')
  })

  it('posts to the public endpoint and surfaces its error', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ answer: 'It prints.' }) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ detail: 'Slow down.' }) })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    expect(await runTool('explain', 'print(1)', 'Auto-detect')).toBe('It prints.')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: 'explain', code: 'print(1)', language: '' })
    await expect(runTool('explain', 'x')).rejects.toThrow('Slow down.')
    await expect(runTool('explain', 'x')).rejects.toThrow(/reach DoAide/)
  })

  it('sets the page title, description and canonical URL', () => {
    document.head.innerHTML = '<meta name="description" content=""><link rel="canonical" href="">'
    applyMeta(TOOLS[2])
    expect(document.title).toMatch(/^Find Bugs in Code/)
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://code.doaide.com/tools/find-bugs')
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe(TOOLS[2].description)
  })
})
