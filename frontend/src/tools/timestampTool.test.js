import { describe, expect, it } from 'vitest'
import { formatAll, inTimezone, localTimezone, parseTimestamp, relativeTo, timezones } from './timestampTool.js'

describe('parseTimestamp', () => {
  it('reads unix seconds', () => {
    expect(parseTimestamp('1700000000')).toEqual({ ms: 1700000000000, kind: 'unix seconds' })
  })
  it('reads unix milliseconds', () => {
    expect(parseTimestamp('1700000000000')).toEqual({ ms: 1700000000000, kind: 'unix milliseconds' })
  })
  it('reads ISO 8601', () => {
    expect(parseTimestamp('2026-10-23T07:00:00Z')).toEqual({ ms: Date.parse('2026-10-23T07:00:00Z'), kind: 'date string' })
  })
  it('reads RFC 2822', () => {
    expect(parseTimestamp('Thu, 23 Oct 2026 07:00:00 +0000').ms).toBe(Date.parse('2026-10-23T07:00:00Z'))
  })
  it('rejects garbage with a hint', () => {
    expect(parseTimestamp('yesterday-ish').error).toMatch(/ISO 8601/)
  })
  it('rejects numbers beyond date range', () => {
    expect(parseTimestamp('99999999999999999999').error).toMatch(/too large/)
  })
  it('asks for input when empty', () => {
    expect(parseTimestamp('  ').error).toMatch(/Type a timestamp/)
  })
})

describe('formatAll', () => {
  const all = formatAll(1700000000000)
  it('gives unix seconds and milliseconds', () => {
    expect(all.unixSeconds).toBe('1700000000')
    expect(all.unixMs).toBe('1700000000000')
  })
  it('gives ISO 8601 UTC', () => {
    expect(all.iso).toBe('2023-11-14T22:13:20.000Z')
  })
  it('gives RFC 2822 UTC', () => {
    expect(all.rfc2822).toBe('Tue, 14 Nov 2023 22:13:20 +0000')
  })
})

describe('inTimezone', () => {
  it('renders in a named zone', () => {
    expect(inTimezone(1700000000000, 'UTC')).toContain('14 Nov 2023')
  })
  it('returns empty for an unknown zone', () => {
    expect(inTimezone(1700000000000, 'Nowhere/Fake')).toBe('')
  })
})

describe('relativeTo', () => {
  it('describes the past', () => {
    expect(relativeTo(0, 7200000)).toBe('2 hours ago')
  })
  it('describes the future', () => {
    expect(relativeTo(60000, 0)).toBe('in 1 minute')
  })
  it('says now for sub-second gaps', () => {
    expect(relativeTo(100, 0)).toBe('now')
  })
})

describe('timezones', () => {
  it('always includes UTC and the local zone', () => {
    expect(timezones()).toContain('UTC')
    expect(typeof localTimezone()).toBe('string')
  })
})
