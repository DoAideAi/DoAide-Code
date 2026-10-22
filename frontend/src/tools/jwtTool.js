// The JWT decoder (/tools/jwt-decoder): split a token into header, payload and signature,
// base64url-decode the JSON parts, and explain the registered claims (expiry above all) in
// plain words. Decoding only — signatures are never verified and the token never leaves the
// page (and is never stored).

export const MAX_JWT_CHARS = 20_000

// Decode one base64url segment to a UTF-8 string, or null when it isn't valid base64url.
export function b64urlDecode(segment) {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*$/.test(b64)) return null
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  try {
    const bin = atob(padded)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

// Split and decode a JWT. Returns { header, payload, signature } (header/payload are objects)
// or { error } with a message saying what's wrong. A leading "Bearer " is ignored, so a header
// value pastes as-is.
export function decodeJwt(token) {
  const trimmed = token.trim().replace(/^Bearer\s+/i, '')
  if (!trimmed) return { error: 'Paste a JWT to decode it.' }
  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    return { error: `A JWT has three dot-separated parts (header.payload.signature); this has ${parts.length}.` }
  }
  const [headerText, payloadText] = [b64urlDecode(parts[0]), b64urlDecode(parts[1])]
  if (headerText === null) return { error: 'The header is not valid base64url.' }
  if (payloadText === null) return { error: 'The payload is not valid base64url.' }
  let header, payload
  try {
    header = JSON.parse(headerText)
  } catch {
    return { error: 'The header decodes, but is not valid JSON.' }
  }
  try {
    payload = JSON.parse(payloadText)
  } catch {
    return { error: 'The payload decodes, but is not valid JSON.' }
  }
  if (typeof header !== 'object' || header === null || typeof payload !== 'object' || payload === null) {
    return { error: 'The decoded parts are not JSON objects.' }
  }
  return { header, payload, signature: parts[2] }
}

// "in 2 hours" / "3 days ago" for a millisecond timestamp, relative to `now`.
export function relTime(ms, now = Date.now()) {
  const s = Math.round((ms - now) / 1000)
  const abs = Math.abs(s)
  const unit =
    abs >= 86_400 ? [Math.round(abs / 86_400), 'day'] :
    abs >= 3_600 ? [Math.round(abs / 3_600), 'hour'] :
    abs >= 60 ? [Math.round(abs / 60), 'minute'] :
    [abs, 'second']
  const text = `${unit[0]} ${unit[1]}${unit[0] === 1 ? '' : 's'}`
  return s >= 0 ? `in ${text}` : `${text} ago`
}

// Whether the token is live right now, judged from exp and nbf (both optional).
// Returns { state: 'expired' | 'not-yet' | 'valid' | 'no-exp', message }.
export function expiryStatus(payload, now = Date.now()) {
  const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : null
  const nbf = typeof payload.nbf === 'number' ? payload.nbf * 1000 : null
  if (exp !== null && exp <= now) {
    return { state: 'expired', message: `Expired ${relTime(exp, now)} (${new Date(exp).toLocaleString()}).` }
  }
  if (nbf !== null && nbf > now) {
    return { state: 'not-yet', message: `Not valid yet: becomes valid ${relTime(nbf, now)}.` }
  }
  if (exp !== null) {
    return { state: 'valid', message: `Valid: expires ${relTime(exp, now)} (${new Date(exp).toLocaleString()}).` }
  }
  return { state: 'no-exp', message: 'No exp claim: this token never expires on its own.' }
}

const CLAIM_LABELS = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'Token ID',
}
const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat'])

// The registered claims present in the payload, each with a label and a human-readable value.
export function describeClaims(payload, now = Date.now()) {
  return Object.keys(CLAIM_LABELS)
    .filter((name) => payload[name] !== undefined)
    .map((name) => {
      const raw = payload[name]
      let value = Array.isArray(raw) ? raw.join(', ') : String(raw)
      if (TIME_CLAIMS.has(name) && typeof raw === 'number') {
        value = `${new Date(raw * 1000).toLocaleString()} (${relTime(raw * 1000, now)})`
      }
      return { name, label: CLAIM_LABELS[name], value }
    })
}
