import { useEffect, useState } from 'react'
import { TOOLS, fetchToolStats } from '../tools/codeTools.js'
import { UTIL_TOOLS } from '../tools/utilTools.js'
import HeroDemo from './HeroDemo.jsx'
import SignIn from './SignIn.jsx'
import Testimonials from './Testimonials.jsx'
import { ThemeToggle } from '../tools/ToolShell.jsx'

// The signed-out page: what DoAide Code is, and the sign-in button. Static, so it is also what
// search engines and link previews describe (with the tags in index.html).

const FEATURES = [
  ['Free models first', 'A coder model on your laptop (Ollama) answers first. Most tasks never cost a cent.'],
  ['Claude only when needed', 'An answer that fails its checks goes to Claude Sonnet. Opus and Codex are kept for the hardest work.'],
  ['Your code stays home', 'Models run on your laptop, inside your project. The server only relays prompts sent from your phone.'],
  ['Edits apply themselves', 'Changes are written to your files with a diff one click away. Type /undo to restore them.'],
  ['Chat from your phone', 'Send a prompt from anywhere: it is queued for your laptop and the reply syncs back.'],
  ['Uses your own logins', 'Claude and Codex run on your existing subscriptions. No API keys to paste in.'],
]

// The tools most visitors come for, shown big; everything else is in the category rows below.
const POPULAR = [
  ['explain-code', 'Explain code', 'Paste any snippet and get a plain-English, step-by-step explanation.'],
  ['code-review', 'AI code review', 'A senior-engineer review: correctness, security and performance, with fixes.'],
  ['json-formatter', 'JSON formatter', 'Validate JSON as you type and explore it as a collapsible tree.'],
  ['diff-checker', 'Diff checker', 'Paste two versions and see every changed line side by side.'],
]

const STEPS = [
  ['Sign in', 'With Google, on any device.'],
  ['Install the agent', 'One download for your laptop; it connects to your account.'],
  ['Ask', 'Type a task. DoAide picks the cheapest model that can do it.'],
]

export default function Landing({ clientId, onCredential, error }) {
  // How many snippets the free tools have analyzed; null until known (the line stays away).
  const [analyzed, setAnalyzed] = useState(null)
  useEffect(() => {
    let active = true
    fetchToolStats().then((count) => active && setAnalyzed(count))
    return () => {
      active = false
    }
  }, [])
  return (
    <div data-testid="landing" className="relative h-[100dvh] overflow-y-auto">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-md focus:bg-zinc-800 focus:px-3 focus:py-2 focus:text-sm focus:text-zinc-100"
      >
        Skip to main content
      </a>
      <div className="absolute right-4 top-3">
        <ThemeToggle />
      </div>
      <main id="landing-main" tabIndex={-1} className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-12 focus:outline-none sm:py-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            An AI coding assistant that tries free models first
          </h1>
          <p className="max-w-2xl text-base text-zinc-400">
            DoAide Code routes every task to the cheapest model that can handle it: a local model on your laptop,
            then Claude only when the local answer isn't good enough. Chat from your laptop or your phone.
          </p>
          <HeroDemo />
          <SignIn clientId={clientId} onCredential={onCredential} error={error} embedded />
          <p className="text-xs text-zinc-500">Free to use. Sign in with Google to connect your laptop.</p>
        </header>

        <section aria-labelledby="features" className="flex flex-col gap-4">
          <h2 id="features" className="text-center text-sm font-medium uppercase tracking-wide text-zinc-500">
            Why DoAide Code
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, text]) => (
              <li key={title} className="rounded-lg border border-zinc-800 p-4">
                <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps" className="flex flex-col gap-4">
          <h2 id="steps" className="text-center text-sm font-medium uppercase tracking-wide text-zinc-500">
            Get started in three steps
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-lg border border-zinc-800 p-4">
                <span className="text-xs tabular-nums text-zinc-500">{i + 1}</span>
                <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="tools" className="flex flex-col gap-4 rounded-lg border border-zinc-800 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 id="tools" className="text-base font-medium text-zinc-100">
              Free tools, no sign-in
            </h2>
            <p className="max-w-xl text-sm text-zinc-400">
              Fourteen free tools for everyday coding: AI that explains, reviews and converts code, a JavaScript and
              Python playground, snippet sharing, and instant utilities. Shareable on WhatsApp.
            </p>
          </div>

          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Popular</h3>
          <ul data-testid="landing-popular" className="grid gap-3 sm:grid-cols-2">
            {POPULAR.map(([slug, label, text]) => (
              <li key={slug}>
                <a href={`/tools/${slug}`} className="block h-full rounded-lg border border-zinc-700 p-4 hover:bg-zinc-900">
                  <span className="text-sm font-medium text-zinc-100">{label}</span>
                  <p className="mt-1 text-sm text-zinc-400">{text}</p>
                </a>
              </li>
            ))}
          </ul>

          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">AI code tools</h3>
          <ul data-testid="landing-ai-tools" className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <a
                  href={`/tools/${t.slug}`}
                  className="flex min-h-[40px] items-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>

          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Developer utilities</h3>
          <ul data-testid="landing-utils" className="flex flex-wrap gap-2">
            {UTIL_TOOLS.map((t) => (
              <li key={t.slug}>
                <a
                  href={`/tools/${t.slug}`}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  {t.label}
                  {t.isNew && (
                    <span className="rounded-full bg-sky-900/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                      New
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {analyzed && (
            <p data-testid="landing-stats" className="text-center text-xs text-zinc-500">
              <span className="tabular-nums">{analyzed.toLocaleString()}</span> snippet{analyzed === 1 ? '' : 's'} analyzed so far
            </p>
          )}
        </section>

        <Testimonials />

        <footer className="border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
          DoAide Code · part of <a href="https://doaide.com" className="underline hover:text-zinc-300">DoAide</a>
        </footer>
      </main>
    </div>
  )
}
