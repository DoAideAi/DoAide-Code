import { beforeEach, describe, expect, it } from 'vitest'
import { clearSnippets, rememberSnippet, savedSnippets, snippetLabel } from './snippets.js'

beforeEach(() => localStorage.clear())

describe('snippets', () => {
  it('remembers newest first, per scope', () => {
    rememberSnippet('ai', 'first', 'Python')
    rememberSnippet('ai', 'second')
    rememberSnippet('code-formatter', 'other')
    expect(savedSnippets('ai').map((s) => s.code)).toEqual(['second', 'first'])
    expect(savedSnippets('code-formatter')).toHaveLength(1)
  })

  it('deduplicates by content, moving a repeat to the front', () => {
    rememberSnippet('ai', 'a')
    rememberSnippet('ai', 'b')
    rememberSnippet('ai', 'a')
    expect(savedSnippets('ai').map((s) => s.code)).toEqual(['a', 'b'])
  })

  it('keeps at most ten per scope', () => {
    for (let i = 0; i < 14; i++) rememberSnippet('ai', `code ${i}`)
    const saved = savedSnippets('ai')
    expect(saved).toHaveLength(10)
    expect(saved[0].code).toBe('code 13')
  })

  it('ignores blank snippets and clears one scope only', () => {
    rememberSnippet('ai', '   ')
    rememberSnippet('ai', 'keep')
    rememberSnippet('regex-tester', 'pat')
    clearSnippets('ai')
    expect(savedSnippets('ai')).toEqual([])
    expect(savedSnippets('regex-tester')).toHaveLength(1)
  })

  it('survives garbage in storage', () => {
    localStorage.setItem('doaide-tool-snippets', '{broken')
    expect(savedSnippets('ai')).toEqual([])
    rememberSnippet('ai', 'fresh')
    expect(savedSnippets('ai')).toHaveLength(1)
  })

  it('labels a snippet with age, language and first line', () => {
    const now = Date.now()
    rememberSnippet('ai', 'def f():\n  pass', 'Python', now - 5 * 60_000)
    expect(snippetLabel(savedSnippets('ai')[0], now)).toBe('5m ago · Python · def f():')
  })
})
