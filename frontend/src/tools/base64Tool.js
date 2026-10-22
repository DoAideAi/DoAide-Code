// The Base64 encoder/decoder (/tools/base64): UTF-8-safe encode and a forgiving decode
// (URL-safe alphabet, missing padding and stray whitespace all accepted). Runs in the page.

export const MAX_B64_CHARS = 100_000

// Text to Base64. urlSafe swaps +/ for -_ and drops the padding (the JWT/URL-parameter form).
export function encodeBase64(text, { urlSafe = false } = {}) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const b64 = btoa(bin)
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64
}

// Base64 (standard or URL-safe, padded or not, whitespace anywhere) back to text.
// Returns { out, binary } — binary is true when the bytes are not valid UTF-8 text, in which
// case `out` is a hex dump preview instead — or { error } when it isn't Base64 at all.
export function decodeBase64(input) {
  const compact = input.replace(/\s+/g, '')
  if (!compact) return { error: 'Paste some Base64 to decode.' }
  const b64 = compact.replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    const bad = compact.match(/[^A-Za-z0-9+/=_-]/)
    return { error: `Not Base64: unexpected character "${bad ? bad[0] : '?'}".` }
  }
  const unpadded = b64.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) return { error: 'Not Base64: the length is off by one — a character is missing or extra.' }
  let bin
  try {
    bin = atob(unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4))
  } catch {
    return { error: 'Not valid Base64.' }
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  try {
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    // Control characters (beyond tab/newline) mean binary data that happens to decode.
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(out)) throw new Error('binary')
    return { out, binary: false }
  } catch {
    const hex = [...bytes.slice(0, 512)].map((b) => b.toString(16).padStart(2, '0')).join(' ')
    return { out: hex + (bytes.length > 512 ? ' …' : ''), binary: true, size: bytes.length }
  }
}
