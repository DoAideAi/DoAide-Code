import { describe, expect, it } from 'vitest'
import { normalizeLine, textDiff, textStats, toPatch, tokenize, withWordDiffs, wordDiff } from './textDiffTool.js'

describe('normalizeLine', () => {
  it('folds case and collapses whitespace on request', () => {
    expect(normalizeLine('  Hello   World ', { ignoreCase: true, ignoreWhitespace: true })).toBe('hello world')
    expect(normalizeLine('  A ')).toBe('  A ')
  })
})

describe('textDiff', () => {
  it('finds added and removed lines', () => {
    const rows = textDiff('one\ntwo\nthree', 'one\n2\nthree\nfour')
    expect(rows.map((r) => r.kind)).toEqual(['same', 'del', 'add', 'same', 'add'])
  })
  it('treats case/whitespace-only changes as same when ignored, keeping the new text', () => {
    const rows = textDiff('Hello  world', 'hello world', { ignoreCase: true, ignoreWhitespace: true })
    expect(rows).toEqual([{ kind: 'same', text: 'hello world', old: 1, new: 1 }])
  })
  it('drops blank lines when asked and handles CRLF', () => {
    expect(textDiff('a\r\n\r\nb', 'a\nb', { ignoreBlankLines: true }).every((r) => r.kind === 'same')).toBe(true)
  })
})

describe('wordDiff', () => {
  it('tokenizes words, spaces and punctuation', () => {
    expect(tokenize('Hi, you!')).toEqual(['Hi', ',', ' ', 'you', '!'])
  })
  it('marks only the changed words', () => {
    const d = wordDiff('the quick brown fox', 'the slow brown fox')
    expect(d.old.filter((s) => s.changed).map((s) => s.text)).toEqual(['quick'])
    expect(d.new.filter((s) => s.changed).map((s) => s.text)).toEqual(['slow'])
    expect(d.new.map((s) => s.text).join('')).toBe('the slow brown fox')
  })
})

describe('withWordDiffs', () => {
  it('pairs deleted and added lines within a block', () => {
    const rows = withWordDiffs(textDiff('a b\nkeep', 'a c\nkeep'))
    expect(rows[0].segs).toBeTruthy()
    expect(rows[1].segs).toBeTruthy()
    expect(rows[2].segs).toBeUndefined()
  })
  it('leaves unpaired additions whole', () => {
    const rows = withWordDiffs(textDiff('x', 'x\nnew line'))
    expect(rows[1].segs).toBeUndefined()
  })
})

describe('helpers', () => {
  it('counts words, characters and lines', () => {
    expect(textStats('Hello wide world\nbye')).toEqual({ chars: 20, words: 4, lines: 2 })
    expect(textStats('')).toEqual({ chars: 0, words: 0, lines: 0 })
  })
  it('writes a patch body', () => {
    expect(toPatch(textDiff('a\nb', 'a\nc'))).toBe(' a\n-b\n+c')
  })
})
