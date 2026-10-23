import { describe, expect, it } from 'vitest'
import { MAX, NIL, formatUuid, generate, inspect, uuidV1, uuidV4, uuidV7 } from './uuidTool.js'

const RE = (v) => new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-${v}[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

describe('generators', () => {
  it('make well-formed v1, v4 and v7 ids', () => {
    expect(uuidV4()).toMatch(RE(4))
    expect(uuidV1()).toMatch(RE(1))
    expect(uuidV7()).toMatch(RE(7))
  })
  it('make unique ids in bulk', () => {
    for (const v of ['v1', 'v4', 'v7']) expect(new Set(generate(v, 500)).size, v).toBe(500)
  })
  it('keep v1 and v7 increasing within one millisecond', () => {
    const t = Date.UTC(2026, 9, 23)
    const v7 = Array.from({ length: 50 }, () => uuidV7(t))
    expect([...v7].sort()).toEqual(v7)
    const v1 = Array.from({ length: 50 }, () => inspect(uuidV1(t)).time.getTime())
    expect(v1.every((ms) => ms === t)).toBe(true)
  })
  it('clamps bulk counts', () => {
    expect(generate('v4', 0)).toHaveLength(1)
    expect(generate('v4', 5000)).toHaveLength(1000)
  })
})

describe('inspect', () => {
  it('reads the version, variant and v7/v1 timestamps', () => {
    const t = Date.UTC(2030, 0, 2, 3, 4, 5, 6)
    expect(inspect(uuidV7(t + 1000 * 60 * 60 * 24 * 365)).version).toBe(7)
    const info = inspect(uuidV1(t))
    expect(info).toMatchObject({ version: 1, variant: 'RFC 9562' })
    expect(info.time.getTime()).toBe(t)
    expect(inspect('017F22E2-79B0-7CC3-98C4-DC0C0C07398F').time.toISOString()).toBe('2022-02-22T19:22:22.000Z')
  })
  it('accepts braces, urn and no hyphens; rejects junk', () => {
    expect(inspect('{550E8400E29B41D4A716446655440000}').canonical).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(inspect('urn:uuid:550e8400-e29b-41d4-a716-446655440000').version).toBe(4)
    expect(inspect('not-a-uuid')).toBeNull()
  })
  it('knows the nil and max UUIDs', () => {
    expect(inspect(NIL).variant).toBe('Nil UUID')
    expect(inspect(MAX).variant).toBe('Max UUID')
  })
})

describe('formatUuid', () => {
  it('applies case, hyphens, braces and quotes', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(formatUuid(id, { uppercase: true, hyphens: false, braces: true, quotes: true })).toBe('"{550E8400E29B41D4A716446655440000}"')
    expect(formatUuid(id)).toBe(id)
  })
})
