import { describe, expect, it } from 'vitest'
import { TOOLS, faqJsonLd } from './codeTools.js'
import { TOOL_FAQS } from './toolFaqs.js'
import { UTIL_TOOLS } from './utilTools.js'

const ALL_SLUGS = [...TOOLS, ...UTIL_TOOLS].map((t) => t.slug)

describe('tool FAQs', () => {
  it('covers every tool, and names no tool that does not exist', () => {
    expect(Object.keys(TOOL_FAQS).sort()).toEqual([...ALL_SLUGS].sort())
  })

  it('gives each tool at least two non-empty question/answer pairs', () => {
    for (const [slug, faqs] of Object.entries(TOOL_FAQS)) {
      expect(faqs.length, slug).toBeGreaterThanOrEqual(2)
      for (const pair of faqs) {
        expect(pair, slug).toHaveLength(2)
        const [q, a] = pair
        expect(q, slug).toMatch(/\?$/)
        expect(a.length, slug).toBeGreaterThan(10)
      }
    }
  })

  it('builds a schema.org FAQPage from the pairs', () => {
    const data = faqJsonLd([['Is it free?', 'Yes.']])
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Is it free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes.' } }],
    })
  })
})
