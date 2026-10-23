import { describe, expect, it } from 'vitest'
import { diffEnv, mask, parseEnv, toExample } from './envTool.js'

describe('parseEnv', () => {
  it('handles export, quotes, escapes, inline comments and multi-line values', () => {
    const { vars, errors } = parseEnv(
      [
        '# comment',
        'export A=1',
        'B = "two words" # note',
        "C='raw \\n'",
        'D="line1\\nline2"',
        'E=val # inline',
        'F=has#hash',
        'KEY="-----BEGIN',
        'abc',
        '-----END"',
        'EMPTY=',
      ].join('\n'),
    )
    const v = Object.fromEntries([...vars].map(([k, x]) => [k, x.value]))
    expect(v).toEqual({ A: '1', B: 'two words', C: 'raw \\n', D: 'line1\nline2', E: 'val', F: 'has#hash', KEY: '-----BEGIN\nabc\n-----END', EMPTY: '' })
    expect(vars.get('EMPTY').line).toBe(11)
    expect(errors).toEqual([])
  })
  it('reports duplicates and invalid lines', () => {
    const { vars, duplicates, errors } = parseEnv('A=1\nnot a var\n1BAD=x\nA=2\nQ="open')
    expect(vars.get('A').value).toBe('2')
    expect(duplicates).toEqual([{ key: 'A', line: 4, first: 1 }])
    expect(errors.map((e) => e.line)).toEqual([2, 3, 5])
  })
})

describe('diffEnv', () => {
  it('classifies keys', () => {
    const { rows, counts } = diffEnv('A=1\nB=2\nC=\n', 'A=1\nB=3\nD=4\n')
    expect(rows.map((r) => [r.key, r.status])).toEqual([
      ['A', 'same'],
      ['B', 'changed'],
      ['C', 'missing'],
      ['D', 'extra'],
    ])
    expect(counts).toEqual({ missing: 1, extra: 1, changed: 1, same: 1 })
    expect(rows.find((r) => r.key === 'C').empty).toBe(true)
  })
})

describe('mask and toExample', () => {
  it('masks values', () => {
    expect(mask('sk_live_abcdef123456')).toBe('sk_••••••••')
    expect(mask('abc')).toBe('•••')
    expect(mask('')).toBe('')
  })
  it('blanks values but keeps structure', () => {
    expect(toExample('# db\nexport DB_URL=postgres://x # primary\nKEY="a\nb"\n\nNAME=\'x\'')).toBe('# db\nexport DB_URL= # primary\nKEY=\n\nNAME=')
  })
})
