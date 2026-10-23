import { describe, expect, it } from 'vitest'
import { generateSchema, merge, stringFormat } from './jsonSchemaTool.js'

describe('stringFormat', () => {
  it('detects common formats', () => {
    expect(stringFormat('2026-10-23T12:00:00Z')).toBe('date-time')
    expect(stringFormat('2026-10-23')).toBe('date')
    expect(stringFormat('a@b.co')).toBe('email')
    expect(stringFormat('https://example.com/x')).toBe('uri')
    expect(stringFormat('123e4567-e89b-12d3-a456-426614174000')).toBe('uuid')
    expect(stringFormat('10.0.0.1')).toBe('ipv4')
    expect(stringFormat('just words')).toBeNull()
  })
})

describe('generateSchema', () => {
  it('infers object types, required keys and formats', () => {
    const schema = generateSchema('{"name":"Ada","age":36,"score":9.5,"site":"https://a.io/x","ok":true,"tag":null}')
    expect(schema.$schema).toContain('2020-12')
    expect(schema.type).toBe('object')
    expect(schema.properties.name).toEqual({ type: 'string' })
    expect(schema.properties.age).toEqual({ type: 'integer' })
    expect(schema.properties.score).toEqual({ type: 'number' })
    expect(schema.properties.site).toEqual({ type: 'string', format: 'uri' })
    expect(schema.properties.ok).toEqual({ type: 'boolean' })
    expect(schema.properties.tag).toEqual({ type: 'null' })
    expect(schema.required).toEqual(['name', 'age', 'score', 'site', 'ok', 'tag'])
  })

  it('merges array item objects: properties union, required intersect', () => {
    const schema = generateSchema('[{"id":1,"name":"a"},{"id":2,"email":"x@y.io"}]')
    expect(schema.type).toBe('array')
    expect(Object.keys(schema.items.properties).sort()).toEqual(['email', 'id', 'name'])
    expect(schema.items.required).toEqual(['id'])
  })

  it('collapses integer + number to number and keeps anyOf for real mixes', () => {
    expect(generateSchema('[1, 2.5]').items).toEqual({ type: 'number' })
    const mixed = generateSchema('[1, "a"]')
    expect(mixed.items.anyOf).toEqual([{ type: 'integer' }, { type: 'string' }])
  })

  it('drops the format when strings disagree', () => {
    expect(generateSchema('["2026-01-01", "plain"]').items).toEqual({ type: 'string' })
  })

  it('honors the options', () => {
    const schema = generateSchema('{"when":"2026-01-01"}', { formats: false, required: false, title: 'Thing' })
    expect(schema.title).toBe('Thing')
    expect(schema.properties.when).toEqual({ type: 'string' })
    expect(schema.required).toBeUndefined()
  })

  it('rejects empty and invalid input readably', () => {
    expect(() => generateSchema('  ')).toThrow(/paste some json/i)
    expect(() => generateSchema('{nope')).toThrow(/not valid json/i)
  })
})

describe('merge', () => {
  it('deduplicates identical variants', () => {
    expect(merge({ type: 'string' }, { type: 'string' })).toEqual({ type: 'string' })
  })
  it('merges nested arrays', () => {
    expect(merge({ type: 'array', items: { type: 'integer' } }, { type: 'array' })).toEqual({
      type: 'array',
      items: { type: 'integer' },
    })
  })
})
