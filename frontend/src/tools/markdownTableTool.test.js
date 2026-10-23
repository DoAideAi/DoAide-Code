import { describe, expect, it } from 'vitest'
import { DEFAULT_TABLE, escapeCell, parseTable, toMarkdown } from './markdownTableTool.js'

describe('toMarkdown', () => {
  it('pads columns and writes alignment dividers', () => {
    const md = toMarkdown(DEFAULT_TABLE)
    const lines = md.split('\n')
    expect(lines[0]).toBe('| Tool         | Purpose            | Free |')
    expect(lines[1]).toBe('| :----------- | ------------------ | :--: |')
    expect(lines[2]).toBe('| Formatter    | Pretty-print code  | Yes  |')
    expect(new Set(lines.map((l) => l.length)).size).toBe(1)
  })
  it('right-aligns and compacts', () => {
    const t = { header: ['n'], rows: [['12345']], aligns: ['right'] }
    expect(toMarkdown(t).split('\n')).toEqual(['|     n |', '| ----: |', '| 12345 |'])
    expect(toMarkdown(t, { compact: true })).toBe('| n |\n| --: |\n| 12345 |')
  })
  it('fills short rows', () => {
    expect(toMarkdown({ header: ['a', 'b'], rows: [['x']], aligns: ['none', 'none'] }, { compact: true })).toContain('| x |  |')
  })
})

describe('escapeCell', () => {
  it('escapes pipes and newlines', () => {
    expect(escapeCell('a|b')).toBe('a\\|b')
    expect(escapeCell('one\ntwo')).toBe('one<br>two')
  })
})

describe('parseTable', () => {
  it('reads CSV with quotes', () => {
    const t = parseTable('name,quote\nAda,"Hello, ""world"""')
    expect(t.header).toEqual(['name', 'quote'])
    expect(t.rows).toEqual([['Ada', 'Hello, "world"']])
  })
  it('reads TSV pasted from a spreadsheet', () => {
    expect(parseTable('a\tb\n1\t2').rows).toEqual([['1', '2']])
  })
  it('reads a markdown table with alignment and escaped pipes', () => {
    const t = parseTable('| a | b |\n| :-: | --: |\n| x\\|y | 2 |')
    expect(t.aligns).toEqual(['center', 'right'])
    expect(t.rows).toEqual([['x|y', '2']])
  })
  it('round-trips its own output', () => {
    expect(parseTable(toMarkdown(DEFAULT_TABLE))).toEqual(DEFAULT_TABLE)
  })
  it('returns null for empty input', () => {
    expect(parseTable('  \n ')).toBeNull()
  })
})
