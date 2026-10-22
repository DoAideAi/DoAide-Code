// Snippet sharing: the code is stored on the server and the share URL is short (/s/<id>),
// unlike the #fragment links in codeTools.js, which carry the code itself and so cap its size.

import { OFFLINE_ERROR, requestError } from '../errors.js'

export const MAX_SNIPPET_CHARS = 20_000

// The snippet id in a path like /s/aB3xY9kQ; null for any other path.
export function snippetIdForPath(pathname) {
  return /^\/s\/([A-Za-z0-9]{6,12})$/.exec(pathname)?.[1] ?? null
}

// { id, url } for a fresh share link.
export async function createSnippet(code, language = '', title = '') {
  let resp
  try {
    resp = await fetch('/api/public/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, title }),
    })
  } catch {
    throw new Error(OFFLINE_ERROR)
  }
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(requestError(resp.status, body.detail))
  return body
}

// { id, code, language, title, views, created_at } for a stored snippet.
export async function fetchSnippet(id) {
  let resp
  try {
    resp = await fetch(`/api/public/snippets/${id}`)
  } catch {
    throw new Error(OFFLINE_ERROR)
  }
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(resp.status === 404 ? 'No snippet lives at this link.' : requestError(resp.status, body.detail))
  return body
}
