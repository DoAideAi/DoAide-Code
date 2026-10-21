// Which installer this browser should get: 'macos', 'windows', 'linux', or null for phones
// and tablets (the agent runs on the computer you code on).
export function detectPlatform(nav = globalThis.navigator) {
  if (!nav) return null
  const ua = nav.userAgent ?? ''
  const platform = nav.userAgentData?.platform ?? nav.platform ?? ''
  const text = `${platform} ${ua}`
  if (/android|iphone|ipad|ipod/i.test(text)) return null
  if (/mac/i.test(text)) return (nav.maxTouchPoints ?? 0) > 1 ? null : 'macos' // iPadOS reports Mac
  if (/win/i.test(text)) return 'windows'
  if (/linux|x11|cros/i.test(text)) return 'linux'
  return null
}

export const PLATFORM_NAMES = { macos: 'macOS', windows: 'Windows', linux: 'Linux' }
