// Which page owns a /tools path: each utility has its own, the AI tool slugs (and /tools itself)
// share the AI tools page, and anything else is a not-found page with every tool on it.
// Pages stay lazy so a visitor only downloads the one they open; moving between pages is a plain
// link (full navigation), only the AI tools switch among themselves in place. The import map
// lives in pageLoaders.js so the entry can start the page's download before this chunk arrives.

import { lazy } from 'react'
import { TOOLS } from './codeTools.js'
import { PAGE_LOADERS, slugForPath } from './pageLoaders.js'

const CodeToolsPage = lazy(() => import('./CodeToolsPage.jsx'))
const ToolsNotFound = lazy(() => import('./ToolsNotFound.jsx'))
const PAGES = Object.fromEntries(Object.entries(PAGE_LOADERS).map(([slug, load]) => [slug, lazy(load)]))

export default function ToolsRouter({ path = window.location.pathname }) {
  const slug = slugForPath(path)
  const Page =
    PAGES[slug] ?? (slug === '' || TOOLS.some((t) => t.slug === slug) ? CodeToolsPage : ToolsNotFound)
  return <Page />
}
