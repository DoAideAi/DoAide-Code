// The meta tag generator (/tools/meta-tag-generator): fill in a page's details, get the full
// <head> block — title, description, canonical, Open Graph, Twitter card. All in the browser.

export const TITLE_LIMIT = 60
export const DESC_LIMIT = 160

const esc = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export const OG_TYPES = ['website', 'article', 'product', 'profile']
export const TWITTER_CARDS = [
  ['summary_large_image', 'Large image'],
  ['summary', 'Small summary'],
]

// The generated <head> markup for the fields that are filled in.
export function buildMetaTags({ title = '', description = '', url = '', image = '', siteName = '', twitterHandle = '', ogType = 'website', twitterCard = 'summary_large_image' } = {}) {
  const t = title.trim()
  const d = description.trim()
  const u = url.trim()
  const img = image.trim()
  const lines = []
  if (t) lines.push(`<title>${esc(t)}</title>`)
  if (d) lines.push(`<meta name="description" content="${esc(d)}">`)
  if (u) lines.push(`<link rel="canonical" href="${esc(u)}">`)
  if (t || d || u || img) {
    lines.push('')
    lines.push('<!-- Open Graph (Facebook, LinkedIn, WhatsApp) -->')
    if (t) lines.push(`<meta property="og:title" content="${esc(t)}">`)
    if (d) lines.push(`<meta property="og:description" content="${esc(d)}">`)
    lines.push(`<meta property="og:type" content="${esc(ogType)}">`)
    if (u) lines.push(`<meta property="og:url" content="${esc(u)}">`)
    if (img) lines.push(`<meta property="og:image" content="${esc(img)}">`)
    if (siteName.trim()) lines.push(`<meta property="og:site_name" content="${esc(siteName.trim())}">`)
    lines.push('')
    lines.push('<!-- Twitter / X card -->')
    lines.push(`<meta name="twitter:card" content="${esc(twitterCard)}">`)
    if (t) lines.push(`<meta name="twitter:title" content="${esc(t)}">`)
    if (d) lines.push(`<meta name="twitter:description" content="${esc(d)}">`)
    if (img) lines.push(`<meta name="twitter:image" content="${esc(img)}">`)
    if (twitterHandle.trim()) {
      const handle = twitterHandle.trim().replace(/^@?/, '@')
      lines.push(`<meta name="twitter:site" content="${esc(handle)}">`)
    }
  }
  return lines.join('\n').trim()
}

// Length feedback for the title and description fields: fine, empty, or too long.
export function lengthHint(value, limit) {
  const n = value.trim().length
  if (!n) return { n, state: 'empty' }
  return { n, state: n > limit ? 'over' : 'ok' }
}
