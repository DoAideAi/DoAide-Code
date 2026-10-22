import { describe, expect, it } from 'vitest'
import { highlight } from './highlight.js'

const kinds = (code, lang) => highlight(code, lang).filter((t) => t.kind).map((t) => [t.kind, t.text])

describe('highlight', () => {
  it('covers the whole code, in order', () => {
    const code = 'def add(a, b):\n    return a + 1  # sum\n'
    expect(highlight(code, 'python').map((t) => t.text).join('')).toBe(code)
  })

  it('marks keywords, strings, numbers and comments', () => {
    expect(kinds('const x = "hi" // note\nreturn 0x1f + 2.5', 'js')).toEqual([
      ['keyword', 'const'],
      ['string', '"hi"'],
      ['comment', '// note'],
      ['keyword', 'return'],
      ['number', '0x1f'],
      ['number', '2.5'],
    ])
  })

  it('# is a comment in Python and shell, not in JavaScript', () => {
    expect(kinds('x = 1 # set', 'python')).toContainEqual(['comment', '# set'])
    expect(kinds('a.#private', 'js').some(([k]) => k === 'comment')).toBe(false)
  })

  it('an unclosed quote does not colour the rest of the line', () => {
    expect(kinds("fn f<'a>(x: &'a str)", 'rust').some(([k]) => k === 'string')).toBe(false)
  })

  it('diffs colour added and removed lines', () => {
    expect(kinds('--- a/x\n+++ b/x\n-old\n+new\n same', 'diff')).toEqual([
      ['removed', '-old\n'],
      ['added', '+new\n'],
    ])
  })
})
