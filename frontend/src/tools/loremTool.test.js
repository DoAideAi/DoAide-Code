import { describe, expect, it } from 'vitest'
import { LOREM_STYLES, MAX_LOREM_COUNT, generateLorem, loremHtml } from './loremTool.js'

describe('generateLorem', () => {
  it('gives exactly the asked number of words', () => {
    const out = generateLorem('classic', 'words', 7, () => 0)
    expect(out.split(' ')).toHaveLength(7)
    expect(out.startsWith('Lorem ipsum dolor')).toBe(true)
  })

  it('gives the asked number of sentences, capitalized and ended', () => {
    const out = generateLorem('tech', 'sentences', 3, () => 0)
    const sentences = out.match(/[^.]+\./g)
    expect(sentences).toHaveLength(3)
    for (const s of sentences) expect(s.trim()[0]).toMatch(/[A-Z]/)
  })

  it('separates paragraphs with blank lines', () => {
    const out = generateLorem('plain', 'paragraphs', 2, () => 0.5)
    expect(out.split('\n\n')).toHaveLength(2)
  })

  it('clamps silly counts', () => {
    expect(generateLorem('classic', 'words', 100000, () => 0).split(' ')).toHaveLength(MAX_LOREM_COUNT)
    expect(generateLorem('classic', 'words', -5, () => 0).split(' ')).toHaveLength(1)
  })

  it('offers three styles', () => {
    expect(LOREM_STYLES.map(([k]) => k)).toEqual(['classic', 'tech', 'plain'])
  })
})

describe('loremHtml', () => {
  it('wraps each paragraph in <p>', () => {
    expect(loremHtml('One.\n\nTwo.')).toBe('<p>One.</p>\n<p>Two.</p>')
  })
})
