import { describe, expect, it } from 'vitest'
import { fromBase64Url } from './codeTools.js'
import { EMBED_ACTIONS, MAX_EMBED_CODE, embedHeight, embedSnippet, embedUrl } from './embedTool.js'

describe('embedTool', () => {
  it('builds an /embed URL whose fragment round-trips the code', () => {
    const url = embedUrl('const x = 1\n// héllo', 'JavaScript', 'code-review')
    expect(url).toMatch(/^https:\/\/code\.doaide\.com\/embed#code=/)
    const params = new URLSearchParams(url.split('#')[1])
    expect(fromBase64Url(params.get('code'))).toBe('const x = 1\n// héllo')
    expect(params.get('lang')).toBe('JavaScript')
    expect(params.get('tool')).toBe('code-review')
  })

  it('leaves the language out when auto-detected', () => {
    expect(embedUrl('x', '', 'explain-code')).not.toContain('lang=')
  })

  it('sizes the iframe to the code, within bounds', () => {
    expect(embedHeight('one line')).toBe(180)
    expect(embedHeight(Array(100).fill('line').join('\n'))).toBe(520)
    const mid = embedHeight(Array(10).fill('line').join('\n'))
    expect(mid).toBeGreaterThan(180)
    expect(mid).toBeLessThan(520)
  })

  it('produces a self-contained iframe snippet', () => {
    const snippet = embedSnippet('print("hi")', 'Python', 'explain-code')
    expect(snippet).toMatch(/^<iframe src="https:\/\/code\.doaide\.com\/embed#code=/)
    expect(snippet).toContain('loading="lazy"')
    expect(snippet).toContain('</iframe>')
    expect(snippet).toMatch(/height:\d+px/)
  })

  it('points its button targets at real AI tools', () => {
    expect(EMBED_ACTIONS.length).toBeGreaterThan(5)
    for (const t of EMBED_ACTIONS) expect(t.slug).toMatch(/^[a-z-]+$/)
    expect(MAX_EMBED_CODE).toBeGreaterThan(0)
  })
})
