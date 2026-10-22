import { describe, expect, it } from 'vitest'
import { diffLines, diffStats, splitRows } from './diffLines.js'

describe('diffLines', () => {
  it('marks identical text as all same, with matching numbers', () => {
    const rows = diffLines('a\nb', 'a\nb')
    expect(rows).toEqual([
      { kind: 'same', text: 'a', old: 1, new: 1 },
      { kind: 'same', text: 'b', old: 2, new: 2 },
    ])
  })

  it('finds a changed line and puts the removal before the addition', () => {
    const rows = diffLines('a\nold\nz', 'a\nnew\nz')
    expect(rows).toEqual([
      { kind: 'same', text: 'a', old: 1, new: 1 },
      { kind: 'del', text: 'old', old: 2, new: null },
      { kind: 'add', text: 'new', old: null, new: 2 },
      { kind: 'same', text: 'z', old: 3, new: 3 },
    ])
  })

  it('numbers the common tail by each side', () => {
    const rows = diffLines('a\nz', 'a\nb\nz')
    expect(rows.at(-1)).toEqual({ kind: 'same', text: 'z', old: 2, new: 3 })
    expect(rows[1]).toEqual({ kind: 'add', text: 'b', old: null, new: 2 })
  })

  it('keeps common lines in the middle of a change', () => {
    const rows = diffLines('one\nkeep\ntwo', 'uno\nkeep\ndos')
    expect(rows.map((r) => r.kind)).toEqual(['del', 'add', 'same', 'del', 'add'])
    expect(rows[2]).toMatchObject({ text: 'keep', old: 2, new: 2 })
  })

  it('handles one side being empty', () => {
    expect(diffLines('', 'a').map((r) => r.kind)).toContain('add')
    expect(diffLines('a\nb', '').filter((r) => r.kind === 'del')).toHaveLength(2)
  })

  it('still answers when the texts are too large for the table', () => {
    const a = Array.from({ length: 2100 }, (_, i) => `a${i}`).join('\n')
    const b = Array.from({ length: 2100 }, (_, i) => `b${i}`).join('\n')
    const { added, removed } = diffStats(diffLines(a, b))
    expect(added).toBe(2100)
    expect(removed).toBe(2100)
  })
})

describe('diffStats', () => {
  it('counts added and removed lines', () => {
    expect(diffStats(diffLines('a\nb', 'a\nc\nd'))).toEqual({ added: 2, removed: 1 })
  })
})

describe('splitRows', () => {
  it('pairs the k-th removal with the k-th addition', () => {
    const pairs = splitRows(diffLines('a\nx\ny\nz', 'a\nX\nz'))
    expect(pairs).toHaveLength(4)
    expect(pairs[1].left.text).toBe('x')
    expect(pairs[1].right.text).toBe('X')
    expect(pairs[2].left.text).toBe('y')
    expect(pairs[2].right).toBeNull()
  })

  it('puts a same line on both sides', () => {
    const [pair] = splitRows(diffLines('a', 'a'))
    expect(pair.left).toBe(pair.right)
  })
})
