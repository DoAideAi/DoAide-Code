import { describe, expect, it } from 'vitest'
import { detectPlatform } from './platform.js'

const nav = (userAgent, platform = '', extra = {}) => ({ userAgent, platform, ...extra })

describe('detectPlatform', () => {
  it('recognises desktop operating systems', () => {
    expect(detectPlatform(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', 'MacIntel'))).toBe('macos')
    expect(detectPlatform(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32'))).toBe('windows')
    expect(detectPlatform(nav('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64'))).toBe('linux')
  })

  it('prefers User-Agent Client Hints when present', () => {
    expect(detectPlatform(nav('Mozilla/5.0', '', { userAgentData: { platform: 'macOS' } }))).toBe('macos')
  })

  it('returns null for phones and tablets, which cannot run the agent', () => {
    expect(detectPlatform(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone'))).toBeNull()
    expect(detectPlatform(nav('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l'))).toBeNull()
    // iPadOS asks for the desktop site and reports itself as a Mac with touch.
    expect(detectPlatform(nav('Mozilla/5.0 (Macintosh)', 'MacIntel', { maxTouchPoints: 5 }))).toBeNull()
  })
})
