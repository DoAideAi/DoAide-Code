// The Content Security Policy builder (/tools/csp-generator): a policy as { directive: [sources] },
// presets, parsing and auditing an existing header, nonces and hashes, and server snippets.

export const DIRECTIVES = [
  ['default-src', 'Fallback for every fetch directive not listed'],
  ['script-src', 'JavaScript: <script>, inline handlers, eval'],
  ['style-src', 'Stylesheets and inline style'],
  ['img-src', 'Images and favicons'],
  ['font-src', 'Web fonts'],
  ['connect-src', 'fetch, XHR, WebSocket, EventSource'],
  ['media-src', '<audio> and <video>'],
  ['object-src', '<object> and <embed> plugins'],
  ['frame-src', 'Pages you embed in <iframe>'],
  ['worker-src', 'Web, shared and service workers'],
  ['manifest-src', 'Web app manifest'],
  ['base-uri', 'Allowed <base href> values'],
  ['form-action', 'Where forms may submit'],
  ['frame-ancestors', 'Who may embed this page (clickjacking)'],
]

export const KEYWORDS = ["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", 'data:', 'blob:', 'https:']

// Directives a <meta http-equiv> policy ignores.
export const META_IGNORED = ['frame-ancestors', 'report-uri', 'report-to', 'sandbox']

export const PRESETS = {
  strict: {
    label: 'Strict (nonce)',
    policy: {
      'default-src': ["'self'"],
      'script-src': ["'nonce-{NONCE}'", "'strict-dynamic'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:'],
      'object-src': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    },
    upgrade: true,
  },
  website: {
    label: 'Website + Google Fonts & Analytics',
    policy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://www.googletagmanager.com'],
      'style-src': ["'self'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https://www.google-analytics.com', 'https://www.googletagmanager.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https://www.google-analytics.com', 'https://*.google-analytics.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
    },
    upgrade: true,
  },
  spa: {
    label: 'Single-page app + API',
    policy: {
      'default-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'", 'https://api.example.com'],
      'manifest-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    },
    upgrade: true,
  },
}

// { policy, upgrade, reportUri } → 'default-src 'self'; …'. Empty directives are left out.
export function buildPolicy({ policy, upgrade = false, reportUri = '' }, { nonce = '', forMeta = false } = {}) {
  const parts = []
  for (const [name] of DIRECTIVES) {
    const sources = policy[name]
    if (!sources?.length) continue
    if (forMeta && META_IGNORED.includes(name)) continue
    parts.push(`${name} ${sources.map((s) => s.replace('{NONCE}', nonce || '{NONCE}')).join(' ')}`)
  }
  if (upgrade) parts.push('upgrade-insecure-requests')
  if (reportUri.trim() && !forMeta) parts.push(`report-uri ${reportUri.trim()}`)
  return parts.join('; ')
}

// Header text → { policy, upgrade, reportUri, other: [[name, sources]] }. Accepts the bare value
// or a full 'Content-Security-Policy: …' line.
export function parsePolicy(text) {
  const value = text.replace(/^\s*content-security-policy(-report-only)?\s*:/i, '').trim()
  const known = new Set(DIRECTIVES.map(([d]) => d))
  const out = { policy: {}, upgrade: false, reportUri: '', other: [] }
  for (const part of value.split(';')) {
    const [rawName, ...sources] = part.trim().split(/\s+/)
    if (!rawName) continue
    const name = rawName.toLowerCase()
    if (name === 'upgrade-insecure-requests') out.upgrade = true
    else if (name === 'report-uri') out.reportUri = sources.join(' ')
    else if (known.has(name)) out.policy[name] = sources
    else out.other.push([name, sources])
  }
  return out
}

// The effective sources for a fetch directive: its own list, else default-src's.
function effective(policy, name) {
  return policy[name] ?? (['base-uri', 'form-action', 'frame-ancestors'].includes(name) ? null : (policy['default-src'] ?? null))
}

// Findings for a parsed policy: [{ level: 'high' | 'medium' | 'info', text }].
export function auditPolicy({ policy, upgrade, other = [] }) {
  const out = []
  const add = (level, text) => out.push({ level, text })
  const script = effective(policy, 'script-src')
  if (!Object.keys(policy).length) add('high', 'No directives found — paste a policy like default-src \'self\'.')
  if (!script) add('high', 'No script-src or default-src: scripts from anywhere are allowed.')
  else {
    const hasNonceOrHash = script.some((s) => /^'(nonce|sha(256|384|512))-/.test(s))
    if (script.includes("'unsafe-inline'") && !hasNonceOrHash)
      add('high', "script-src allows 'unsafe-inline' — any injected <script> or onclick runs. Use nonces or hashes instead.")
    if (script.includes("'unsafe-eval'")) add('medium', "script-src allows 'unsafe-eval' — eval() and new Function() are permitted.")
    if (script.includes('*') || script.includes('https:') || script.includes('http:') || script.includes('data:'))
      add('high', 'script-src allows a wildcard, scheme or data: source — attackers can load scripts from hosts they control.')
    if (script.includes("'strict-dynamic'") && !hasNonceOrHash) add('medium', "'strict-dynamic' needs a nonce or hash to have any effect.")
  }
  for (const [name, sources] of Object.entries(policy)) {
    if (sources.some((s) => s.startsWith('http:'))) add('medium', `${name} allows plain http: sources, which can be tampered with in transit.`)
    if (sources.includes('*') && name !== 'img-src') add('medium', `${name} uses *, allowing any host.`)
    if (sources.includes("'none'") && sources.length > 1) add('info', `${name} combines 'none' with other sources; 'none' is ignored.`)
  }
  const obj = effective(policy, 'object-src')
  if (!obj || !obj.includes("'none'")) add('medium', "Set object-src 'none' — plugins can run script and are rarely needed.")
  if (!policy['base-uri']) add('medium', "Add base-uri 'self' (or 'none') so an injected <base> tag can't redirect relative script URLs.")
  if (!policy['frame-ancestors']) add('medium', "Add frame-ancestors 'none' or 'self' to stop clickjacking.")
  if (!policy['form-action']) add('info', "form-action isn't restricted; forms can post anywhere.")
  if (!upgrade) add('info', 'upgrade-insecure-requests is not set.')
  for (const [name] of other) add('info', `Unknown or unsupported directive: ${name}.`)
  return out
}

// A random base64 nonce (16 bytes) from the given crypto.
export function makeNonce(cryptoObj = globalThis.crypto) {
  const bytes = cryptoObj.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

// 'sha256-…' source for an inline script/style body, exactly as written between the tags.
export async function hashSource(content, subtle = globalThis.crypto?.subtle) {
  if (!subtle) throw new Error('Hashing needs a secure context (https or localhost).')
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(content))
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`
}

// The policy in each place it can be configured.
export function snippets(value, { reportOnly = false, metaValue = value } = {}) {
  const header = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
  const sq = value.replace(/'/g, "\\'")
  return [
    ['Header', `${header}: ${value}`],
    ['HTML meta', `<meta http-equiv="Content-Security-Policy" content="${metaValue.replace(/"/g, '&quot;')}">`],
    ['nginx', `add_header ${header} "${value}" always;`],
    ['Apache', `Header always set ${header} "${value}"`],
    ['Express', `app.use((req, res, next) => {\n  res.setHeader('${header}', '${sq}')\n  next()\n})`],
  ]
}
