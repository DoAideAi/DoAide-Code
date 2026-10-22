// Post-build step (same approach as DoAide Coach): renders each guide in
// guides/content.mjs to a static dist/guides/<slug>/index.html so crawlers get
// real HTML (the SPA only ships one index.html). public/serve.json routes
// /guides URLs to these files ahead of the SPA catch-all.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { guides, site } from '../guides/content.mjs'
import { pages } from '../pages/content.mjs'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const LINK = '#1d4ed8'

function page({ title, description, path, ogType = 'article', jsonLd, body }) {
  const url = `${site.url}${path}`
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="${site.color}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="${esc(site.name)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${site.url}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${site.url}/og-image.png" />
${jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n')}
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif;color:#1f2937;background:#f8fafc;line-height:1.7}
a{color:${LINK}}header{background:${site.color};color:#fff}header .in,footer .in,main{max-width:760px;margin:0 auto;padding:0 16px}
header .in{display:flex;justify-content:space-between;align-items:center;height:56px}header a{color:#fff;text-decoration:none;font-weight:700}
header nav a{font-weight:500;margin-left:16px;font-size:15px}main{padding-top:24px;padding-bottom:48px}
h1{font-size:30px;line-height:1.25;margin:8px 0 12px}h2{font-size:22px;margin-top:36px}h3{font-size:18px}
code{background:#eef2f7;border-radius:4px;padding:1px 5px;font-size:0.92em}
pre{background:#0f172a;color:#e2e8f0;border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:13.5px;line-height:1.6}pre code{background:none;padding:0;color:inherit;font-size:inherit}
.meta{color:#6b7280;font-size:14px}.toc{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 20px;margin:20px 0}
.toc ol{margin:6px 0;padding-left:20px}.cta{display:block;background:${site.color};color:#fff;text-align:center;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;margin:28px 0}
table{border-collapse:collapse;width:100%;background:#fff;font-size:15px;margin:12px 0;display:block;overflow-x:auto}th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;vertical-align:top}th{background:#f1f5f9}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin:12px 0}.card h2{margin:0 0 4px;font-size:19px}.card p{margin:0}
details{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;margin:8px 0}summary{font-weight:600;cursor:pointer}
footer{border-top:1px solid #e5e7eb;background:#fff;font-size:14px;color:#6b7280}footer .in{padding:20px 16px}
</style>
</head>
<body>
<header><div class="in"><a href="/">${esc(site.name)}</a><nav>${site.nav.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}</nav></div></header>
<main>
${body}
</main>
<footer><div class="in">${site.footer}</div></footer>
</body>
</html>
`
}

const crumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${site.url}${path}` })),
})

function write(path, html) {
  const file = join(dist, path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

for (const g of guides) {
  const path = `/guides/${g.slug}`
  const toc = g.sections.map(([id, heading]) => `<li><a href="#${id}">${esc(heading)}</a></li>`).join('')
  const sections = g.sections.map(([id, heading, html]) => `<h2 id="${id}">${esc(heading)}</h2>\n${html}`).join('\n')
  const faqHtml = g.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')
  const related = guides
    .filter((o) => o.slug !== g.slug)
    .map((o) => `<li><a href="/guides/${o.slug}">${esc(o.h1)}</a></li>`)
    .join('')
  const body = `<p class="meta"><a href="/guides">Guides</a> · Updated ${g.updated}</p>
<h1>${esc(g.h1)}</h1>
${g.intro}
<nav class="toc" aria-label="Contents"><strong>In this guide</strong><ol>${toc}<li><a href="#faq">FAQs</a></li></ol></nav>
${sections}
<a class="cta" href="${g.cta[0]}">${esc(g.cta[1])}</a>
<h2 id="faq">Frequently asked questions</h2>
${faqHtml}
<h2>More guides</h2>
<ul>${related}</ul>`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: g.h1,
      description: g.description,
      dateModified: g.updated,
      inLanguage: site.lang,
      mainEntityOfPage: `${site.url}${path}`,
      image: `${site.url}/og-image.png`,
      author: { '@type': 'Organization', name: 'DoAide', url: 'https://doaide.com' },
      publisher: { '@type': 'Organization', name: 'DoAide', url: 'https://doaide.com' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: g.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    crumbs([
      [site.name, '/'],
      ['Guides', '/guides'],
      [g.h1, path],
    ]),
  ]
  write(path, page({ title: g.title, description: g.description, path, jsonLd, body }))
}

const cards = guides
  .map((g) => `<div class="card"><h2><a href="/guides/${g.slug}">${esc(g.h1)}</a></h2><p>${esc(g.description)}</p></div>`)
  .join('\n')
write(
  '/guides',
  page({
    title: site.indexTitle,
    description: site.indexDescription,
    path: '/guides',
    ogType: 'website',
    jsonLd: [crumbs([[site.name, '/'], ['Guides', '/guides']])],
    body: `<h1>${esc(site.indexH1)}</h1>\n<p>${esc(site.indexDescription)}</p>\n${cards}\n<a class="cta" href="/tools">${esc(site.indexCta)}</a>`,
  }),
)

// Standalone landing pages (/vscode, /github, …): the body is full HTML (h1 included);
// FAQs double as JSON-LD so the questions can appear in search results.
for (const p of pages) {
  const path = `/${p.slug}`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: p.h1,
      description: p.description,
      dateModified: p.updated,
      inLanguage: site.lang,
      url: `${site.url}${path}`,
      publisher: { '@type': 'Organization', name: 'DoAide', url: 'https://doaide.com' },
    },
    crumbs([
      [site.name, '/'],
      [p.h1, path],
    ]),
  ]
  if (p.faqs?.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    })
  }
  write(path, page({ title: p.title, description: p.description, path, ogType: 'website', jsonLd, body: p.body }))
}

console.log(`build-guides: wrote ${guides.length} guides + index and ${pages.length} pages to dist`)
