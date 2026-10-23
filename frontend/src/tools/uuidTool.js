// The UUID generator (/tools/uuid-generator): RFC 9562 v1 (time + node), v4 (random) and v7
// (sortable time + random) from the browser's CSPRNG, bulk formatting, and a decoder.

// Milliseconds between the Gregorian epoch (1582-10-15) used by v1 and the Unix epoch.
const GREGORIAN_OFFSET_MS = 12_219_292_800_000n

export const VERSIONS = { v4: 'v4 — random', v7: 'v7 — time-ordered', v1: 'v1 — time + node' }
export const MAX_BULK = 1000

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n))
}

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function format(bytes) {
  const h = hex(bytes)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function uuidV4() {
  const b = randomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  return format(b)
}

// v1 and v7 stay strictly increasing within a page even when many are made in one millisecond.
let v1Last = -1n
let v1Node = null
let v1Clock = null

export function uuidV1(now = Date.now()) {
  if (!v1Node) {
    v1Node = randomBytes(6)
    v1Node[0] |= 0x01 // multicast bit: marks a random node id, not a real MAC (RFC 9562 §6.10)
    const c = randomBytes(2)
    v1Clock = ((c[0] << 8) | c[1]) & 0x3fff
  }
  // 100-ns ticks since 1582; the sub-millisecond part counts up for UUIDs in the same ms, and a
  // clock that moved backwards gets a new clock sequence instead (RFC 9562 §6.3).
  let ticks = (BigInt(now) + GREGORIAN_OFFSET_MS) * 10_000n
  if (ticks <= v1Last) {
    if (v1Last - ticks < 10_000n) ticks = v1Last + 1n
    else v1Clock = (v1Clock + 1) & 0x3fff
  }
  v1Last = ticks
  const b = new Uint8Array(16)
  const low = Number(ticks & 0xffffffffn)
  const mid = Number((ticks >> 32n) & 0xffffn)
  const high = Number((ticks >> 48n) & 0x0fffn)
  b.set([low >>> 24, (low >>> 16) & 255, (low >>> 8) & 255, low & 255, mid >> 8, mid & 255, 0x10 | (high >> 8), high & 255])
  b[8] = 0x80 | (v1Clock >> 8)
  b[9] = v1Clock & 255
  b.set(v1Node, 10)
  return format(b)
}

let v7LastMs = -1
let v7Counter = 0

export function uuidV7(now = Date.now()) {
  const b = randomBytes(16)
  // 12-bit rand_a doubles as a counter within one millisecond (RFC 9562 §6.2, method 1).
  if (now <= v7LastMs) {
    v7Counter++
    if (v7Counter > 0xfff) {
      v7LastMs++
      v7Counter = 0
    }
    now = v7LastMs
  } else {
    v7LastMs = now
    v7Counter = ((b[6] & 0x07) << 8) | b[7] // random start, headroom left for increments
  }
  const ms = BigInt(now)
  for (let i = 0; i < 6; i++) b[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xffn)
  b[6] = 0x70 | (v7Counter >> 8)
  b[7] = v7Counter & 255
  b[8] = (b[8] & 0x3f) | 0x80
  return format(b)
}

const MAKERS = { v1: uuidV1, v4: uuidV4, v7: uuidV7 }

export function generate(version, count = 1) {
  const n = Math.max(1, Math.min(MAX_BULK, Math.floor(count) || 1))
  return Array.from({ length: n }, () => MAKERS[version]())
}

// Output shape: { uppercase, hyphens, braces, quotes }.
export function formatUuid(id, { uppercase = false, hyphens = true, braces = false, quotes = false } = {}) {
  let s = hyphens ? id : id.replaceAll('-', '')
  if (uppercase) s = s.toUpperCase()
  if (braces) s = `{${s}}`
  if (quotes) s = `"${s}"`
  return s
}

export const NIL = '00000000-0000-0000-0000-000000000000'
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

// Version, variant and (for v1/v6/v7) the embedded timestamp of any UUID string; null if invalid.
export function inspect(input) {
  const h = input.trim().replace(/^[{"']+|[}"']+$/g, '').replace(/^urn:uuid:/i, '').replaceAll('-', '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(h)) return null
  const canonical = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  if (canonical === NIL) return { canonical, version: null, variant: 'Nil UUID', time: null }
  if (canonical === MAX) return { canonical, version: null, variant: 'Max UUID', time: null }
  const version = parseInt(h[12], 16)
  const v = parseInt(h[16], 16)
  const variant = v < 8 ? 'NCS (reserved)' : v < 12 ? 'RFC 9562' : v < 14 ? 'Microsoft (reserved)' : 'Future (reserved)'
  let time = null
  if (variant === 'RFC 9562') {
    if (version === 7) time = new Date(parseInt(h.slice(0, 12), 16))
    if (version === 1 || version === 6) {
      const ticks = version === 1 ? BigInt(`0x${h.slice(13, 16)}${h.slice(8, 12)}${h.slice(0, 8)}`) : BigInt(`0x${h.slice(0, 12)}${h.slice(13, 16)}`)
      time = new Date(Number(ticks / 10_000n - GREGORIAN_OFFSET_MS))
    }
  }
  return { canonical, version, variant, time }
}
