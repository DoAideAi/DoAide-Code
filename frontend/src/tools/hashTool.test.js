import { describe, expect, it } from 'vitest'
import { HASH_ALGOS, hashAll, hashText } from './hashTool.js'

describe('hashText', () => {
  it('matches the known SHA-256 of "hello"', async () => {
    expect(await hashText('hello', 'SHA-256')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })
  it('matches the known SHA-1 of the empty string', async () => {
    expect(await hashText('', 'SHA-1')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })
  it('hashes UTF-8 (not UTF-16) bytes', async () => {
    // sha256 of the UTF-8 bytes of "é"
    expect(await hashText('é', 'SHA-256')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c')
  })
})

describe('hashAll', () => {
  it('returns every algorithm with the right digest lengths', async () => {
    const all = await hashAll('abc')
    expect(Object.keys(all)).toEqual(HASH_ALGOS)
    expect(all['SHA-1']).toHaveLength(40)
    expect(all['SHA-256']).toHaveLength(64)
    expect(all['SHA-384']).toHaveLength(96)
    expect(all['SHA-512']).toHaveLength(128)
  })
})
