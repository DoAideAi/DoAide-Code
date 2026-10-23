import { OFFLINE_ERROR, requestError } from './errors.js'

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
  let resp
  try {
    resp = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // The browser's own text ("Failed to fetch", "Load failed") means nothing to people.
    throw new Error(OFFLINE_ERROR)
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    const error = new Error(requestError(resp.status, body.detail))
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

// Hub only: is the laptop agent connected now, and has one ever connected?
export const setupStatus = (token) => get('/api/v1/setup/status', token)

// Fetches the personalised installer (it needs the bearer token, so no plain link) and
// hands it to the browser as a download. Returns the saved file name.
export async function downloadInstaller(token, platform) {
  const resp = await fetch(`/api/v1/setup/installer?platform=${encodeURIComponent(platform)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) throw new Error(`Download failed (${resp.status})`)
  const disposition = resp.headers?.get?.('content-disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'DoAide-Code-Setup'
  const url = URL.createObjectURL(await resp.blob())
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return filename
}

export const localLogin = () => post('/api/auth/local')
export const googleLogin = (credential) => post('/api/auth/google', { credential })
export const refreshSession = (refresh) => post('/api/auth/refresh', { refresh_token: refresh })

// The laptop agent serves this same app locally; prompts typed there run at once, with no round
// trip through the server (which only keeps the phone in sync).
export const LOCAL_URL = 'http://127.0.0.1:3097'

// Is DoAide's local server running on this machine? Its URL, or null.
export async function probeLocal(url = LOCAL_URL) {
  try {
    const resp = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout?.(1500) })
    const body = resp.ok ? await resp.json() : null
    return body?.mode === 'local' ? url : null
  } catch {
    return null
  }
}

export function socketUrl(path, token) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}${path}?token=${encodeURIComponent(token)}`
}

// Usage dashboard: tokens and cost by day and model, and which model handled each task.
export function fetchModelComparison(token, days = 30) {
  return get(`/api/models/compare?days=${days}`, token)
}

// Benchmark results per model (this laptop's runs, else the published baseline).
export function fetchBenchmarks(token) {
  return get('/api/benchmarks', token)
}

// The latest Tasks API results (newest first): model, cost, response time, checks, escalation.
export function fetchTaskHistory(token, limit = 200) {
  return get(`/api/v1/tasks/history?limit=${limit}`, token)
}

export function fetchUsage(token, days = 7) {
  return get(`/api/usage?days=${days}&tz=${new Date().getTimezoneOffset()}`, token)
}

// Projects to switch between (in hub mode, the names the laptop reported).
export function fetchProjects(token) {
  return get('/api/projects', token)
}

// The active project's files, read-only: a folder's entries, and one file's text.
export function fetchFiles(token, path = '') {
  return get(`/api/files?path=${encodeURIComponent(path)}`, token)
}

// Files whose path matches `query`, best first: { files: [paths] } (the @ picker).
export function findFiles(token, query) {
  return get(`/api/files/find?q=${encodeURIComponent(query)}`, token)
}

export function fetchFile(token, path) {
  return get(`/api/file?path=${encodeURIComponent(path)}`, token)
}

// Messages containing `query` in any conversation, newest first: { results: [{ id, session_id,
// session_title, role, content (a snippet), created_at }] }.
export function searchConversations(token, query) {
  return get(`/api/search?q=${encodeURIComponent(query)}`, token)
}

// Multi-conversation support
export function fetchSessions(token, limit = 50) {
  return get(`/api/sessions?limit=${limit}`, token)
}

export function createSession(token) {
  return fetch('/api/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (!r.ok) throw new Error(`Create session failed (${r.status})`)
    return r.json()
  })
}

// Deletes a conversation and its messages; 409 while one of its replies is still running.
export async function deleteSession(token, sessionId) {
  let resp
  try {
    resp = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error(OFFLINE_ERROR)
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    const error = new Error(requestError(resp.status, body.detail))
    error.status = resp.status
    throw error
  }
  return resp.json()
}

// Messages older than `before` (a message id; null for the latest), oldest first: { messages, has_more }.
export function fetchEarlierMessages(token, sessionId, before, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', before)
  return get(`/api/sessions/${encodeURIComponent(sessionId)}/messages?${params}`, token)
}

export function switchSession(token, sessionId) {
  return get(`/api/session?session_id=${encodeURIComponent(sessionId)}`, token)
}
