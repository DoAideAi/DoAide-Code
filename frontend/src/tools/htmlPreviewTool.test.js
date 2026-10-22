import { describe, expect, it } from 'vitest'
import { SAMPLE_CSS, SAMPLE_HTML, SAMPLE_JS, buildDoc } from './htmlPreviewTool.js'

describe('buildDoc', () => {
  it('assembles HTML, CSS and JS into one document', () => {
    const doc = buildDoc('<p>hi</p>', 'p { color: red }', 'console.log(1)')
    expect(doc).toContain('<p>hi</p>')
    expect(doc).toContain('<style>p { color: red }</style>')
    expect(doc).toContain('console.log(1)')
    expect(doc).toContain('window.onerror')
  })

  it('defuses closing tags typed inside the panes', () => {
    const doc = buildDoc('', '</style><script>evil()</script>', 'var s = "</script>"')
    expect(doc).toContain('<\\/style><script>evil()</script></style>')
    expect(doc).toContain('"<\\/script>"')
  })

  it('ships working samples', () => {
    const doc = buildDoc(SAMPLE_HTML, SAMPLE_CSS, SAMPLE_JS)
    expect(doc).toContain('Click me')
  })
})
