import { describe, it, expect } from 'vitest'
import { allTools, renderToolPage, toolTitle } from './build-tool-pages.mjs'

const SHELL = `<!doctype html><html><head>
<title>DoAide Code: Claude and Codex from your laptop or phone</title>
<meta name="description" content="home" />
<link rel="canonical" href="https://code.doaide.com/" />
<meta property="og:title" content="home" />
<meta property="og:url" content="https://code.doaide.com/" />
<script type="application/ld+json">{"@type":"SoftwareApplication"}</script>
</head><body><div id="root"></div>
<noscript><h1>DoAide Code</h1><p>Enable JavaScript.</p></noscript></body></html>`

describe('build-tool-pages', () => {
  it('gives every tool a unique title', () => {
    const titles = allTools.map(toolTitle)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('rewrites title, canonical, description, og, JSON-LD and adds an h1', () => {
    const tool = allTools.find((t) => t.slug === 'flexbox-playground')
    const html = renderToolPage(SHELL, tool)
    expect(html).toContain('<title>CSS Flexbox Playground | DoAide Code</title>')
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).toContain('href="https://code.doaide.com/tools/flexbox-playground"')
    expect(html).not.toContain('content="home"')
    expect(html).toContain('<div id="root"><h1>Flexbox playground</h1></div>')
    expect(html.match(/<h1>/g)).toHaveLength(1)
    expect(html).toContain('"@type":"WebApplication"')
    expect(html).not.toContain('SoftwareApplication')
  })
})
