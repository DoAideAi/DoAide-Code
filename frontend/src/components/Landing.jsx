import { useEffect, useState } from 'react'
import { fetchToolStats } from '../tools/codeTools.js'
import SignIn from './SignIn.jsx'
import Testimonials from './Testimonials.jsx'

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

const TOOL_LINKS = [
  ['explain-code', 'Explain code'],
  ['code-review', 'Code review'],
  ['find-bugs', 'Find bugs'],
  ['add-comments', 'Add comments'],
  ['convert-code', 'Convert code'],
  ['optimize-code', 'Optimize code'],
  ['generate-tests', 'Generate tests'],
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
    <div data-testid="landing" className="h-[100dvh] overflow-y-auto">
      <main className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-12 sm:py-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
            An AI coding assistant that tries free models first
          </h1>
          <p className="max-w-2xl text-base text-zinc-400">
            DoAide Code routes every task to the cheapest model that can handle it: a local model on your laptop,
            then Claude only when the local answer isn't good enough. Chat from your laptop or your phone.
          </p>
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

        <section aria-labelledby="tools" className="flex flex-col items-center gap-3 rounded-lg border border-zinc-800 p-6 text-center">
          <h2 id="tools" className="text-base font-medium text-zinc-100">
            Try it now, no sign-in
          </h2>
          <p className="max-w-xl text-sm text-zinc-400">
            Paste any code to explain it, review it, find bugs, add comments, convert it to another language,
            optimize it or generate unit tests. Free, and shareable on WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TOOL_LINKS.map(([slug, label]) => (
              <a
                key={slug}
                href={`/tools/${slug}`}
                className="min-h-[40px] rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                {label}
              </a>
            ))}
          </div>
          {analyzed && (
            <p data-testid="landing-stats" className="text-xs text-zinc-500">
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
