// Which page owns a /tools path: each utility has its own, every other slug is the AI tools page.
// Pages stay lazy so a visitor only downloads the one they open; moving between pages is a plain
// link (full navigation), only the AI tools switch among themselves in place.

import { lazy } from 'react'
import { slugForPath } from './utilTools.js'

const CodeToolsPage = lazy(() => import('./CodeToolsPage.jsx'))
const PAGES = {
  'diff-checker': lazy(() => import('./DiffPage.jsx')),
  'code-formatter': lazy(() => import('./FormatterPage.jsx')),
}

export default function ToolsRouter({ path = window.location.pathname }) {
  const Page = PAGES[slugForPath(path)] ?? CodeToolsPage
  return <Page />
}
