import { describe, expect, it } from 'vitest'
import { MAX_NODES, ROOT_PATHS, appendKey, flatten, parseForPaths, preview } from './jsonPathTool.js'

describe('parseForPaths', () => {
  it('parses valid JSON', () => {
    expect(parseForPaths('{"a":1}').value).toEqual({ a: 1 })
  })
  it('reports the line for bad JSON when the browser gives one', () => {
    expect(parseForPaths('{\n  "a": 1,\n}').error).toMatch(/line 3/)
  })
})

describe('appendKey', () => {
  it('uses dot notation for identifier keys', () => {
    expect(appendKey(ROOT_PATHS, 'name')).toEqual({ jsonPath: '$.name', js: 'data.name' })
  })
  it('uses brackets for array indexes', () => {
    expect(appendKey(ROOT_PATHS, 0)).toEqual({ jsonPath: '$[0]', js: 'data[0]' })
  })
  it('quotes awkward keys', () => {
    expect(appendKey(ROOT_PATHS, 'first name').jsonPath).toBe("$['first name']")
    expect(appendKey(ROOT_PATHS, "it's").js).toBe("data['it\\'s']")
  })
})

describe('flatten', () => {
  it('walks objects and arrays with paths', () => {
    const { rows, truncated } = flatten({ users: [{ name: 'Jo' }] })
    expect(truncated).toBe(false)
    expect(rows.map((r) => r.paths.jsonPath)).toEqual(['$', '$.users', '$.users[0]', '$.users[0].name'])
    const leaf = rows[3]
    expect(leaf.kind).toBe('leaf')
    expect(leaf.value).toBe('"Jo"')
    expect(leaf.paths.js).toBe('data.users[0].name')
  })
  it('caps enormous documents', () => {
    const { rows, truncated } = flatten(Array.from({ length: MAX_NODES + 10 }, (_, i) => i))
    expect(truncated).toBe(true)
    expect(rows.length).toBeLessThanOrEqual(MAX_NODES)
  })
})

describe('preview', () => {
  it('shortens long strings', () => {
    expect(preview('x'.repeat(50))).toBe(`"${'x'.repeat(40)}…"`)
  })
  it('shows primitives as JSON', () => {
    expect(preview(null)).toBe('null')
    expect(preview(42)).toBe('42')
  })
})
