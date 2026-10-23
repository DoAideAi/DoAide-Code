import { describe, expect, it } from 'vitest'
import { bitString, bitwise, fits, formatBig, group, parseAuto, parseBig, toSigned, toUnsigned } from './baseTool.js'

describe('parseBig / formatBig', () => {
  it('reads every base with prefixes, separators and signs', () => {
    expect(parseBig('0b1010_1010', 2)).toBe(170n)
    expect(parseBig('0o755', 8)).toBe(493n)
    expect(parseBig('0xFF FF', 16)).toBe(65535n)
    expect(parseBig('-42', 10)).toBe(-42n)
    expect(parseBig('zz', 36)).toBe(1295n)
    expect(parseBig('18446744073709551615', 10)).toBe(2n ** 64n - 1n)
  })
  it('rejects digits outside the base', () => {
    expect(parseBig('102', 2)).toBeNull()
    expect(parseBig('0x', 16)).toBeNull()
    expect(parseBig('g', 16)).toBeNull()
    expect(parseBig('', 10)).toBeNull()
  })
  it('prints and groups', () => {
    expect(formatBig(255n, 16)).toBe('ff')
    expect(formatBig(-5n, 2)).toBe('-101')
    expect(group('11111111', 4)).toBe('1111 1111')
    expect(group('-1234567', 3, ',')).toBe('-1,234,567')
  })
})

describe('widths', () => {
  it('shows two’s complement and both readings', () => {
    expect(toUnsigned(-1n, 8)).toBe(255n)
    expect(toSigned(200n, 8)).toBe(-56n)
    expect(bitString(-2n, 8)).toBe('1111 1110')
    expect(bitString(5n, 16)).toBe('0000 0000 0000 0101')
    expect(fits(255n, 8)).toEqual({ unsigned: true, signed: false })
    expect(fits(-128n, 8)).toEqual({ unsigned: false, signed: true })
  })
})

describe('bitwise', () => {
  it('runs each operation masked to the width', () => {
    expect(bitwise('and', 0b1100n, 0b1010n, 8)).toBe(0b1000n)
    expect(bitwise('or', 0b1100n, 0b1010n, 8)).toBe(0b1110n)
    expect(bitwise('xor', 0b1100n, 0b1010n, 8)).toBe(0b0110n)
    expect(bitwise('not', 0n, 0n, 16)).toBe(0xffffn)
    expect(bitwise('shl', 0x81n, 1n, 8)).toBe(0x02n)
    expect(bitwise('sar', -16n, 2n, 8)).toBe(toUnsigned(-4n, 8))
    expect(bitwise('shr', -16n, 2n, 8)).toBe(0x3cn)
    expect(bitwise('shl', 1n, 65n, 64)).toBe(2n)
  })
})

describe('parseAuto', () => {
  it('picks the base from the prefix', () => {
    expect([parseAuto('0x10'), parseAuto('0b10'), parseAuto('0o10'), parseAuto('10'), parseAuto('-0x10'), parseAuto('1x')]).toEqual([16n, 2n, 8n, 10n, -16n, null])
  })
})
