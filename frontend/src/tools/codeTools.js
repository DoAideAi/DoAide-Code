// The free code tools (no sign-in): one page per action, each its own URL for search engines.
// Answers come from /api/public/code-tool (Gemini on the server).

import { OFFLINE_ERROR, requestError } from '../errors.js'

export const SITE = 'https://code.doaide.com'

export const TOOLS = [
  {
    slug: 'explain-code',
    action: 'explain',
    label: 'Explain',
    title: 'Explain Code',
    heading: 'Explain any code, free',
    description: 'Paste code in any language and get a plain-English, step-by-step explanation. Free, no sign-up.',
    button: 'Explain',
  },
  {
    slug: 'code-review',
    action: 'review',
    label: 'Review',
    title: 'AI Code Review',
    heading: 'Free AI code review',
    description: 'Get a senior-engineer review of your code: correctness, security, performance and readability, with fixes. Free, no sign-up.',
    button: 'Review',
  },
  {
    slug: 'find-bugs',
    action: 'bugs',
    label: 'Find bugs',
    title: 'Find Bugs in Code',
    heading: 'Find bugs in your code',
    description: 'Paste a function and find the bugs: what breaks, the input that triggers it, and the fix. Free, no sign-up.',
    button: 'Find bugs',
  },
  {
    slug: 'add-comments',
    action: 'comments',
    label: 'Add comments',
    title: 'Add Comments to Code',
    heading: 'Add comments to your code',
    description: 'Paste code and get it back with clear comments that explain what it does and why. Free, no sign-up.',
    button: 'Add comments',
  },
  {
    slug: 'convert-code',
    action: 'convert',
    label: 'Convert',
    title: 'Convert Code',
    heading: 'Convert code between languages',
    description: 'Translate code from one programming language to another: Python to JavaScript, Java to Kotlin, and more. Free, no sign-up.',
    button: 'Convert',
    needsTarget: true,
  },
  {
    slug: 'optimize-code',
    action: 'optimize',
    label: 'Optimize',
    title: 'Optimize Code',
    heading: 'Optimize your code for performance',
    description: 'Paste code and get a faster version back, with each change explained: better algorithms first, micro-tweaks last. Free, no sign-up.',
    button: 'Optimize',
  },
  {
    slug: 'generate-docs',
    action: 'docs',
    label: 'Generate docs',
    title: 'Code Documentation Generator',
    heading: 'Generate documentation for your code',
    description:
      'Paste code and get it back with idiomatic documentation comments: JSDoc, Python docstrings, Javadoc or godoc, with parameters, return values and examples. Free, no sign-up.',
    button: 'Generate docs',
  },
  {
    slug: 'generate-tests',
    action: 'tests',
    label: 'Generate tests',
    title: 'Generate Unit Tests',
    heading: 'Generate unit tests for your code',
    description: 'Paste a function and get runnable unit tests: happy path, edge cases and error handling, in the idiomatic framework. Free, no sign-up.',
    button: 'Generate tests',
  },
]

export const LANGUAGES = [
  'Auto-detect', 'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C', 'C++', 'C#',
  'PHP', 'Ruby', 'Kotlin', 'Swift', 'SQL', 'Bash', 'HTML', 'CSS',
]

// What Convert can convert to: every language except Auto-detect.
export const TARGET_LANGUAGES = LANGUAGES.slice(1)

export const MAX_CODE_CHARS = 12_000
// Code carried in a share link; longer snippets are shared without it.
export const MAX_SHARED_CODE = 3000

// The tool for a path like /tools/find-bugs; /tools alone is the first.
export function toolForPath(pathname) {
  const slug = pathname.replace(/^\/tools\/?/, '').replace(/\/$/, '')
  return TOOLS.find((t) => t.slug === slug) ?? TOOLS[0]
}

export function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

// A link that opens the tool with this code filled in. The code rides in the #fragment, so it
// never reaches the server.
export function shareLink(tool, code, language = '') {
  const url = `${SITE}/tools/${tool.slug}`
  if (!code.trim() || code.length > MAX_SHARED_CODE) return url
  const lang = language && language !== LANGUAGES[0] ? `&lang=${encodeURIComponent(language)}` : ''
  return `${url}#code=${toBase64Url(code)}${lang}`
}

// The code and language from a share link's fragment; null when there is none (or it is garbled).
export function readShared(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const code = params.get('code')
  if (!code) return null
  try {
    return { code: fromBase64Url(code), language: params.get('lang') || '' }
  } catch {
    return null
  }
}

// A WhatsApp message with the start of the snippet and a link that opens it in the tool.
export function whatsappUrl(tool, code, language = '') {
  const lang = language && language !== LANGUAGES[0] ? `${language} ` : ''
  const lines = code.trim().split('\n')
  const preview = lines.slice(0, 12).join('\n').slice(0, 600)
  const more = preview.length < code.trim().length ? '\n…' : ''
  const text = `Check out this ${lang}code:\n\n\`\`\`\n${preview}${more}\n\`\`\`\n\n${tool.title}, free: ${shareLink(tool, code, language)}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export async function runTool(action, code, language = '', target = '') {
  let resp
  try {
    resp = await fetch('/api/public/code-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, code, language: language === LANGUAGES[0] ? '' : language, target }),
    })
  } catch {
    throw new Error(OFFLINE_ERROR)
  }
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(requestError(resp.status, body.detail))
  return body.answer
}

// How many snippets the tools have analyzed, ever; null when it cannot be fetched (the pages
// never wait for it or complain about it).
export async function fetchToolStats() {
  try {
    const resp = await fetch('/api/public/tool-stats')
    if (!resp.ok) return null
    const count = (await resp.json()).snippets
    return Number.isFinite(count) && count > 0 ? count : null
  } catch {
    return null
  }
}

// Title, description, canonical URL and JSON-LD for the tool on screen.
export function applyMeta(tool, doc = document) {
  doc.title = `${tool.title}: Free AI Tool | DoAide Code`
  const set = (selector, attr, value) => doc.querySelector(selector)?.setAttribute(attr, value)
  const url = `${SITE}/tools/${tool.slug}`
  set('meta[name="description"]', 'content', tool.description)
  set('meta[property="og:title"]', 'content', doc.title)
  set('meta[property="og:description"]', 'content', tool.description)
  set('meta[property="og:url"]', 'content', url)
  set('link[rel="canonical"]', 'href', url)
  // One WebApplication block per tool page, replaced (not stacked) when switching tools in place.
  let script = doc.querySelector('script[data-tool-jsonld]')
  if (!script) {
    script = doc.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-tool-jsonld', '')
    doc.head.appendChild(script)
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    description: tool.description,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'DoAide', url: 'https://doaide.com' },
  })
}
