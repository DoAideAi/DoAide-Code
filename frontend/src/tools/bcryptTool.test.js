import { describe, expect, it } from 'vitest'
import { byteLength, hashPassword, parseHash, verifyPassword } from './bcryptTool.js'

describe('bcrypt helpers', () => {
  it('hashes and verifies, with a fresh salt every time', async () => {
    const a = await hashPassword('correct horse', 4)
    const b = await hashPassword('correct horse', 4)
    expect(a.hash).toMatch(/^\$2b\$04\$/)
    expect(a.hash).not.toBe(b.hash)
    expect(a.ms).toBeGreaterThanOrEqual(0)
    expect(await verifyPassword('correct horse', a.hash)).toBe(true)
    expect(await verifyPassword('wrong', a.hash)).toBe(false)
  })

  it('accepts $2a$ and $2y$ hashes', async () => {
    const { hash } = await hashPassword('pw', 4)
    expect(await verifyPassword('pw', hash.replace('$2b$', '$2y$'))).toBe(true)
    expect(await verifyPassword('pw', hash.replace('$2b$', '$2a$'))).toBe(true)
  })

  it('parses and rejects hashes', async () => {
    const parsed = parseHash('$2y$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW')
    expect(parsed).toEqual({ version: '$2y$', cost: 12, salt: 'R9h/cIPz0gi.URNNX3kh2O', checksum: 'PST9/PgBkqquzi.Ss7KIUgO2t0jWMUW' })
    expect(parseHash('$2b$10$short')).toBeNull()
    expect(parseHash('$2b$03$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW')).toBeNull()
    await expect(verifyPassword('x', 'md5:abc')).rejects.toThrow(/Not a bcrypt hash/)
  })

  it('counts UTF-8 bytes', () => {
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('😀')).toBe(4)
  })
})
