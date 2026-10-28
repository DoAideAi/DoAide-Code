// Post-build step: the SPA ships one index.html, so every /tools/<slug> URL
// reached crawlers (and, since no tool sets document.title, browsers too) with
// the homepage title, description and canonical. This writes
// dist/tools/<slug>/index.html for each tool in codeTools.js + utilTools.js:
// the built shell with that tool's title, description, canonical, og/twitter
// tags, WebApplication JSON-LD and an <h1> (its visible heading), and routes
// each URL to its file in dist/serve.json ahead of the SPA's /tools/:slug
// catch-all, so unknown slugs still reach ToolsNotFound.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { site } from '../guides/content.mjs'
import { TOOLS } from '../src/tools/codeTools.js'
import { UTIL_TOOLS } from '../src/tools/utilTools.js'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const shell = readFileSync(join(dist, 'index.html'), 'utf8')

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// "<title> | DoAide Code" when it fits in ~70 chars, else the tool title alone.
export const toolTitle = (t) => (`${t.title} | DoAide Code`.length <= 70 ? `${t.title} | DoAide Code` : t.title)

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`)
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n  </head>`)
}

export function renderToolPage(html, tool) {
  const url = `${site.url}/tools/${tool.slug}`
  const title = toolTitle(tool)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    url,
    description: tool.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
  }
  let out = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`)
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      () => `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    )
    .replace('<div id="root"></div>', () => `<div id="root"><h1>${esc(tool.heading || tool.title)}</h1></div>`)
  for (const [attr, key, value] of [
    ['name', 'description', tool.description],
    ['property', 'og:title', title],
    ['property', 'og:description', tool.description],
    ['property', 'og:url', url],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', tool.description],
  ]) {
    out = setMeta(out, attr, key, value)
  }
  return out
}

export const allTools = [...TOOLS, ...UTIL_TOOLS]

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const tool of allTools) {
    const file = join(dist, 'tools', tool.slug, 'index.html')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, renderToolPage(shell, tool))
  }

  const servePath = join(dist, 'serve.json')
  const serve = JSON.parse(readFileSync(servePath, 'utf8'))
  const catchAll = serve.rewrites.findIndex((r) => r.source.startsWith('/tools/:slug'))
  const perTool = allTools.map((t) => ({ source: `/tools/${t.slug}`, destination: `/tools/${t.slug}/index.html` }))
  serve.rewrites.splice(catchAll === -1 ? serve.rewrites.length : catchAll, 0, ...perTool)
  writeFileSync(servePath, JSON.stringify(serve, null, 2) + '\n')

  console.log(`build-tool-pages: wrote ${allTools.length} tool pages to dist/tools`)
}
