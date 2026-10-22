import { describe, expect, it } from 'vitest'
import { jsonStats, parseJson } from './jsonTool.js'

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a": [1, 2]}')).toEqual({ ok: true, value: { a: [1, 2] } })
  })

  it('reports where invalid JSON broke', () => {
    const result = parseJson('{\n  "a": oops\n}')
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    // Node/V8 gives a position; the line must point at line 2.
    if (result.line !== null) expect(result.line).toBe(2)
  })

  it('rejects an empty-ish paste', () => {
    expect(parseJson('not json').ok).toBe(false)
  })
})

describe('jsonStats', () => {
  it('counts values, keys and depth', () => {
    expect(jsonStats({ a: [1, 2], b: { c: true } })).toEqual({ values: 6, keys: 3, depth: 3 })
  })

  it('handles a bare scalar', () => {
    expect(jsonStats(42)).toEqual({ values: 1, keys: 0, depth: 1 })
  })
})
