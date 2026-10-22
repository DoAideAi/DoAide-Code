// Shared chrome for the utility tool pages: skip link, site nav, heading, the tool switcher and
// the promo footer. The page's own controls and results render as children.

import { useEffect, useState } from 'react'
import { applyMeta } from './codeTools.js'
import { copyText } from '../copy.js'
import { currentTheme, followSystem, onThemeChange, saveTheme } from '../theme.js'
import FeedbackWidget from './FeedbackWidget.jsx'
import ToolTabs from './ToolTabs.jsx'

// The in-depth guide for a tool, linked under its description; slugs map to /guides pages.
const TOOL_GUIDES = {
  'code-formatter': ['/guides/best-free-online-code-formatter', 'picking and using a code formatter'],
  'json-formatter': ['/guides/best-free-online-code-formatter', 'picking and using a code formatter'],
  'regex-tester': ['/guides/online-regex-tester-and-builder', 'building and testing regular expressions'],
  'sql-formatter': ['/guides/free-online-sql-formatter-validator', 'formatting and validating SQL'],
  'share-code': ['/guides/code-snippet-sharing-tool', 'sharing code snippets as links'],
  'embed-code': ['/guides/code-snippet-sharing-tool', 'sharing code snippets as links'],
}

const SUN = 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'
const MOON = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z'

// Flips dark/light on the public pages and saves the choice; until then the system setting rules.
export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => followSystem(setTheme), [])
  useEffect(() => onThemeChange(setTheme), [])
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      data-testid="public-theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setTheme(saveTheme(next))}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px] sm:min-w-[36px]"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d={theme === 'dark' ? SUN : MOON} />
      </svg>
    </button>
  )
}

export default function ToolShell({ tool, children }) {
  useEffect(() => applyMeta(tool), [tool])
  const guide = TOOL_GUIDES[tool.slug]
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="/" className="flex min-h-[44px] items-center rounded-md border border-zinc-800 px-3 text-xs text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]">
            Sign in
          </a>
        </div>
      </nav>
      <main id="tool-main" tabIndex={-1} className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 pt-4 focus:outline-none">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">{tool.heading}</h1>
          <p className="text-sm text-zinc-400">
            {tool.description}
            {guide && (
              <>
                {' '}
                Guide:{' '}
                <a href={guide[0]} className="text-sky-300 underline hover:text-sky-200">
                  {guide[1]}
                </a>
                .
              </>
            )}
          </p>
        </header>
        <ToolTabs activeSlug={tool.slug} />
        {children}
        <div className="mt-4">
          <FeedbackWidget key={tool.slug} tool={tool.slug} />
        </div>
        <section className="mt-2 flex flex-col gap-2 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-400">
          <h2 className="text-sm font-medium text-zinc-200">Want AI help with this code?</h2>
          <p>
            The AI tools above explain, review, convert and test code for free. And DoAide Code itself is an AI coding
            assistant that works on your whole codebase, trying free local models first.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="text-sky-300 underline hover:text-sky-200">
              Learn more about DoAide Code
            </a>
            <a href="/all-tools" className="text-sky-300 underline hover:text-sky-200">
              All free tools
            </a>
            <a href="/guides" className="text-sky-300 underline hover:text-sky-200">
              Guides
            </a>
          </div>
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
