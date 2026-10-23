import { describe, expect, it } from 'vitest'
import { checkTags, clip, metaTags, parseMeta, resolveCard } from './ogTool.js'

const HTML = `<html><head>
<title>Fallback title | Site</title>
<meta name="description" content="Plain description">
<meta property="og:title" content="The OG title">
<meta property="og:image" content="/img/card.png">
<meta property="og:url" content="https://www.example.com/post">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://example.com/canonical">
</head></html>`

describe('Open Graph parsing', () => {
  it('reads og, twitter and fallback tags', () => {
    const tags = parseMeta(HTML)
    expect(tags['og:title']).toBe('The OG title')
    expect(tags.title).toBe('Fallback title | Site')
    expect(tags.canonical).toBe('https://example.com/canonical')
    const card = resolveCard(tags)
    expect(card).toMatchObject({ title: 'The OG title', description: 'Plain description', host: 'example.com', siteName: 'example.com', twitterCard: 'summary_large_image' })
  })

  it('flags missing and invalid tags', () => {
    const checks = checkTags(parseMeta(HTML))
    const errors = checks.filter((c) => c.level === 'error').map((c) => c.text)
    expect(errors.some((e) => e.startsWith('Missing og:description'))).toBe(true)
    expect(errors.some((e) => e.includes('absolute https://'))).toBe(true)
    expect(checks.some((c) => c.level === 'ok' && c.text === 'og:title is set')).toBe(true)
  })

  it('warns about long text and odd image ratios', () => {
    const checks = checkTags({ 'og:title': 'x'.repeat(70), 'og:image': 'https://a/b.png', 'og:image:width': '1000', 'og:image:height': '1000' })
    expect(checks.some((c) => c.text.startsWith('Title is 70'))).toBe(true)
    expect(checks.some((c) => c.text.includes('1.00:1'))).toBe(true)
  })

  it('clips and writes meta tags', () => {
    expect(clip('abcdef', 4)).toBe('abc…')
    expect(metaTags({ title: 'A "quoted" title', url: 'https://x.y' })).toBe(
      '<meta property="og:type" content="website">\n<meta property="og:url" content="https://x.y">\n<meta property="og:title" content="A &quot;quoted&quot; title">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="A &quot;quoted&quot; title">',
    )
  })
})
