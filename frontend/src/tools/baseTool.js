// The number base converter (/tools/number-base-converter): arbitrary-precision (BigInt) parsing
// and printing in bases 2–36, two's-complement views at 8–64 bits, and bitwise operations.

export const WIDTHS = [8, 16, 32, 64]
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
const PREFIX = { 2: /^0b/i, 8: /^0o/i, 16: /^0x/i }

// Text in `base` → BigInt, or null when it isn't a number. Accepts a leading minus, the
// 0b/0o/0x prefix that matches the base, and spaces or underscores between digits.
export function parseBig(text, base) {
  let s = text.trim().replace(/[\s_]/g, '').toLowerCase()
  let neg = false
  if (s.startsWith('-')) {
    neg = true
    s = s.slice(1)
  }
  if (PREFIX[base]) s = s.replace(PREFIX[base], '')
  if (!s) return null
  const b = BigInt(base)
  let n = 0n
  for (const ch of s) {
    const d = DIGITS.indexOf(ch)
    if (d < 0 || d >= base) return null
    n = n * b + BigInt(d)
  }
  return neg ? -n : n
}

export function formatBig(n, base) {
  return n.toString(base)
}

// Groups digits from the right: 'ff00ff' by 2 → 'ff 00 ff'.
export function group(s, size, sep = ' ') {
  const neg = s.startsWith('-')
  const digits = neg ? s.slice(1) : s
  const out = []
  for (let i = digits.length; i > 0; i -= size) out.unshift(digits.slice(Math.max(0, i - size), i))
  return (neg ? '-' : '') + out.join(sep)
}

const mask = (bits) => (1n << BigInt(bits)) - 1n

// The value's bit pattern at `bits` width (two's complement for negatives), as unsigned BigInt.
export function toUnsigned(n, bits) {
  return BigInt.asUintN(bits, n)
}

export function toSigned(n, bits) {
  return BigInt.asIntN(bits, n)
}

// Whether n is representable at this width as signed and/or unsigned.
export function fits(n, bits) {
  const max = mask(bits)
  return { unsigned: n >= 0n && n <= max, signed: n >= -(1n << BigInt(bits - 1)) && n < 1n << BigInt(bits - 1) }
}

// The bits at width, zero-padded and split into nibbles: '1111 1111'.
export function bitString(n, bits) {
  return group(toUnsigned(n, bits).toString(2).padStart(bits, '0'), 4)
}

export const OPS = [
  ['and', 'A & B'],
  ['or', 'A | B'],
  ['xor', 'A ^ B'],
  ['not', '~A'],
  ['shl', 'A << B'],
  ['sar', 'A >> B'],
  ['shr', 'A >>> B'],
]

// A op B masked to `bits`; returns the unsigned bit pattern. Shift counts use B's low bits like
// most CPUs do (B mod width), and >> keeps the sign while >>> fills with zeros.
export function bitwise(op, a, b, bits) {
  const ua = toUnsigned(a, bits)
  const ub = toUnsigned(b, bits)
  const count = BigInt(Number(ub % BigInt(bits)))
  switch (op) {
    case 'and':
      return ua & ub
    case 'or':
      return ua | ub
    case 'xor':
      return ua ^ ub
    case 'not':
      return ~ua & mask(bits)
    case 'shl':
      return (ua << count) & mask(bits)
    case 'sar':
      return toUnsigned(toSigned(ua, bits) >> count, bits)
    case 'shr':
      return ua >> count
    default:
      throw new Error(`Unknown op ${op}`)
  }
}

// Text with an optional 0b/0o/0x prefix (decimal otherwise) → BigInt or null.
export function parseAuto(text) {
  const s = text.trim().replace(/^-/, '')
  const base = /^0b/i.test(s) ? 2 : /^0o/i.test(s) ? 8 : /^0x/i.test(s) ? 16 : 10
  return parseBig(text, base)
}
