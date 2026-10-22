import { describe, expect, it } from 'vitest'
import { byteRows, colorFormats, hslToRgb, parseColor, parseTime, pxConvert, rgbToHsl, toBytes } from './unitTool.js'

describe('pxConvert', () => {
  it('converts px to rem/em at the default 16px base', () => {
    expect(pxConvert(24, 'px')).toEqual({ px: '24', rem: '1.5', em: '1.5' })
  })
  it('converts rem to px at a custom base', () => {
    expect(pxConvert(2, 'rem', 10).px).toBe('20')
  })
  it('rejects a non-positive base', () => {
    expect(pxConvert(16, 'px', 0)).toBeNull()
  })
})

describe('bytes', () => {
  it('maps decimal and binary units to bytes', () => {
    expect(toBytes(1, 'KB')).toBe(1000)
    expect(toBytes(1, 'KiB')).toBe(1024)
    expect(toBytes(5, 'B')).toBe(5)
    expect(toBytes(1, 'XX')).toBeNull()
  })
  it('lists every unit for a byte count', () => {
    const rows = byteRows(1_048_576)
    expect(rows.find((r) => r.unit === 'MiB').value).toBe('1')
    expect(rows.find((r) => r.unit === 'MB').value).toBe('1.0486')
  })
})

describe('parseTime', () => {
  const now = 1_700_000_000_000
  it('reads now, seconds, milliseconds and ISO', () => {
    expect(parseTime('now', now).ms).toBe(now)
    expect(parseTime('1700000000', now).ms).toBe(now)
    expect(parseTime('1700000000000', now).ms).toBe(now)
    expect(parseTime('2023-11-14T22:13:20Z', now).ms).toBe(now)
  })
  it('errors on junk', () => {
    expect(parseTime('yesterday-ish').error).toMatch(/Not a timestamp/)
  })
})

describe('colors', () => {
  it('parses hex, short hex, rgb() and hsl()', () => {
    expect(parseColor('#22c55e')).toEqual({ r: 34, g: 197, b: 94 })
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseColor('rgb(34, 197, 94)')).toEqual({ r: 34, g: 197, b: 94 })
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseColor('red-ish')).toBeNull()
    expect(parseColor('rgb(300, 0, 0)')).toBeNull()
  })
  it('round-trips rgb and hsl', () => {
    const rgb = { r: 34, g: 197, b: 94 }
    const back = hslToRgb(...Object.values(rgbToHsl(rgb)))
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(3)
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(3)
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(3)
  })
  it('produces all three formats', () => {
    expect(colorFormats('#22c55e')).toEqual({
      hex: '#22c55e',
      rgb: 'rgb(34, 197, 94)',
      hsl: 'hsl(142, 71%, 45%)',
    })
    expect(colorFormats('nope').error).toBeTruthy()
  })
})
