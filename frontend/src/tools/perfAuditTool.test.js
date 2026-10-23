import { describe, expect, it } from 'vitest'
import { SERVER_CHECKLIST, auditHtml } from './perfAuditTool.js'

const GOOD = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>t</title><script src="/app.js" defer></script></head>
<body><img src="/a.png" width="100" height="50" alt=""></body></html>`

const BAD = `<html><head><script src="https://cdn.example.com/lib.js"></script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
<style>@import url('x.css');</style></head>
<body onload="document.write('x')">
<img src="/1.png"><img src="/2.png"><img src="/3.png"><img src="/4.png">
<iframe src="https://www.youtube.com/embed/x"></iframe>
</body></html>`

describe('auditHtml', () => {
  it('passes a clean page with a high score', () => {
    const { findings, passed, score } = auditHtml(GOOD)
    expect(findings).toHaveLength(0)
    expect(score).toBe(100)
    expect(passed).toContain('Viewport meta tag present')
    expect(passed).toContain('All images have width and height')
  })

  it('catches the classic problems, worst first', () => {
    const { findings, score } = auditHtml(BAD)
    const titles = findings.map((f) => f.title)
    expect(titles.join(' ')).toMatch(/render-blocking script/)
    expect(titles.join(' ')).toMatch(/viewport/i)
    expect(titles.join(' ')).toMatch(/document\.write/)
    expect(titles.join(' ')).toMatch(/missing width\/height/)
    expect(titles.join(' ')).toMatch(/load eagerly/)
    expect(titles.join(' ')).toMatch(/@import/)
    expect(titles.join(' ')).toMatch(/iframe/)
    expect(titles.join(' ')).toMatch(/display=swap/)
    expect(titles.join(' ')).toMatch(/preconnect/)
    const sev = findings.map((f) => f.severity)
    expect(sev.indexOf('low')).toBeGreaterThan(sev.lastIndexOf('high'))
    expect(score).toBeLessThan(50)
  })

  it('skips checks that do not apply', () => {
    const { findings, passed } = auditHtml('<html><head><meta charset="utf-8"><meta name="viewport" content="x"></head><body><p>hi</p></body></html>')
    expect(findings).toHaveLength(0)
    expect(passed).not.toContain('All images have width and height')
    expect(passed).not.toContain('Iframes are lazy')
  })

  it('reports stats', () => {
    const { stats } = auditHtml(GOOD)
    expect(stats.images).toBe(1)
    expect(stats.scripts).toBe(1)
    expect(stats.elements).toBeGreaterThan(5)
  })

  it('rejects empty and non-HTML input readably', () => {
    expect(() => auditHtml('')).toThrow(/paste a page/i)
    expect(() => auditHtml('just words, no markup')).toThrow(/does not look like html/i)
  })
})

describe('SERVER_CHECKLIST', () => {
  it('has titled, explained entries', () => {
    expect(SERVER_CHECKLIST.length).toBeGreaterThan(4)
    for (const [title, detail] of SERVER_CHECKLIST) {
      expect(title.length).toBeGreaterThan(5)
      expect(detail.length).toBeGreaterThan(20)
    }
  })
})
