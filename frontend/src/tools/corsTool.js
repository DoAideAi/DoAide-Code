// The CORS tester (/tools/cors-tester): runs the browser's CORS checks from the Fetch spec on a
// described request and pasted response headers — no network — and writes server configs.

const SAFE_METHODS = ['GET', 'HEAD', 'POST']
const SAFE_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain']
const SAFE_REQUEST_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type', 'range']
// Headers the browser sets itself; a page can't send them, so they never trigger a preflight.
const FORBIDDEN = ['accept-charset', 'accept-encoding', 'connection', 'content-length', 'cookie', 'host', 'origin', 'referer', 'user-agent', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'via', 'keep-alive', 'date', 'expect']
export const SAFE_RESPONSE_HEADERS = ['cache-control', 'content-language', 'content-length', 'content-type', 'expires', 'last-modified', 'pragma']

// 'Name: value' lines → { status, headers: Map(lower-name → value) }. A status line such as
// 'HTTP/2 204' sets status; repeated headers are joined with ', ' as HTTP does.
export function parseHeaders(text) {
  const headers = new Map()
  let status = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const st = /^HTTP\/[\d.]+\s+(\d{3})/i.exec(line)
    if (st) {
      status = Number(st[1])
      continue
    }
    const at = line.indexOf(':')
    if (at <= 0) continue
    const name = line.slice(0, at).trim().toLowerCase()
    const value = line.slice(at + 1).trim()
    headers.set(name, headers.has(name) ? `${headers.get(name)}, ${value}` : value)
  }
  return { status, headers }
}

const list = (v) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

// Request header names that need the server's permission (not safelisted, not forbidden).
export function unsafeHeaders(requestHeaders) {
  const out = []
  for (const [name, value] of requestHeaders) {
    if (FORBIDDEN.includes(name) || name.startsWith('sec-') || name.startsWith('proxy-')) continue
    if (!SAFE_REQUEST_HEADERS.includes(name)) out.push(name)
    else if (name === 'content-type' && !SAFE_CONTENT_TYPES.includes(value.split(';')[0].trim().toLowerCase())) out.push(name)
  }
  return out
}

// Why a preflight is sent, or [] for a simple request.
export function preflightReasons(method, requestHeaders) {
  const reasons = []
  if (!SAFE_METHODS.includes(method)) reasons.push(`the method ${method} is not GET, HEAD or POST`)
  for (const h of unsafeHeaders(requestHeaders)) {
    reasons.push(h === 'content-type' ? `Content-Type ${requestHeaders.get('content-type')} is not form, multipart or text/plain` : `the ${h} header is not CORS-safelisted`)
  }
  return reasons
}

// The Access-Control-Allow-Origin (+ credentials) check, shared by preflight and response.
function originChecks(headers, origin, credentials, label) {
  const steps = []
  const acao = headers.get('access-control-allow-origin')
  if (acao === undefined) {
    steps.push({ ok: false, text: `${label}: no Access-Control-Allow-Origin header is present.` })
    return steps
  }
  if (acao.includes(',')) steps.push({ ok: false, text: `${label}: Access-Control-Allow-Origin contains multiple values '${acao}', but only one is allowed.` })
  else if (acao === '*') {
    if (credentials) steps.push({ ok: false, text: `${label}: Access-Control-Allow-Origin must not be the wildcard '*' when the request's credentials mode is 'include'.` })
    else steps.push({ ok: true, text: `${label}: Access-Control-Allow-Origin is *, which allows any origin without credentials.` })
  } else if (acao !== origin) steps.push({ ok: false, text: `${label}: Access-Control-Allow-Origin has the value '${acao}', which is not equal to the origin '${origin}'.` })
  else steps.push({ ok: true, text: `${label}: Access-Control-Allow-Origin matches ${origin}.` })
  if (credentials) {
    const acac = headers.get('access-control-allow-credentials')
    if (acac !== 'true') steps.push({ ok: false, text: `${label}: Access-Control-Allow-Credentials is '${acac ?? ''}', but it must be 'true' when credentials are included.` })
    else steps.push({ ok: true, text: `${label}: Access-Control-Allow-Credentials is true.` })
  }
  return steps
}

