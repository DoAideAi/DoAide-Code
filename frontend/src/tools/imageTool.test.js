import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, formatBytes, imageError, rawBase64, readAsDataUrl, snippets } from './imageTool.js'

describe('imageError', () => {
  it('accepts a small PNG', () => {
    expect(imageError(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull()
  })
  it('rejects non-images', () => {
    expect(imageError(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toMatch(/Not a supported image/)
  })
  it('rejects oversized files', () => {
    const big = { type: 'image/png', size: MAX_IMAGE_BYTES + 1 }
    expect(imageError(big)).toMatch(/Too large/)
  })
})

describe('readAsDataUrl', () => {
  it('reads a file into a data URL', async () => {
    const url = await readAsDataUrl(new File(['hello'], 'a.png', { type: 'image/png' }))
    expect(url).toBe(`data:image/png;base64,${btoa('hello')}`)
  })
})

describe('snippets', () => {
  const url = 'data:image/png;base64,aGk='
  it('strips the prefix for raw Base64', () => {
    expect(rawBase64(url)).toBe('aGk=')
  })
  it('builds img, css and markdown snippets', () => {
    const all = Object.fromEntries(snippets(url, 'logo'))
    expect(all['HTML <img>']).toBe(`<img src="${url}" alt="logo" />`)
    expect(all['CSS background']).toBe(`background-image: url('${url}');`)
    expect(all['Markdown']).toBe(`![logo](${url})`)
  })
})

describe('formatBytes', () => {
  it('formats sensibly at each scale', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB')
  })
})
