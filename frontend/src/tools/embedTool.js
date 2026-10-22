// The embeddable widget (/tools/embed-code): builds an iframe snippet for blogs and docs.
// The code rides in the iframe URL's #fragment (like share links), so it never reaches the
// server; the static /embed page renders it read-only with a button into the AI tools.

import { SITE, TOOLS, toBase64Url } from './codeTools.js'

// Fragments much longer than this make unwieldy snippets (and some CMSs truncate them).
export const MAX_EMBED_CODE = 3000

// What the embed's button opens: any of the AI tools.
export const EMBED_ACTIONS = TOOLS.map((t) => ({ slug: t.slug, label: t.title }))

// The /embed URL carrying this code. `language` is '' for auto-detect.
export function embedUrl(code, language = '', toolSlug = EMBED_ACTIONS[0].slug) {
  const lang = language ? `&lang=${encodeURIComponent(language)}` : ''
  return `${SITE}/embed#code=${toBase64Url(code)}${lang}&tool=${toolSlug}`
}

// A height that fits the code (top bar + lines + footer), clamped so an embed never
// swallows the host page.
export function embedHeight(code) {
  const lines = code.split('\n').length
  return Math.max(180, Math.min(520, 104 + lines * 21))
}

// The copy-paste iframe snippet.
export function embedSnippet(code, language = '', toolSlug = EMBED_ACTIONS[0].slug) {
  const url = embedUrl(code, language, toolSlug)
  return (
    `<iframe src="${url}"\n` +
    `  style="width:100%;max-width:760px;height:${embedHeight(code)}px;border:1px solid #27272a;border-radius:12px"\n` +
    `  loading="lazy" title="Code snippet - DoAide Code"></iframe>`
  )
}
