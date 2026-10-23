// The bcrypt generator (/tools/bcrypt-generator): hashing and checking with bcryptjs (async, so
// the page stays responsive), plus parsing a hash into its version, cost, salt and checksum.

import bcrypt from 'bcryptjs'

export const MIN_COST = 4
export const MAX_COST = 15
const HASH_RE = /^\$(2[abxy]?)\$(\d{2})\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/

// UTF-8 length — bcrypt ignores everything past 72 bytes, and emoji count as 4.
export function byteLength(s) {
  return new TextEncoder().encode(s).length
}

// '$2b$10$<salt><checksum>' → { version, cost, salt, checksum } or null when malformed.
export function parseHash(hash) {
  const m = HASH_RE.exec(hash.trim())
  if (!m) return null
  const cost = Number(m[2])
  if (cost < MIN_COST || cost > 31) return null
  return { version: `$${m[1]}$`, cost, salt: m[3], checksum: m[4] }
}

// Hashes and reports how long it took: { hash, ms }.
export async function hashPassword(password, cost, now = () => performance.now()) {
  const start = now()
  const hash = await bcrypt.hash(password, cost)
  return { hash, ms: Math.round(now() - start) }
}

// true/false, or throws when the hash isn't a bcrypt hash.
export async function verifyPassword(password, hash) {
  if (!parseHash(hash)) throw new Error('Not a bcrypt hash — expected 60 characters like $2b$10$…')
  return bcrypt.compare(password, hash.trim())
}
