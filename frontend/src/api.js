const TOKEN_KEY = 'doaide-code-token'
// Never-expiring refresh token: trades for a fresh access token so sign-in is one-time.
const REFRESH_KEY = 'doaide-code-refresh'

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage can be unavailable (private mode); the session just won't persist.
  }
}

export function loadSession() {
  return { token: read(TOKEN_KEY), refresh: read(REFRESH_KEY) }
}

// Pass `refresh: undefined` to keep the stored refresh token; null clears it.
export function saveSession({ token, refresh }) {
  write(TOKEN_KEY, token)
  if (refresh !== undefined) write(REFRESH_KEY, refresh)
}

export function clearSession() {
  write(TOKEN_KEY, null)
  write(REFRESH_KEY, null)
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

async function get(path, token) {
  const resp = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    const error = new Error(body.detail || `Request failed (${resp.status})`)
    error.status = resp.status
    throw error
  }
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

export async function createAgentToken(token) {
  const resp = await fetch('/api/agent-token', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  if (!resp.ok) throw new Error(`/api/agent-token failed (${resp.status})`)
  return resp.json()
}

export const localLogin = () => post('/api/auth/local')
export const googleLogin = (credential) => post('/api/auth/google', { credential })
export const refreshSession = (refresh) => post('/api/auth/refresh', { refresh_token: refresh })

export const listFiles = (token, path = '') => get(`/api/files?path=${encodeURIComponent(path)}`, token)
export const readFile = (token, path) => get(`/api/file?path=${encodeURIComponent(path)}`, token)
export const listSessions = (token) => get('/api/sessions', token)

export function socketUrl(path, token) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}${path}?token=${encodeURIComponent(token)}`
}
