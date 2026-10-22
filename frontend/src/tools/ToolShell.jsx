// Shared chrome for the utility tool pages: skip link, site nav, heading, the tool switcher and
// the promo footer. The page's own controls and results render as children.

import { useEffect, useState } from 'react'
import { applyMeta } from './codeTools.js'
import { copyText } from '../copy.js'
import ToolTabs from './ToolTabs.jsx'

export default function ToolShell({ tool, children }) {
  useEffect(() => applyMeta(tool), [tool])
  return (
    <div data-testid="tools-page" className="h-[100dvh] overflow-y-auto">
      <a
        href="#tool-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-md focus:bg-zinc-800 focus:px-3 focus:py-2 focus:text-sm focus:text-zinc-100"
      >
        Skip to the tool
      </a>
      <nav aria-label="Site" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <a href="/" className="text-sm font-medium text-zinc-200 hover:text-zinc-50">
          DoAide Code
        </a>
        <a href="/" className="flex min-h-[44px] items-center rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]">
          Sign in
        </a>
      </nav>
      <main id="tool-main" tabIndex={-1} className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 pt-4 focus:outline-none">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">{tool.heading}</h1>
          <p className="text-sm text-zinc-400">{tool.description}</p>
        </header>
        <ToolTabs activeSlug={tool.slug} />
        {children}
        <section className="mt-6 flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-400">
          <h2 className="text-sm font-medium text-zinc-200">Want AI help with this code?</h2>
          <p>
            The AI tools above explain, review, convert and test code for free. And DoAide Code itself is an AI coding
            assistant that works on your whole codebase, trying free local models first.
          </p>
          <a href="/" className="self-start text-sky-300 underline hover:text-sky-200">
            Learn more about DoAide Code
          </a>
        </section>
      </main>
    </div>
  )
}

// A small bordered button used across the utility pages.
export const BUTTON = 'min-h-[44px] rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]'

// Copies `text` on click and says so for a moment.
export function CopyButton({ text, label = 'Copy', testid }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        }
      }}
      className={BUTTON}
    >
      {done ? 'Copied' : label}
    </button>
  )
}
