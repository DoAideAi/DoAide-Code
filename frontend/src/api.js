const TOKEN_KEY = 'doaide-code-token'

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session just won't persist.
  }
}

async function post(path, body) {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!resp.ok) throw new Error(`${path} failed (${resp.status})`)
  return resp.json()
}

export async function fetchConfig() {
  const resp = await fetch('/api/config')
  return resp.ok ? resp.json() : { google_client_id: '', local_login: false }
}

export async function checkToken(token) {
  const resp = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
  return resp.ok
}

export const localLogin = () => post('/api/auth/local')
export const googleLogin = (credential) => post('/api/auth/google', { credential })

export function socketUrl(path, token) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}${path}?token=${encodeURIComponent(token)}`
}
