// The web performance audit (/tools/performance-audit): paste a page's HTML and get the Core Web
// Vitals problems visible in the markup — render-blocking scripts, unsized images, missing lazy
// loading, font and preconnect gaps — plus what already looks right. Static analysis in the
// browser; nothing is uploaded.

export const MAX_HTML_INPUT = 1_000_000

const WEIGHTS = { high: 15, medium: 8, low: 3 }

// Each check returns a finding ({severity, title, detail}) or null when it passes; `passed` is
// what we say when it does. Checks that do not apply return undefined and are left out entirely.
const CHECKS = [
  {
    passed: 'Viewport meta tag present',
    run(doc) {
      if (doc.querySelector('meta[name="viewport"]')) return null
      return {
        severity: 'high',
        title: 'No viewport meta tag',
        detail: 'Without <meta name="viewport" content="width=device-width, initial-scale=1">, phones render the desktop layout and scale it down — text is unreadable and INP suffers from mis-sized tap targets.',
      }
    },
  },
  {
    passed: 'No render-blocking scripts in <head>',
    run(doc) {
      const blocking = [...doc.querySelectorAll('head script[src]')].filter((s) => !s.defer && !s.async && s.type !== 'module')
      if (!blocking.length) return null
      return {
        severity: 'high',
        title: `${blocking.length} render-blocking script${blocking.length > 1 ? 's' : ''} in <head>`,
        detail: 'Scripts in <head> without defer or async stop HTML parsing while they download and run, delaying First Contentful Paint and LCP. Add defer (keeps order, runs after parse) or move them before </body>.',
      }
    },
  },
  {
    passed: 'No document.write',
    run(doc, html) {
      if (!/document\.write\s*\(/.test(html)) return null
      return {
        severity: 'high',
        title: 'document.write in use',
        detail: 'document.write blocks parsing and can throw the whole page back to a blank state; browsers may ignore it on slow connections. Replace it with DOM insertion.',
      }
    },
  },
  {
    passed: 'All images have width and height',
    run(doc) {
      const imgs = [...doc.querySelectorAll('img')]
      if (!imgs.length) return undefined
      const unsized = imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height'))
      if (!unsized.length) return null
      return {
        severity: 'medium',
        title: `${unsized.length} of ${imgs.length} images missing width/height`,
        detail: 'Images without width and height attributes reserve no space, so the layout jumps when they load — the main cause of bad Cumulative Layout Shift. Set both (CSS can still override the display size).',
      }
    },
  },
  {
    passed: 'Images use lazy loading',
    run(doc) {
      const imgs = [...doc.querySelectorAll('img')]
      if (imgs.length < 3) return undefined
      const eager = imgs.filter((i) => i.getAttribute('loading') !== 'lazy')
      if (eager.length <= 1) return null
      return {
        severity: 'medium',
        title: `${eager.length} of ${imgs.length} images load eagerly`,
        detail: 'loading="lazy" defers offscreen images until the user scrolls near them, cutting initial bandwidth and speeding up LCP. Keep only the above-the-fold hero image eager (ideally with fetchpriority="high").',
      }
    },
  },
  {
    passed: 'No CSS @import',
    run(doc, html) {
      if (!/@import\s/.test(html)) return null
      return {
        severity: 'medium',
        title: 'CSS @import in use',
        detail: '@import loads stylesheets sequentially — each one only starts downloading after its parent arrives. Replace with parallel <link rel="stylesheet"> tags or bundle the CSS.',
      }
    },
  },
  {
    passed: 'Iframes are lazy',
    run(doc) {
      const frames = [...doc.querySelectorAll('iframe')]
      if (!frames.length) return undefined
      const eager = frames.filter((f) => f.getAttribute('loading') !== 'lazy')
      if (!eager.length) return null
      return {
        severity: 'medium',
        title: `${eager.length} iframe${eager.length > 1 ? 's' : ''} without loading="lazy"`,
        detail: 'Embeds (YouTube, maps, widgets) are usually the heaviest things on a page. loading="lazy" on the iframe defers all of it until scrolled into view.',
      }
    },
  },
  {
    passed: 'Web fonts swap while loading',
    run(doc) {
      const fonts = [...doc.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')]
      if (!fonts.length) return undefined
      const noSwap = fonts.filter((f) => !f.getAttribute('href').includes('display=swap'))
      if (!noSwap.length) return null
      return {
        severity: 'low',
        title: 'Google Fonts without display=swap',
        detail: 'Without &display=swap in the fonts URL, text can stay invisible while the font downloads (a flash of invisible text). With it, a fallback shows immediately.',
      }
    },
  },
  {
    passed: 'External origins are preconnected',
    run(doc) {
      const origins = new Set()
      for (const el of doc.querySelectorAll('link[rel="stylesheet"][href^="http"], script[src^="http"]')) {
        try {
          origins.add(new URL(el.getAttribute('href') || el.getAttribute('src')).origin)
        } catch {
          /* relative or malformed */
        }
      }
      if (!origins.size) return undefined
      const pre = new Set(
        [...doc.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]')].map((l) => {
          try {
            return new URL(l.getAttribute('href'), 'https://x').origin
          } catch {
            return null
          }
        })
      )
      const missing = [...origins].filter((o) => !pre.has(o))
      if (!missing.length) return null
      return {
        severity: 'low',
        title: `No preconnect for ${missing.length} external origin${missing.length > 1 ? 's' : ''}`,
        detail: `Each new origin costs a DNS lookup + TCP + TLS handshake before the first byte. Add <link rel="preconnect" href="…"> for: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}.`,
      }
    },
  },
  {
    passed: 'No huge inline base64 images',
    run(doc) {
      const big = [...doc.querySelectorAll('img[src^="data:"]')].filter((i) => i.getAttribute('src').length > 13_000)
      if (!big.length) return null
      return {
        severity: 'medium',
        title: `${big.length} large base64-inlined image${big.length > 1 ? 's' : ''}`,
        detail: 'Base64 inlining adds ~33% to the bytes and the data blocks the HTML itself from parsing sooner. Inline only icons under ~2 KB; serve the rest as cacheable files.',
      }
    },
  },
  {
    passed: 'Charset declared',
    run(doc, html) {
      if (/<meta[^>]+charset/i.test(html)) return null
      return {
        severity: 'low',
        title: 'No charset meta tag',
        detail: 'Declare <meta charset="utf-8"> as the first thing in <head>; without it the browser may buffer or re-parse while sniffing the encoding.',
      }
    },
  },
  {
    passed: 'DOM size is reasonable',
    run(doc) {
      const count = doc.querySelectorAll('*').length
      if (count <= 1500) return null
      return {
        severity: 'medium',
        title: `Large DOM: ${count.toLocaleString()} elements`,
        detail: 'Beyond ~1,500 elements, style recalculation and layout slow down and INP suffers. Virtualize long lists and drop wrapper divs that only exist for styling.',
      }
    },
  },
]

