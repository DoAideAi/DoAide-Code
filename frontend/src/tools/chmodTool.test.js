import { describe, expect, it } from 'vitest'
import { explain, fromOctal, fromSymbolic, parseMode, toChmodSymbolic, toOctal, toSymbolic } from './chmodTool.js'

describe('chmod conversions', () => {
  it('round-trips common octal modes', () => {
    for (const [oct, sym] of [
      ['755', 'rwxr-xr-x'],
      ['644', 'rw-r--r--'],
      ['600', 'rw-------'],
      ['4755', 'rwsr-xr-x'],
      ['1777', 'rwxrwxrwt'],
      ['2770', 'rwxrws---'],
      ['1666', 'rw-rw-rwT'],
    ]) {
      expect(toSymbolic(fromOctal(oct))).toBe(sym)
      expect(toOctal(fromSymbolic(sym))).toBe(oct)
    }
  })

  it('accepts leading zeros and ls -l strings', () => {
    expect(toOctal(fromOctal('0644'))).toBe('644')
    expect(toOctal(fromOctal('00755'))).toBe('755')
    expect(toOctal(parseMode('drwxr-xr-x'))).toBe('755')
    expect(toOctal(parseMode('-rw-r--r--@'))).toBe('644')
  })

  it('rejects junk', () => {
    expect(parseMode('789')).toBeNull()
    expect(parseMode('rwxrwxrw')).toBeNull()
    expect(parseMode('')).toBeNull()
  })

  it('writes chmod symbolic syntax', () => {
    expect(toChmodSymbolic(fromOctal('750'))).toBe('u=rwx,g=rx,o=')
    expect(toChmodSymbolic(fromOctal('4755'))).toBe('u=rwx,g=rx,o=rx,u+s')
  })

  it('explains and warns', () => {
    const { lines, warnings } = explain(fromOctal('777'))
    expect(lines[2]).toBe('Others: read, write, execute')
    expect(warnings[0]).toContain('Anyone')
    expect(explain(fromOctal('640')).lines[2]).toBe('Others: no access')
  })
})
