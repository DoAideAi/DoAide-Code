// The cron expression editor (/tools/cron-builder): parse a 5-field cron expression (plus the
// @daily-style shortcuts), explain it in plain words, and compute the next run times — all in
// the page. Standard cron semantics, including the day-of-month OR day-of-week rule when both
// are restricted.

export const MAX_CRON_CHARS = 200

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_ALIASES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAY_ALIASES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const SHORTCUTS = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, aliases: MONTH_ALIASES, aliasBase: 1 },
  { name: 'day of week', min: 0, max: 7, aliases: DAY_ALIASES, aliasBase: 0 },
]

// One number in a field: a digit or a three-letter name. Throws with the field's name on junk.
function parseValue(text, spec) {
  if (spec.aliases) {
    const i = spec.aliases.indexOf(text.toLowerCase())
    if (i !== -1) return spec.aliasBase + i
  }
  if (!/^\d+$/.test(text)) throw new Error(`"${text}" is not a valid ${spec.name}.`)
  const n = Number(text)
  if (n < spec.min || n > spec.max) {
    throw new Error(`${spec.name} must be ${spec.min}–${spec.max}, got ${n}.`)
  }
  return n
}

// One field ("*/15", "1-5", "0,30", "mon-fri") into { set, any }. Day-of-week 7 counts as Sunday.
export function parseField(raw, spec) {
  const set = new Set()
  let any = true
  for (const part of raw.split(',')) {
    const m = part.match(/^([^/]+)(?:\/(\d+))?$/)
    if (!m || part === '') throw new Error(`"${part}" is not valid in the ${spec.name} field.`)
    const [, rangeText, stepText] = m
    const step = stepText ? Number(stepText) : 1
    if (step < 1) throw new Error(`Step /0 is not valid in the ${spec.name} field.`)
    let lo, hi
    if (rangeText === '*') {
      ;[lo, hi] = [spec.min, spec.max]
    } else if (rangeText.includes('-')) {
      const [a, b] = rangeText.split('-')
      ;[lo, hi] = [parseValue(a, spec), parseValue(b, spec)]
      if (lo > hi) throw new Error(`Range ${rangeText} is backwards in the ${spec.name} field.`)
      any = false
    } else {
      lo = hi = parseValue(rangeText, spec)
      if (stepText) hi = spec.max
      any = false
    }
    if (rangeText === '*' && stepText) any = false
    for (let v = lo; v <= hi; v += step) set.add(spec.name === 'day of week' && v === 7 ? 0 : v)
  }
  return { set, any }
}

// The whole expression. Returns { fields: [{ raw, set, any, ...spec }] } or { error }.
export function parseCron(expr) {
  const text = (SHORTCUTS[expr.trim().toLowerCase()] ?? expr).trim().replace(/\s+/g, ' ')
  if (!text) return { error: 'Type a cron expression, like */15 * * * *.' }
  const parts = text.split(' ')
  if (parts.length !== 5) {
    const hint = parts.length === 6 ? ' Six fields usually means a seconds field — drop it; this is classic 5-field cron.' : ''
    return { error: `A cron expression has 5 fields (minute hour day month weekday); this has ${parts.length}.${hint}` }
  }
  try {
    const fields = parts.map((raw, i) => ({ raw, ...FIELDS[i], ...parseField(raw, FIELDS[i]) }))
    return { fields }
  } catch (e) {
    return { error: e.message }
  }
}

const nameFor = (spec, v) =>
  spec.name === 'month' ? MONTH_NAMES[v - 1] : spec.name === 'day of week' ? DAY_NAMES[v % 7] : String(v)

// "1, 3 and 5" — an Oxford-free list.
function listPhrase(items) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// One field's contribution to the sentence, from its raw text (null when it adds nothing).
function fieldPhrase(raw, spec) {
  if (raw === '*') return null
  const parts = raw.split(',').map((part) => {
    const m = part.match(/^([^/]+)(?:\/(\d+))?$/)
    const [, rangeText, step] = m
    const unit = spec.name === 'minute' || spec.name === 'hour' ? ` ${spec.name}s` : ''
    if (rangeText === '*') return `every ${step}${unit || ` ${spec.name}s`}`
    if (rangeText.includes('-')) {
      const [a, b] = rangeText.split('-').map((t) => nameFor(spec, parseValue(t, spec)))
      return step ? `every ${step}${unit} from ${a} to ${b}` : `${a} to ${b}`
    }
    const v = nameFor(spec, parseValue(rangeText, spec))
    return step ? `every ${step}${unit} from ${v}` : v
  })
  return listPhrase(parts)
}

// The expression in plain words, like "At 09:00, Monday to Friday", or null when it won't parse.
export function describeCron(expr) {
  const parsed = parseCron(expr)
  if (parsed.error) return null
  const [min, hr, dom, mon, dow] = parsed.fields
  const pieces = []

  const two = (n) => String(n).padStart(2, '0')
  if (/^\d+$/.test(min.raw) && /^\d+$/.test(hr.raw)) {
    pieces.push(`At ${two(Number(hr.raw))}:${two(Number(min.raw))}`)
  } else if (/^\d+$/.test(min.raw) && hr.raw === '*') {
    pieces.push(`At minute ${Number(min.raw)} of every hour`)
  } else {
    const minPhrase = fieldPhrase(min.raw, min)
    pieces.push(min.raw === '*' ? 'Every minute' : minPhrase.startsWith('every') ? minPhrase : `At minute ${minPhrase}`)
    if (hr.raw !== '*') pieces.push(`past hour ${fieldPhrase(hr.raw, hr)}`)
  }
  if (dom.raw !== '*') pieces.push(`on day ${fieldPhrase(dom.raw, dom)} of the month`)
  if (dow.raw !== '*') pieces.push(`${dom.raw !== '*' ? 'and ' : ''}on ${fieldPhrase(dow.raw, dow)}`)
  if (mon.raw !== '*') pieces.push(`in ${fieldPhrase(mon.raw, mon)}`)

  const sentence = pieces.join(', ').replace(', past hour', ' past hour')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}

// Whether this date (to the minute) matches. Standard rule: when day-of-month and day-of-week
// are both restricted, either one matching is enough.
export function cronMatches(fields, date) {
  const [min, hr, dom, mon, dow] = fields
  if (!min.set.has(date.getMinutes()) || !hr.set.has(date.getHours()) || !mon.set.has(date.getMonth() + 1)) {
    return false
  }
  const domOk = dom.set.has(date.getDate())
  const dowOk = dow.set.has(date.getDay())
  if (dom.any && dow.any) return true
  if (dom.any) return dowOk
  if (dow.any) return domOk
  return domOk || dowOk
}

// The next `count` run times after `from` (never `from` itself), searching up to two years out.
export function nextRuns(expr, count = 5, from = new Date()) {
  const parsed = parseCron(expr)
  if (parsed.error) return []
  const runs = []
  const d = new Date(from)
  d.setSeconds(0, 0)
  const limit = 2 * 366 * 24 * 60
  for (let i = 0; i < limit && runs.length < count; i++) {
    d.setMinutes(d.getMinutes() + 1)
    if (cronMatches(parsed.fields, d)) runs.push(new Date(d))
  }
  return runs
}
