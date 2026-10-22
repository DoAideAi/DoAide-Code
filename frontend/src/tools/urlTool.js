// The URL encoder/decoder (/tools/url-encoder): percent-encode text for URLs, or decode it
// back. Component mode encodes everything reserved (for a query value); URL mode keeps a full
// address's structure (:/?#&=) intact. Runs in the page.

export const MAX_URL_CHARS = 100_000

// mode: 'component' (encodeURIComponent) or 'url' (encodeURI).
export function encodeUrl(text, mode = 'component') {
  return mode === 'url' ? encodeURI(text) : encodeURIComponent(text)
}

// Percent-decoding, with a clear error instead of a thrown URIError on a bad % sequence.
export function decodeUrl(text) {
  try {
    return { out: decodeURIComponent(text.replace(/\+/g, '%20')) }
  } catch {
    const at = text.match(/%(?![0-9a-f]{2})/i)
    return {
      error: at
        ? 'Not percent-encoded text: a % is not followed by two hex digits. To encode raw text, type in the left pane instead.'
        : 'Could not decode: the percent-encoding is malformed.',
    }
  }
}
