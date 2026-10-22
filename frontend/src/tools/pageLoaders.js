// Every utility page's dynamic import, in one map the entry can see. main.jsx starts the import
// for the current path the moment the app boots, so the page's chunk downloads in parallel with
// the router instead of after it (import() dedupes, so the router's lazy() reuses the fetch).
// This module must stay tiny and import nothing: it is part of the first download on every page.

export const PAGE_LOADERS = {
  'diff-checker': () => import('./DiffPage.jsx'),
  'code-formatter': () => import('./FormatterPage.jsx'),
  'regex-tester': () => import('./RegexPage.jsx'),
  'json-formatter': () => import('./JsonPage.jsx'),
  'sql-formatter': () => import('./SqlPage.jsx'),
  'markdown-editor': () => import('./MarkdownPage.jsx'),
  'code-complexity': () => import('./ComplexityPage.jsx'),
  'code-templates': () => import('./TemplatesPage.jsx'),
  'embed-code': () => import('./EmbedPage.jsx'),
  'share-code': () => import('./SharePage.jsx'),
  'code-playground': () => import('./PlaygroundPage.jsx'),
  'jwt-decoder': () => import('./JwtPage.jsx'),
  'cron-builder': () => import('./CronPage.jsx'),
  base64: () => import('./Base64Page.jsx'),
  'css-gradient': () => import('./GradientPage.jsx'),
  'unit-converter': () => import('./UnitPage.jsx'),
  'code-screenshot': () => import('./ScreenshotPage.jsx'),
  'hash-generator': () => import('./HashPage.jsx'),
  'url-encoder': () => import('./UrlPage.jsx'),
  'timestamp-converter': () => import('./TimestampPage.jsx'),
  'lorem-ipsum': () => import('./LoremPage.jsx'),
  'string-utilities': () => import('./StringPage.jsx'),
  'json-path-finder': () => import('./JsonPathPage.jsx'),
  'html-preview': () => import('./HtmlPreviewPage.jsx'),
  'markdown-to-html': () => import('./MdHtmlPage.jsx'),
  'image-to-base64': () => import('./ImagePage.jsx'),
  'qr-code': () => import('./QrPage.jsx'),
}

// The slug in a path like /tools/diff-checker ('' for /tools).
export function slugForPath(pathname) {
  return pathname.replace(/^\/tools\/?/, '').replace(/\/$/, '')
}

// Kicks off the current page's chunk download; the AI tools page (and unknown slugs) are handled
// by the router itself. Failures are the router's to report, not the preload's.
export function preloadToolPage(pathname) {
  const load = PAGE_LOADERS[slugForPath(pathname)]
  if (load) load().catch(() => {})
}
