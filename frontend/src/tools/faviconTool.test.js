import { describe, expect, it } from 'vitest'
import { ICO_SIZES, SIZES, dataUrlToBytes, htmlSnippet, icoBytes } from './faviconTool.js'

describe('SIZES', () => {
  it('covers the standard favicon set', () => {
    const px = SIZES.map(([s]) => s)
    expect(px).toEqual([16, 32, 48, 180, 192, 512])
    for (const [, name, label] of SIZES) {
      expect(name).toMatch(/\.png$/)
      expect(label.length).toBeGreaterThan(3)
    }
    for (const s of ICO_SIZES) expect(px).toContain(s)
  })
})

describe('htmlSnippet', () => {
  it('links the ico, PNGs and apple touch icon', () => {
    const html = htmlSnippet()
    expect(html).toContain('favicon.ico')
    expect(html).toContain('favicon-32x32.png')
    expect(html).toContain('apple-touch-icon')
  })
})

describe('dataUrlToBytes', () => {
  it('decodes base64 payloads', () => {
    const bytes = dataUrlToBytes('data:image/png;base64,AAEC')
    expect([...bytes]).toEqual([0, 1, 2])
  })
})

describe('icoBytes', () => {
  it('builds a well-formed ICONDIR with correct offsets', () => {
    const a = new Uint8Array([1, 2, 3, 4])
    const b = new Uint8Array([5, 6])
    const ico = icoBytes([
      { size: 16, bytes: a },
      { size: 32, bytes: b },
    ])
    const view = new DataView(ico.buffer)
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(2)
    expect(ico[6]).toBe(16) // first entry width
    expect(view.getUint32(14, true)).toBe(4) // first payload length
    const firstOffset = view.getUint32(18, true)
    expect(firstOffset).toBe(6 + 2 * 16)
    expect([...ico.slice(firstOffset, firstOffset + 4)]).toEqual([1, 2, 3, 4])
    const secondOffset = view.getUint32(18 + 16, true)
    expect([...ico.slice(secondOffset, secondOffset + 2)]).toEqual([5, 6])
    expect(ico.length).toBe(6 + 32 + 6)
  })

  it('marks 256px entries as 0 and rejects an empty set', () => {
    const ico = icoBytes([{ size: 256, bytes: new Uint8Array([9]) }])
    expect(ico[6]).toBe(0)
    expect(() => icoBytes([])).toThrow(/no images/i)
  })
})
