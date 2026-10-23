import { describe, expect, it } from 'vitest'
import { DESC_LIMIT, TITLE_LIMIT, buildMetaTags, lengthHint } from './metaTagTool.js'

describe('buildMetaTags', () => {
  it('emits title, description, canonical, OG and Twitter tags', () => {
    const out = buildMetaTags({
      title: 'My Page',
      description: 'What it does.',
      url: 'https://example.com/page',
      image: 'https://example.com/og.png',
      siteName: 'Example',
      twitterHandle: 'example',
    })
    expect(out).toContain('<title>My Page</title>')
    expect(out).toContain('<meta name="description" content="What it does.">')
    expect(out).toContain('<link rel="canonical" href="https://example.com/page">')
    expect(out).toContain('<meta property="og:image" content="https://example.com/og.png">')
    expect(out).toContain('<meta property="og:site_name" content="Example">')
    expect(out).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(out).toContain('<meta name="twitter:site" content="@example">')
  })

  it('keeps an existing @ on the handle and honors card/type choices', () => {
    const out = buildMetaTags({ title: 'T', twitterHandle: '@already', ogType: 'article', twitterCard: 'summary' })
    expect(out).toContain('content="@already"')
    expect(out).toContain('<meta property="og:type" content="article">')
    expect(out).toContain('<meta name="twitter:card" content="summary">')
  })

  it('escapes HTML in every field', () => {
    const out = buildMetaTags({ title: 'A "<b>" & more', description: 'x' })
    expect(out).toContain('A &quot;&lt;b&gt;&quot; &amp; more')
    expect(out).not.toContain('<b>')
  })

  it('omits tags for empty fields and returns nothing for no input', () => {
    expect(buildMetaTags({})).toBe('')
    const out = buildMetaTags({ title: 'Only title' })
    expect(out).not.toContain('description')
    expect(out).not.toContain('canonical')
    expect(out).not.toContain('og:image')
  })
})

describe('lengthHint', () => {
  it('reports empty, ok and over states', () => {
    expect(lengthHint('', TITLE_LIMIT).state).toBe('empty')
    expect(lengthHint('fine', TITLE_LIMIT).state).toBe('ok')
    expect(lengthHint('x'.repeat(DESC_LIMIT + 1), DESC_LIMIT).state).toBe('over')
  })
})