// Runs the check. Returns { crossOrigin, preflight: reasons[], steps: [{ ok, text }], allowed,
// notes: string[] }. `preflightText` defaults to the response headers when left empty.
export function checkCors({ origin, url, method = 'GET', requestHeaders = '', credentials = false, responseText = '', preflightText = '' }) {
  const m = method.trim().toUpperCase() || 'GET'
  let target
  let pageOrigin
  try {
    target = new URL(url)
    pageOrigin = new URL(origin).origin
  } catch {
    return { error: 'Enter a full origin (https://app.example.com) and request URL.' }
  }
  if (target.origin === pageOrigin) return { crossOrigin: false, preflight: [], steps: [{ ok: true, text: 'Same origin — CORS does not apply.' }], allowed: true, notes: [] }

  const reqHeaders = parseHeaders(requestHeaders).headers
  const preflight = preflightReasons(m, reqHeaders)
  const response = parseHeaders(responseText)
  const steps = []
  const notes = []

  if (preflight.length) {
    const pf = preflightText.trim() ? parseHeaders(preflightText) : response
    if (pf.status !== null && (pf.status < 200 || pf.status > 299)) steps.push({ ok: false, text: `Preflight: the OPTIONS response has status ${pf.status}; it must be 2xx (usually 204).` })
    steps.push(...originChecks(pf.headers, pageOrigin, credentials, 'Preflight'))
    if (!SAFE_METHODS.includes(m)) {
      const methods = list(pf.headers.get('access-control-allow-methods')).map((x) => x.toUpperCase())
      const ok = methods.includes(m) || (methods.includes('*') && !credentials)
      steps.push({
        ok,
        text: ok
          ? `Preflight: Access-Control-Allow-Methods allows ${m}.`
          : `Preflight: method ${m} is not allowed by Access-Control-Allow-Methods${methods.length ? ` (${methods.join(', ')})` : ' (missing)'}${methods.includes('*') ? ' — * does not apply to credentialed requests' : ''}.`,
      })
    }
    const allowedHeaders = list(pf.headers.get('access-control-allow-headers')).map((x) => x.toLowerCase())
    for (const h of unsafeHeaders(reqHeaders)) {
      const star = allowedHeaders.includes('*') && !credentials && h !== 'authorization'
      const ok = allowedHeaders.includes(h) || star
      steps.push({
        ok,
        text: ok
          ? `Preflight: request header ${h} is allowed.`
          : `Preflight: request header field ${h} is not allowed by Access-Control-Allow-Headers${h === 'authorization' && allowedHeaders.includes('*') ? ' — * never covers Authorization; list it explicitly' : ''}.`,
      })
    }
    const maxAge = pf.headers.get('access-control-max-age')
    notes.push(maxAge ? `The preflight result is cached for ${maxAge} seconds (Chrome caps it at 7200).` : 'No Access-Control-Max-Age: the browser repeats the preflight almost every time (Chrome caches 5 s by default).')
  }

  if (steps.every((s) => s.ok)) steps.push(...originChecks(response.headers, pageOrigin, credentials, 'Response'))

  const allowed = steps.every((s) => s.ok)
  const acao = response.headers.get('access-control-allow-origin')
  if (acao && acao !== '*' && !list(response.headers.get('vary')).some((v) => v.toLowerCase() === 'origin' || v === '*'))
    notes.push('Add Vary: Origin — the response echoes a specific origin, so caches must not serve it to other origins.')
  const exposed = list(response.headers.get('access-control-expose-headers')).map((h) => h.toLowerCase())
  const hidden = [...response.headers.keys()].filter((h) => !h.startsWith('access-control-') && !SAFE_RESPONSE_HEADERS.includes(h) && !exposed.includes(h) && !(exposed.includes('*') && !credentials))
  if (allowed && hidden.length) notes.push(`JavaScript can't read these response headers unless they are in Access-Control-Expose-Headers: ${hidden.join(', ')}.`)
  return { crossOrigin: true, preflight, steps, allowed, notes }
}

// --- config generator -------------------------------------------------------------------------

