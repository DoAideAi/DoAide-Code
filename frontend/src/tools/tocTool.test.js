import { describe, expect, it } from 'vitest'
import { buildToc, extractHeadings, githubSlug, insertToc } from './tocTool.js'

const DOC = `---
title: not a heading
---
# My Project

Intro text.

## Getting Started

### Install \`npm\` package

\`\`\`bash
# not a heading
\`\`\`

## API & [Links](https://x.y)
Usage
-----

## Getting Started
`

describe('extractHeadings', () => {
  it('finds ATX and setext headings outside code and front matter', () => {
    const hs = extractHeadings(DOC)
    expect(hs.map((h) => [h.level, h.text])).toEqual([
      [1, 'My Project'],
      [2, 'Getting Started'],
      [3, 'Install npm package'],
      [2, 'API & Links'],
      [2, 'Usage'],
      [2, 'Getting Started'],
    ])
    expect(hs.map((h) => h.slug)).toEqual(['my-project', 'getting-started', 'install-npm-package', 'api--links', 'usage', 'getting-started-1'])
  })
})

describe('githubSlug', () => {
  it('matches GitHub anchors', () => {
    expect(githubSlug('What’s new in v2.0?')).toBe('whats-new-in-v20')
    expect(githubSlug('**Bold** and _snake_case_')).toBe('bold-and-snake_case')
    expect(githubSlug('Café Ünïcode')).toBe('café-ünïcode')
  })
})

describe('buildToc', () => {
  it('nests H2/H3 by default', () => {
    expect(buildToc(extractHeadings(DOC)).split('\n').slice(0, 3)).toEqual([
      '- [Getting Started](#getting-started)',
      '  - [Install npm package](#install-npm-package)',
      '- [API & Links](#api--links)',
    ])
  })

  it('numbers ordered lists per level', () => {
    const toc = buildToc(extractHeadings(DOC), { minLevel: 1, ordered: true, links: false })
    expect(toc.split('\n').slice(0, 4)).toEqual(['1. My Project', '   1. Getting Started', '      1. Install npm package', '   2. API & Links'])
  })
})

describe('insertToc', () => {
  it('goes after the H1, then replaces itself', () => {
    const once = insertToc('# Title\n\n## A\n', '- [A](#a)')
    expect(once).toBe('# Title\n\n<!-- toc -->\n\n- [A](#a)\n\n<!-- tocstop -->\n\n## A\n')
    expect(insertToc(once, '- [B](#b)')).toContain('<!-- toc -->\n\n- [B](#b)\n\n<!-- tocstop -->\n\n## A')
    expect(extractHeadings(once).map((h) => h.text)).toEqual(['Title', 'A'])
  })
})
