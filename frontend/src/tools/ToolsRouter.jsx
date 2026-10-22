// Which page owns a /tools path: each utility has its own, the AI tool slugs (and /tools itself)
// share the AI tools page, and anything else is a not-found page with every tool on it.
// Pages stay lazy so a visitor only downloads the one they open; moving between pages is a plain
// link (full navigation), only the AI tools switch among themselves in place.

import { lazy } from 'react'
import { TOOLS } from './codeTools.js'
import { slugForPath } from './utilTools.js'

const CodeToolsPage = lazy(() => import('./CodeToolsPage.jsx'))
const ToolsNotFound = lazy(() => import('./ToolsNotFound.jsx'))
const PAGES = {
  'diff-checker': lazy(() => import('./DiffPage.jsx')),
  'code-formatter': lazy(() => import('./FormatterPage.jsx')),
  'regex-tester': lazy(() => import('./RegexPage.jsx')),
  'json-formatter': lazy(() => import('./JsonPage.jsx')),
  'sql-formatter': lazy(() => import('./SqlPage.jsx')),
  'markdown-editor': lazy(() => import('./MarkdownPage.jsx')),
  'code-complexity': lazy(() => import('./ComplexityPage.jsx')),
  'code-templates': lazy(() => import('./TemplatesPage.jsx')),
  'embed-code': lazy(() => import('./EmbedPage.jsx')),
  'share-code': lazy(() => import('./SharePage.jsx')),
  'code-playground': lazy(() => import('./PlaygroundPage.jsx')),
  'jwt-decoder': lazy(() => import('./JwtPage.jsx')),
  'cron-builder': lazy(() => import('./CronPage.jsx')),
  base64: lazy(() => import('./Base64Page.jsx')),
  'css-gradient': lazy(() => import('./GradientPage.jsx')),
  'unit-converter': lazy(() => import('./UnitPage.jsx')),
  'code-screenshot': lazy(() => import('./ScreenshotPage.jsx')),
  'hash-generator': lazy(() => import('./HashPage.jsx')),
  'url-encoder': lazy(() => import('./UrlPage.jsx')),
  'timestamp-converter': lazy(() => import('./TimestampPage.jsx')),
  'lorem-ipsum': lazy(() => import('./LoremPage.jsx')),
  'string-utilities': lazy(() => import('./StringPage.jsx')),
  'json-path-finder': lazy(() => import('./JsonPathPage.jsx')),
  'html-preview': lazy(() => import('./HtmlPreviewPage.jsx')),
}

export default function ToolsRouter({ path = window.location.pathname }) {
  const slug = slugForPath(path)
  const Page =
    PAGES[slug] ?? (slug === '' || TOOLS.some((t) => t.slug === slug) ? CodeToolsPage : ToolsNotFound)
  return <Page />
}