const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// { origins: string[] ('*' for any), methods, headers, expose, credentials, maxAge } → [[label, code]].
export function corsConfigs({ origins, methods, headers, expose = [], credentials = false, maxAge = 600 }) {
  const any = origins.includes('*')
  const m = methods.join(', ')
  const h = headers.join(', ')
  const out = []

  const nginxHeaders = [
    `add_header Access-Control-Allow-Origin ${any && !credentials ? '*' : '$cors_origin'} always;`,
    ...(any && !credentials ? [] : ['add_header Vary Origin always;']),
    ...(credentials ? ['add_header Access-Control-Allow-Credentials true always;'] : []),
    ...(expose.length ? [`add_header Access-Control-Expose-Headers "${expose.join(', ')}" always;`] : []),
  ]
  const nginxMap = any
    ? '# in the http { } block (e.g. /etc/nginx/conf.d/cors-map.conf)\nmap $http_origin $cors_origin {\n    default $http_origin;\n}\n\n'
    : `# in the http { } block (e.g. /etc/nginx/conf.d/cors-map.conf)\nmap $http_origin $cors_origin {\n    default "";\n${origins.map((o) => `    "${o}" $http_origin;`).join('\n')}\n}\n\n`
  out.push([
    'nginx',
    `${any && !credentials ? '' : nginxMap}location /api/ {\n    if ($request_method = OPTIONS) {\n        ${nginxHeaders.join('\n        ')}\n        add_header Access-Control-Allow-Methods "${m}" always;\n        add_header Access-Control-Allow-Headers "${h}" always;\n        add_header Access-Control-Max-Age ${maxAge} always;\n        return 204;\n    }\n    ${nginxHeaders.join('\n    ')}\n    proxy_pass http://127.0.0.1:3000;\n}`,
  ])

  const jsOrigin = any ? (credentials ? 'true' : "'*'") : `[${origins.map((o) => `'${o}'`).join(', ')}]`
  out.push([
    'Express',
    `// npm install cors\nconst cors = require('cors')\n\napp.use(cors({\n  origin: ${jsOrigin},\n  methods: [${methods.map((x) => `'${x}'`).join(', ')}],\n  allowedHeaders: [${headers.map((x) => `'${x}'`).join(', ')}],\n${expose.length ? `  exposedHeaders: [${expose.map((x) => `'${x}'`).join(', ')}],\n` : ''}  credentials: ${credentials},\n  maxAge: ${maxAge},\n}))`,
  ])

  const py = (a) => `[${a.map((x) => `"${x}"`).join(', ')}]`
  out.push([
    'FastAPI',
    `from fastapi.middleware.cors import CORSMiddleware\n\napp.add_middleware(\n    CORSMiddleware,\n    ${any && credentials ? 'allow_origin_regex=r"https?://.*"' : `allow_origins=${py(origins)}`},\n    allow_credentials=${credentials ? 'True' : 'False'},\n    allow_methods=${py(methods)},\n    allow_headers=${py(headers)},\n${expose.length ? `    expose_headers=${py(expose)},\n` : ''}    max_age=${maxAge},\n)`,
  ])

  const originRe = any ? '.+' : origins.map(re).join('|')
  out.push([
    'Apache',
    `# needs mod_headers and mod_rewrite\nSetEnvIf Origin "^(${originRe})$" CORS_ORIGIN=$0\nHeader always set Access-Control-Allow-Origin %{CORS_ORIGIN}e env=CORS_ORIGIN\nHeader always merge Vary Origin\n${credentials ? 'Header always set Access-Control-Allow-Credentials "true" env=CORS_ORIGIN\n' : ''}Header always set Access-Control-Allow-Methods "${m}" env=CORS_ORIGIN\nHeader always set Access-Control-Allow-Headers "${h}" env=CORS_ORIGIN\n${expose.length ? `Header always set Access-Control-Expose-Headers "${expose.join(', ')}" env=CORS_ORIGIN\n` : ''}Header always set Access-Control-Max-Age "${maxAge}" env=CORS_ORIGIN\n\nRewriteEngine On\nRewriteCond %{REQUEST_METHOD} OPTIONS\nRewriteRule ^(.*)$ $1 [R=204,L]`,
  ])
  return out
}
