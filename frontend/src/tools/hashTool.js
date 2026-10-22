// The hash generator (/tools/hash-generator): SHA digests of any text, computed with the
// browser's WebCrypto — nothing is uploaded. (No MD5: WebCrypto doesn't ship it, and for
// anything security-adjacent it shouldn't be used anyway.)

export const MAX_HASH_CHARS = 1_000_000

export const HASH_ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

// Hex digest of `text` under one algorithm.
export async function hashText(text, algo) {
  const bytes = new TextEncoder().encode(text)
  const digest = await globalThis.crypto.subtle.digest(algo, bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// All digests at once: { 'SHA-1': …, 'SHA-256': …, … }.
export async function hashAll(text) {
  const entries = await Promise.all(HASH_ALGOS.map(async (algo) => [algo, await hashText(text, algo)]))
  return Object.fromEntries(entries)
}
