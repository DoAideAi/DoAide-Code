// The API response mocker: endpoint definitions are checked here, then stored on the server,
// which serves them at /api/mock/<id>/<path> to any client, from any origin.

import { OFFLINE_ERROR, requestError } from '../errors.js'

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY']
export const MAX_ENDPOINTS = 20
export const MAX_BODY_CHARS = 50_000
export const MAX_DELAY_MS = 5000

export const STARTER = [
  {
    method: 'GET',
    path: '/users',
    status: 200,
    delay_ms: 0,
    content_type: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Asha' }, { id: 2, name: 'Ravi' }], null, 2),
  },
  {
    method: 'GET',
    path: '/users/:id',
    status: 200,
    delay_ms: 0,
    content_type: 'application/json',
    body: '{\n  "id": "{{id}}",\n  "name": "Asha"\n}',
  },
  {
    method: 'POST',
    path: '/users',
    status: 201,
    delay_ms: 300,
    content_type: 'application/json',
    body: '{\n  "id": 3,\n  "created": true\n}',
  },
]

export function blankEndpoint() {
  return { method: 'GET', path: '/', status: 200, delay_ms: 0, content_type: 'application/json', body: '{}' }
}

const normalPath = (path) => '/' + path.split('/').filter(Boolean).join('/')

// "/users/:id" with a stand-in value for every :param, so the URL can be opened as-is.
export function samplePath(path) {
  return normalPath(path).replace(/\/:\w+/g, '/1')
}

// The first problem with one endpoint, or null. Mirrors the server's checks so mistakes show
// before anything is sent; the JSON check is advice only (the server accepts any text).
export function endpointProblem(ep) {
  const segs = ep.path.split('/').filter(Boolean)
  if (!segs.every((s) => /^(:[A-Za-z_]\w*|[A-Za-z0-9._~!$&'()*+,;=@-]+)$/.test(s)))
    return 'Paths may use letters, digits, - _ . and :params only.'
  const status = Number(ep.status)
  if (!Number.isInteger(status) || status < 100 || status > 599) return 'Status must be 100–599.'
  const delay = Number(ep.delay_ms)
  if (!Number.isInteger(delay) || delay < 0 || delay > MAX_DELAY_MS) return `Delay must be 0–${MAX_DELAY_MS} ms.`
  if (ep.body.length > MAX_BODY_CHARS) return `Body is over ${MAX_BODY_CHARS.toLocaleString()} characters.`
  return null
}

// A JSON body that doesn't parse (ignoring {{param}} placeholders) — worth a warning, not a block.
export function jsonWarning(ep) {
  if (!ep.content_type.includes('json') || !ep.body.trim()) return null
  try {
    JSON.parse(ep.body.replace(/\{\{\s*\w+\s*\}\}/g, '0'))
    return null
  } catch (e) {
    return `Body isn't valid JSON: ${e.message}`
  }
}

// The index of an earlier endpoint with the same method and path as endpoint i, or -1.
export function duplicateOf(endpoints, i) {
  const { method, path } = endpoints[i]
  return endpoints.findIndex((ep, j) => j < i && ep.method === method && normalPath(ep.path) === normalPath(path))
}

export function curlFor(baseUrl, ep) {
  const method = ep.method === 'ANY' ? 'GET' : ep.method
  const url = baseUrl + samplePath(ep.path)
  if (method === 'GET') return `curl ${url}`
  const data = ['POST', 'PUT', 'PATCH'].includes(method) ? ` -H 'Content-Type: application/json' -d '{}'` : ''
  return `curl -X ${method} ${url}${data}`
}

export function fetchSnippetFor(baseUrl, ep) {
  const method = ep.method === 'ANY' ? 'GET' : ep.method
  const url = baseUrl + samplePath(ep.path)
  const opts = method === 'GET' ? '' : `, { method: '${method}' }`
  return `const res = await fetch('${url}'${opts})\nconst data = await res.json()`
}

async function call(path, init) {
  let resp
  try {
    resp = await fetch(path, init)
  } catch {
    throw new Error(OFFLINE_ERROR)
  }
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(resp.status === 404 ? 'No mock API lives at this link.' : requestError(resp.status, body.detail))
  return body
}

// { id, url } for a freshly stored mock.
export function createMock(name, endpoints) {
  const clean = endpoints.map((ep) => ({ ...ep, status: Number(ep.status), delay_ms: Number(ep.delay_ms) }))
  return call('/api/public/mocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, endpoints: clean }),
  })
}

// { id, name, endpoints, hits } for a stored mock.
export function fetchMock(id) {
  if (!/^[A-Za-z0-9]{6,12}$/.test(id)) return Promise.reject(new Error('No mock API lives at this link.'))
  return call(`/api/public/mocks/${id}`)
}
