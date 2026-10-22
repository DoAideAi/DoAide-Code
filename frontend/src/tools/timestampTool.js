// The timestamp converter (/tools/timestamp-converter): unix seconds or milliseconds, ISO 8601
// and RFC 2822 in and out, plus any IANA timezone. Runs in the page; nothing is uploaded.

// Reads a timestamp however it was pasted: a bare integer is unix time (seconds, or milliseconds
// when it is too large to be a plausible date in seconds — past ~5138 AD), anything else goes
// through Date.parse (ISO 8601, RFC 2822 and friends). Returns { ms, kind } or { error }.
export function parseTimestamp(text) {
  const t = text.trim()
  if (!t) return { error: 'Type a timestamp to convert.' }
  if (/^-?\d+$/.test(t)) {
    const n = Number(t)
    if (!Number.isSafeInteger(n)) return { error: 'That number is too large to be a timestamp.' }
    const seconds = Math.abs(n) < 1e11
    const ms = seconds ? n * 1000 : n
    if (!Number.isFinite(new Date(ms).getTime()) || Math.abs(ms) > 8.64e15)
      return { error: 'That number is outside the range a date can represent.' }
    return { ms, kind: seconds ? 'unix seconds' : 'unix milliseconds' }
  }
  const ms = Date.parse(t)
  if (Number.isNaN(ms)) return { error: 'Not a recognized date. Try unix seconds, ISO 8601 (2026-10-23T07:00:00Z) or RFC 2822.' }
  return { ms, kind: 'date string' }
}

// RFC 2822 day/month names (Date.toUTCString already matches, but we build offsets ourselves).
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0')

// Every representation of one instant: unix seconds/ms, ISO 8601 UTC, RFC 2822 UTC.
export function formatAll(ms) {
  const d = new Date(ms)
  return {
    unixSeconds: String(Math.floor(ms / 1000)),
    unixMs: String(ms),
    iso: d.toISOString(),
    rfc2822: `${DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`,
  }
}

// The instant rendered in one IANA timezone, like "23 Oct 2026, 12:30:00 IST".
export function inTimezone(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      hour12: false,
    }).format(new Date(ms))
  } catch {
    return ''
  }
}

// "In 3 hours" / "5 minutes ago" relative to `now`.
export function relativeTo(ms, now = Date.now()) {
  const diff = ms - now
  const abs = Math.abs(diff)
  const units = [
    [31557600000, 'year'],
    [2629800000, 'month'],
    [86400000, 'day'],
    [3600000, 'hour'],
    [60000, 'minute'],
    [1000, 'second'],
  ]
  for (const [size, name] of units) {
    if (abs >= size) {
      const n = Math.round(abs / size)
      return diff < 0 ? `${n} ${name}${n === 1 ? '' : 's'} ago` : `in ${n} ${name}${n === 1 ? '' : 's'}`
    }
  }
  return 'now'
}

// Every IANA zone the browser knows, or a useful shortlist where supportedValuesOf is missing.
export function timezones() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      // The canonical list leaves out plain UTC, which people reach for first.
      const list = Intl.supportedValuesOf('timeZone')
      return list.includes('UTC') ? list : ['UTC', ...list]
    } catch {
      // Fall through.
    }
  }
  return ['UTC', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney']
}

// The browser's own zone, always present in the picker.
export function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
