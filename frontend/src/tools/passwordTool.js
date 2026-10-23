// The password generator (/tools/password-generator): unbiased random passwords from the
// browser's CSPRNG, exact entropy for generated ones, and a heuristic strength check for typed ones.

export const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
}
export const AMBIGUOUS = 'Il1O0o|`\'"'
export const MIN_LENGTH = 4
export const MAX_LENGTH = 128

export const DEFAULT_OPTIONS = { length: 20, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: false, exclude: '' }

// Uniform integer in [0, n) — rejection sampling avoids the modulo bias of `rand % n`.
export function randomInt(n, rand = (buf) => crypto.getRandomValues(buf)) {
  const limit = Math.floor(0x100000000 / n) * n
  const buf = new Uint32Array(1)
  for (;;) {
    rand(buf)
    if (buf[0] < limit) return buf[0] % n
  }
}

// The character sets left after exclusions, as { name: chars } with empty sets dropped.
export function activeSets(opts) {
  const drop = new Set([...(opts.excludeAmbiguous ? AMBIGUOUS : ''), ...(opts.exclude ?? '')])
  const out = {}
  for (const name of Object.keys(SETS)) {
    if (!opts[name]) continue
    const chars = [...SETS[name]].filter((c) => !drop.has(c)).join('')
    if (chars) out[name] = chars
  }
  return out
}

// One character from every chosen set, the rest from the union, then shuffled (Fisher–Yates).
export function generatePassword(opts, rand) {
  const sets = Object.values(activeSets(opts))
  if (!sets.length) return ''
  const pool = sets.join('')
  const length = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, opts.length), sets.length)
  const chars = sets.map((s) => s[randomInt(s.length, rand)])
  while (chars.length < length) chars.push(pool[randomInt(pool.length, rand)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rand)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// Bits of entropy of a password generated with these options: length × log2(pool).
export function generatedEntropy(opts) {
  const pool = Object.values(activeSets(opts)).join('').length
  return pool ? opts.length * Math.log2(pool) : 0
}

const COMMON = ['password', 'qwerty', 'letmein', 'admin', 'welcome', 'monkey', 'dragon', 'iloveyou', 'abc123', '123456', 'football', 'baseball', 'master', 'login', 'princess', 'sunshine', 'shadow', 'passw0rd', 'trustno1', 'superman']
const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']

// A rough estimate for a typed password: character-pool entropy, discounted for the patterns
// attackers try first (common words, repeats, keyboard and alphabet runs, trailing years).
export function estimateEntropy(password) {
  if (!password) return 0
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/\d/.test(password)) pool += 10
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33
  let effective = [...password].length
  const lower = password.toLowerCase()
  for (const w of COMMON) if (lower.includes(w)) effective -= w.length - 1
  effective -= (password.match(/(.)\1{2,}/g) ?? []).reduce((n, run) => n + run.length - 1, 0)
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const run = seq.slice(i, i + 4)
      if (lower.includes(run) || lower.includes([...run].reverse().join(''))) effective -= 2
    }
  }
  if (/(19|20)\d{2}$/.test(password)) effective -= 3
  return Math.max(1, effective) * Math.log2(Math.max(pool, 2))
}

export const LEVELS = [
  [28, 'Very weak', 'bg-red-600'],
  [36, 'Weak', 'bg-orange-500'],
  [60, 'Fair', 'bg-amber-400'],
  [80, 'Strong', 'bg-emerald-500'],
  [Infinity, 'Very strong', 'bg-emerald-400'],
]

export function strength(bits) {
  const i = LEVELS.findIndex(([max]) => bits < max)
  return { index: i, label: LEVELS[i][1], color: LEVELS[i][2], percent: Math.min(100, Math.round((bits / 100) * 100)) }
}

// Average time to guess at `rate` guesses per second (offline attack on a fast hash by default).
export function crackTime(bits, rate = 1e10) {
  const seconds = 2 ** bits / 2 / rate
  if (seconds < 1) return 'instantly'
  const units = [
    ['century', 3.156e9],
    ['year', 3.156e7],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]
  if (seconds >= 3.156e9 * 1e6) return 'millions of centuries+'
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size)
      const plural = name === 'century' ? 'centuries' : `${name}s`
      return `${n.toLocaleString('en-US')} ${n === 1 ? name : plural}`
    }
  }
  return 'instantly'
}
