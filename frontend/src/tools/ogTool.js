// Open Graph preview: read og:/twitter: tags (and plain <title>/description fallbacks) out of
// pasted HTML, resolve what each platform would show, and flag what's missing or too long.

// { 'og:title': '…', 'twitter:card': '…', title: '…', description: '…' } from HTML source.
export function parseMeta(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tags = {}
  for (const el of doc.querySelectorAll('meta')) {
    const key = (el.getAttribute('property') || el.getAttribute('name') || '').trim().toLowerCase()
    const content = el.getAttribute('content')
    if (key && content != null && tags[key] === undefined) tags[key] = content.trim()
  }
  const title = doc.querySelector('title')?.textContent.trim()
  if (title) tags.title = title
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href')
  if (canonical) tags.canonical = canonical.trim()
  const icon = doc.querySelector('link[rel~="icon"]')?.getAttribute('href')
  if (icon) tags.icon = icon.trim()
  return tags
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// What a link card shows, with the usual fallback chain (og → twitter → plain HTML).
export function resolveCard(tags) {
  const url = tags['og:url'] || tags.canonical || ''
  return {
    title: tags['og:title'] || tags['twitter:title'] || tags.title || '',
    description: tags['og:description'] || tags['twitter:description'] || tags.description || '',
    image: tags['og:image'] || tags['og:image:url'] || tags['twitter:image'] || tags['twitter:image:src'] || '',
    imageAlt: tags['og:image:alt'] || tags['twitter:image:alt'] || '',
    url,
    host: hostOf(url),
    siteName: tags['og:site_name'] || hostOf(url),
    type: tags['og:type'] || '',
    twitterCard: tags['twitter:card'] || '',
    twitterTitle: tags['twitter:title'] || tags['og:title'] || tags.title || '',
    twitterDescription: tags['twitter:description'] || tags['og:description'] || tags.description || '',
    twitterImage: tags['twitter:image'] || tags['twitter:image:src'] || tags['og:image'] || '',
    imageWidth: Number(tags['og:image:width']) || 0,
    imageHeight: Number(tags['og:image:height']) || 0,
  }
}

const isAbsolute = (u) => /^https?:\/\//i.test(u)

// [{ level: 'error' | 'warn' | 'ok', text }] — the checks link-preview debuggers make.
export function checkTags(tags) {
  const card = resolveCard(tags)
  const out = []
  const need = (key, why) => (tags[key] ? out.push({ level: 'ok', text: `${key} is set` }) : out.push({ level: 'error', text: `Missing ${key} — ${why}` }))
  need('og:title', 'platforms fall back to <title>, which is often longer or branded.')
  need('og:description', 'without it some platforms show no summary at all.')
  need('og:image', 'cards without an image get far fewer clicks; use 1200×630.')
  need('og:url', 'tells platforms the canonical address so shares are counted together.')
  if (!tags['og:type']) out.push({ level: 'warn', text: 'Missing og:type — "website" or "article" is assumed.' })
  if (!tags['twitter:card']) out.push({ level: 'warn', text: 'Missing twitter:card — X shows a small summary card; use summary_large_image for a big image.' })
  if (card.title.length > 60) out.push({ level: 'warn', text: `Title is ${card.title.length} characters — most platforms cut off around 60.` })
  if (card.description.length > 160) out.push({ level: 'warn', text: `Description is ${card.description.length} characters — keep it under ~160 (Facebook shows about 110 on mobile).` })
  if (card.description && card.description.length < 50) out.push({ level: 'warn', text: 'Description is very short — 70–160 characters reads best.' })
  if (card.image && !isAbsolute(card.image)) out.push({ level: 'error', text: 'og:image must be an absolute https:// URL — crawlers do not resolve relative paths.' })
  if (card.image && /^http:\/\//i.test(card.image)) out.push({ level: 'warn', text: 'og:image uses http:// — some platforms only load https images.' })
  if (card.url && !isAbsolute(card.url)) out.push({ level: 'error', text: 'og:url must be an absolute URL.' })
  if (card.imageWidth && card.imageHeight) {
    const ratio = card.imageWidth / card.imageHeight
    if (card.imageWidth < 600) out.push({ level: 'warn', text: `Image is ${card.imageWidth}px wide — large cards need at least 600px (1200px is ideal).` })
    else if (Math.abs(ratio - 1.91) > 0.25) out.push({ level: 'warn', text: `Image ratio is ${ratio.toFixed(2)}:1 — 1.91:1 (1200×630) avoids cropping.` })
  }
  if (card.image && !card.imageAlt) out.push({ level: 'warn', text: 'No og:image:alt — screen reader users get no description of the image.' })
  return out
}

// Text clipped to n characters with an ellipsis, as the cards do.
export const clip = (text, n) => (text.length > n ? text.slice(0, n - 1).trimEnd() + '…' : text)

// Meta tags for the given fields, for copying back into a page.
export function metaTags({ title, description, image, url, siteName, type = 'website', twitterCard = 'summary_large_image' }) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const rows = [
    ['property', 'og:type', type],
    ['property', 'og:url', url],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:image', image],
    ['property', 'og:site_name', siteName],
    ['name', 'twitter:card', twitterCard],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image],
  ]
  return rows.filter(([, , v]) => v).map(([attr, key, v]) => `<meta ${attr}="${key}" content="${esc(v)}">`).join('\n')
}
