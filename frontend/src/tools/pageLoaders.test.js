import { describe, expect, it } from 'vitest'
import { PAGE_LOADERS, preloadToolPage, slugForPath } from './pageLoaders.js'
import { UTIL_TOOLS } from './utilTools.js'

describe('PAGE_LOADERS', () => {
  it('has a loader for every utility in the catalog', () => {
    for (const t of UTIL_TOOLS) expect(PAGE_LOADERS[t.slug], `missing loader for ${t.slug}`).toBeTypeOf('function')
  })
  it('has a catalog entry for every loader', () => {
    for (const slug of Object.keys(PAGE_LOADERS)) {
      expect(UTIL_TOOLS.some((t) => t.slug === slug), `loader without catalog entry: ${slug}`).toBe(true)
    }
  })
})

describe('slugForPath', () => {
  it('reads the slug from a tools path', () => {
    expect(slugForPath('/tools/diff-checker')).toBe('diff-checker')
    expect(slugForPath('/tools/diff-checker/')).toBe('diff-checker')
    expect(slugForPath('/tools')).toBe('')
  })
})

describe('preloadToolPage', () => {
  it('starts the import for a known slug and ignores unknown ones', async () => {
    expect(() => preloadToolPage('/tools/url-encoder')).not.toThrow()
    expect(() => preloadToolPage('/tools/not-a-tool')).not.toThrow()
    expect(() => preloadToolPage('/tools')).not.toThrow()
  })
})
