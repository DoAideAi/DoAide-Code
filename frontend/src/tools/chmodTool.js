// Unix permissions: a mode is { special: [setuid, setgid, sticky], who: { u, g, o } } where each
// class is [read, write, execute]. Converts between that, octal (755, 4755) and symbolic
// (rwxr-xr-x, as ls -l prints it).

export const CLASSES = [
  ['u', 'Owner'],
  ['g', 'Group'],
  ['o', 'Others'],
]
export const BITS = [
  ['r', 'Read', 4],
  ['w', 'Write', 2],
  ['x', 'Execute', 1],
]
export const SPECIALS = [
  ['setuid', 'Set UID', 4],
  ['setgid', 'Set GID', 2],
  ['sticky', 'Sticky', 1],
]

export const PRESETS = [
  ['644', 'Files: owner writes, everyone reads'],
  ['755', 'Scripts & directories'],
  ['600', 'Private file (SSH keys)'],
  ['700', 'Private directory (~/.ssh)'],
  ['664', 'Group-shared file'],
  ['775', 'Group-shared directory'],
  ['400', 'Read-only for owner'],
  ['1777', 'Shared temp directory (/tmp)'],
  ['2775', 'Group directory, new files inherit group'],
  ['4755', 'Set-UID program (like passwd)'],
]

const digitToBits = (d) => [Boolean(d & 4), Boolean(d & 2), Boolean(d & 1)]
const bitsToDigit = ([a, b, c]) => (a ? 4 : 0) + (b ? 2 : 0) + (c ? 1 : 0)

// The mode for an octal string like 755, 0644 or 4755; null when it isn't one.
export function fromOctal(text) {
  const t = text.trim().replace(/^0o/i, '')
  if (!/^[0-7]{3,4}$/.test(t) && !/^0[0-7]{4}$/.test(t)) return null
  const digits = t.slice(-4).padStart(4, '0').split('').map(Number)
  return { special: digitToBits(digits[0]), who: { u: digitToBits(digits[1]), g: digitToBits(digits[2]), o: digitToBits(digits[3]) } }
}

// "755", or "4755" when a special bit is set.
export function toOctal(mode) {
  const s = bitsToDigit(mode.special)
  const rest = CLASSES.map(([c]) => bitsToDigit(mode.who[c])).join('')
  return s ? `${s}${rest}` : rest
}

// "rwxr-xr-x", with s/S and t/T where special bits sit on the execute column, like ls -l.
export function toSymbolic(mode) {
  return CLASSES.map(([c], i) => {
    const [r, w, x] = mode.who[c]
    let exec = x ? 'x' : '-'
    if (mode.special[i]) exec = i === 2 ? (x ? 't' : 'T') : x ? 's' : 'S'
    return (r ? 'r' : '-') + (w ? 'w' : '-') + exec
  }).join('')
}

// The mode for "rwxr-xr-x" or a full ls -l string like "-rwsr-xr-x" / "drwxrwxrwt"; null otherwise.
export function fromSymbolic(text) {
  let t = text.trim()
  if (/^[-dlcbps][-rwxsStT]{9}[.@+]?$/.test(t)) t = t.slice(1, 10)
  if (!/^[-r][-w][-xsS][-r][-w][-xsS][-r][-w][-xtT]$/.test(t)) return null
  const who = {}
  const special = [false, false, false]
  CLASSES.forEach(([c], i) => {
    const part = t.slice(i * 3, i * 3 + 3)
    who[c] = [part[0] === 'r', part[1] === 'w', /[xst]/.test(part[2])]
    special[i] = /[sStT]/.test(part[2])
  })
  return { special, who }
}

// Octal or symbolic, whichever the text is.
export function parseMode(text) {
  return fromOctal(text) ?? fromSymbolic(text)
}

// chmod's own symbolic syntax: u=rwx,g=rx,o=rx (plus u+s, g+s, +t for special bits).
export function toChmodSymbolic(mode) {
  const parts = CLASSES.map(([c]) => `${c}=${BITS.filter((_, i) => mode.who[c][i]).map(([b]) => b).join('')}`)
  const extra = []
  if (mode.special[0]) extra.push('u+s')
  if (mode.special[1]) extra.push('g+s')
  if (mode.special[2]) extra.push('+t')
  return [...parts, ...extra].join(',')
}

// Plain-English lines describing who can do what, plus warnings for risky modes.
export function explain(mode) {
  const verbs = ['read', 'write', 'execute']
  const lines = CLASSES.map(([c, label]) => {
    const can = verbs.filter((_, i) => mode.who[c][i])
    return `${label}: ${can.length ? can.join(', ') : 'no access'}`
  })
  const warnings = []
  if (mode.who.o[1]) warnings.push('Anyone on the system can modify this — rarely what you want outside /tmp-style directories with the sticky bit.')
  if (mode.special[0] && mode.who.u[2]) warnings.push('Set-UID: the program runs with the owner’s privileges. Audit it carefully if the owner is root.')
  if (mode.special[0] && !mode.who.u[2]) warnings.push('Capital S: set-UID without execute has no effect — probably a mistake.')
  return { lines, warnings }
}