// Static HTML in, { findings, passed, score, stats } out. Findings are ordered worst-first.
export function auditHtml(html) {
  const text = html.trim()
  if (!text) throw new Error('Paste a page’s HTML first.')
  if (text.length > MAX_HTML_INPUT) throw new Error('Too long: this tool takes up to 1,000,000 characters.')
  if (!/<[a-z!]/i.test(text)) throw new Error('That does not look like HTML — paste the page source (view-source: in your browser).')
  const doc = new DOMParser().parseFromString(text, 'text/html')
  const findings = []
  const passed = []
  for (const check of CHECKS) {
    const result = check.run(doc, text)
    if (result === undefined) continue
    if (result === null) passed.push(check.passed)
    else findings.push(result)
  }
  const order = { high: 0, medium: 1, low: 2 }
  findings.sort((a, b) => order[a.severity] - order[b.severity])
  const score = Math.max(0, 100 - findings.reduce((n, f) => n + WEIGHTS[f.severity], 0))
  return {
    findings,
    passed,
    score,
    stats: {
      elements: doc.querySelectorAll('*').length,
      images: doc.querySelectorAll('img').length,
      scripts: doc.querySelectorAll('script').length,
      stylesheets: doc.querySelectorAll('link[rel="stylesheet"]').length,
      bytes: text.length,
    },
  }
}

// Server-side wins no static audit can see — shown as a checklist beside the results.
export const SERVER_CHECKLIST = [
  ['Compress responses', 'Serve HTML, CSS, JS and SVG with Brotli (or gzip) — typically 70–80% smaller on the wire.'],
  ['Cache static assets', 'Fingerprinted assets (app.3fa9.js) should ship Cache-Control: public, max-age=31536000, immutable.'],
  ['Use HTTP/2 or HTTP/3', 'Multiplexed connections remove the six-request-per-origin bottleneck of HTTP/1.1.'],
  ['Serve modern image formats', 'WebP or AVIF cut image bytes 30–60% versus JPEG/PNG at the same quality.'],
  ['Put assets behind a CDN', 'Latency dominates load time on mobile; serving from a nearby edge beats any code tweak.'],
  ['Measure the real thing', 'Check PageSpeed Insights / the Chrome UX Report for field LCP, CLS and INP — lab numbers differ.'],
]
