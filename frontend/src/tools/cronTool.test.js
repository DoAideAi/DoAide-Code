import { describe, expect, it } from 'vitest'
import { cronMatches, describeCron, nextRuns, parseCron, parseField } from './cronTool.js'

describe('parseField', () => {
  const minute = { name: 'minute', min: 0, max: 59 }
  it('expands steps, ranges and lists', () => {
    expect([...parseField('*/20', minute).set]).toEqual([0, 20, 40])
    expect([...parseField('1-3', minute).set]).toEqual([1, 2, 3])
    expect([...parseField('0,30', minute).set]).toEqual([0, 30])
  })
  it('maps names and folds day-of-week 7 to Sunday', () => {
    const dow = { name: 'day of week', min: 0, max: 7, aliases: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], aliasBase: 0 }
    expect([...parseField('mon-fri', dow).set]).toEqual([1, 2, 3, 4, 5])
    expect(parseField('7', dow).set.has(0)).toBe(true)
  })
  it('rejects out-of-range values with the field name', () => {
    expect(() => parseField('61', minute)).toThrow(/minute must be 0–59/)
  })
})

describe('parseCron', () => {
  it('accepts shortcuts like @daily', () => {
    const p = parseCron('@daily')
    expect(p.error).toBeUndefined()
    expect(p.fields[0].raw).toBe('0')
    expect(p.fields[1].raw).toBe('0')
  })
  it('explains a wrong field count, with a seconds hint for 6 fields', () => {
    expect(parseCron('* * *').error).toMatch(/5 fields.*this has 3/)
    expect(parseCron('* * * * * *').error).toMatch(/seconds field/)
  })
})

describe('describeCron', () => {
  it.each([
    ['*/15 * * * *', 'Every 15 minutes.'],
    ['* * * * *', 'Every minute.'],
    ['0 9 * * 1-5', 'At 09:00, on Monday to Friday.'],
    ['30 2 1 * *', 'At 02:30, on day 1 of the month.'],
    ['0 0 * * 0', 'At 00:00, on Sunday.'],
    ['45 17 * * *', 'At 17:45.'],
    ['30 * * * *', 'At minute 30 of every hour.'],
    ['0 9,18 * * *', 'At minute 0 past hour 9 and 18.'],
    ['0 0 1 1 *', 'At 00:00, on day 1 of the month, in January.'],
  ])('describes %s', (expr, text) => {
    expect(describeCron(expr)).toBe(text)
  })
  it('returns null for an invalid expression', () => {
    expect(describeCron('nope')).toBeNull()
  })
})

describe('cronMatches and nextRuns', () => {
  it('computes the next runs for a daily schedule', () => {
    const from = new Date(2026, 0, 1, 10, 0) // Jan 1 2026, 10:00 local
    const runs = nextRuns('30 9 * * *', 3, from)
    expect(runs.map((d) => d.getHours() * 100 + d.getMinutes())).toEqual([930, 930, 930])
    expect(runs[0].getDate()).toBe(2)
    expect(runs[2].getDate()).toBe(4)
  })

  it('never returns the starting minute itself', () => {
    const from = new Date(2026, 0, 1, 9, 30)
    const runs = nextRuns('30 9 * * *', 1, from)
    expect(runs[0].getDate()).toBe(2)
  })

  it('honours weekday restrictions', () => {
    // Jan 2 2026 is a Friday; next weekday 09:00 after Friday 10:00 is Monday Jan 5.
    const runs = nextRuns('0 9 * * 1-5', 1, new Date(2026, 0, 2, 10, 0))
    expect(runs[0].getDay()).toBe(1)
    expect(runs[0].getDate()).toBe(5)
  })

  it('uses OR when both day fields are restricted', () => {
    const { fields } = parseCron('0 0 15 * 1')
    expect(cronMatches(fields, new Date(2026, 0, 15, 0, 0))).toBe(true) // the 15th (a Thursday)
    expect(cronMatches(fields, new Date(2026, 0, 12, 0, 0))).toBe(true) // a Monday
    expect(cronMatches(fields, new Date(2026, 0, 13, 0, 0))).toBe(false) // a plain Tuesday
  })

  it('returns [] for an invalid expression', () => {
    expect(nextRuns('bad')).toEqual([])
  })
})
