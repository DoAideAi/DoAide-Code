// An unknown /tools/<slug>: say so and show every tool, instead of silently rendering the
// first AI tool under the wrong URL (bad for visitors and for crawlers alike).

import { useEffect } from 'react'
import ToolTabs from './ToolTabs.jsx'

export default function ToolsNotFound() {
  useEffect(() => {
    document.title = 'Tool not found | DoAide Code'
    // Keep crawlers from indexing mistyped URLs (the SPA rewrite answers them with 200).
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    robots.setAttribute('content', 'noindex')
    return () => robots.remove()
  }, [])
  return (
    <div data-testid="tools-not-found" className="h-[100dvh] overflow-y-auto">
      <nav aria-label="Site" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <a href="/" className="text-sm font-medium text-zinc-200 hover:text-zinc-50">
          DoAide Code
        </a>
        <a href="/tools" className="flex min-h-[44px] items-center rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]">
          All tools
        </a>
      </nav>
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 pt-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">That tool doesn't exist</h1>
          <p className="text-sm text-zinc-400">
            The address may be mistyped or the link out of date. Every tool we do have is below — all free, no
            sign-up.
          </p>
        </header>
        <ToolTabs activeSlug="" />
        <p className="text-sm text-zinc-400">
          Also worth a look: the <a href="/guides" className="text-sky-300 underline hover:text-sky-200">AI coding guides</a> and the{' '}
          <a href="/api-docs" className="text-sky-300 underline hover:text-sky-200">free REST API</a>.
        </p>
      </main>
    </div>
  )
}
