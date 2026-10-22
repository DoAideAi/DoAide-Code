import { useEffect, useState } from 'react'

const KEY = 'doaide-onboarding-hidden'

function hidden() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function hide() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Storage unavailable: it shows again next time, which is harmless.
  }
}

// A command argument the server's shlex.split reads back as one word, spaces and all.
export function quoteArg(text) {
  return /[\s"'\\]/.test(text) ? `"${text.replace(/["\\]/g, '\\$&')}"` : text
}

// What still needs doing before the first question, from the live state (not a fixed tour):
// on the hub, a connected laptop; a model that can answer; a project to work on.
export function onboardingSteps({ mode, agentOnline, models, project }) {
  const steps = []
  if (mode === 'hub') steps.push({ id: 'laptop', done: !!agentOnline })
  steps.push({ id: 'model', done: !!models?.any_usable, checking: !models && (mode !== 'hub' || agentOnline) })
  steps.push({ id: 'project', done: !!project })
  return steps
}

function Mark({ done }) {
  return done ? (
    <span aria-label="done" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] text-emerald-300">
      ✓
    </span>
  ) : (
    <span aria-label="to do" className="h-5 w-5 shrink-0 rounded-full border border-zinc-600" />
  )
}

function Step({ id, done, title, children }) {
  return (
    <li data-testid={`onboarding-${id}`} data-done={done} className="flex gap-3 px-4 py-3">
      <Mark done={done} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-100'}`}>{title}</p>
        {!done && children && <div className="mt-1.5 text-xs text-zinc-400">{children}</div>}
      </div>
    </li>
  )
}

function ProjectStep({ loadProjects, onSwitchProject, onSend }) {
  const [projects, setProjects] = useState([])
  const [path, setPath] = useState('')
  useEffect(() => {
    if (!loadProjects) return undefined
    let active = true
    Promise.resolve(loadProjects())
      .then((body) => active && setProjects((body?.projects ?? []).map((p) => p.name)))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [loadProjects])
  const add = (e) => {
    e.preventDefault()
    const folder = path.trim()
    if (folder && onSend?.(`/add-project ${quoteArg(folder)}`)) setPath('')
  }
  return (
    <>
      {projects.length > 0 && onSwitchProject && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span>Pick one:</span>
          {projects.slice(0, 6).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSwitchProject(name)}
              className="rounded-full border border-line/[0.1] px-2.5 py-1 text-zinc-200 hover:border-sky-500/40"
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {onSend ? (
        <form onSubmit={add} className="flex gap-1.5">
          <input
            data-testid="onboarding-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={projects.length ? 'or paste a folder path' : 'Paste your code folder, e.g. ~/code/my-app'}
            aria-label="Project folder path"
            className="min-w-0 flex-1 rounded-lg border border-line/[0.1] bg-zinc-900 px-2.5 py-1.5 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500/50 focus:outline-none sm:text-xs"
          />
          <button
            type="submit"
            disabled={!path.trim()}
            className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            Add
          </button>
        </form>
      ) : (
        <p>Available once connected.</p>
      )}
    </>
  )
}

// The checklist above the first question: hidden once everything is done, or when dismissed.
export default function GettingStarted({
  mode = 'local',
  agentOnline = false,
  models = null,
  project = null,
  onSetup = null,
  onModels = null,
  onSend = null,
  loadProjects = null,
  onSwitchProject = null,
}) {
  const [dismissed, setDismissed] = useState(hidden)
  const steps = onboardingSteps({ mode, agentOnline, models, project })
  if (dismissed || steps.every((s) => s.done)) return null
  const left = steps.filter((s) => !s.done).length
  const done = (id) => steps.find((s) => s.id === id)?.done
  return (
    <section data-testid="getting-started" className="w-full max-w-md overflow-hidden rounded-2xl border border-line/[0.08] bg-zinc-900/60 text-left">
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Getting started</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Free models on your laptop answer first; Claude steps in only when they fall short. {left} step
            {left === 1 ? '' : 's'} left.
          </p>
        </div>
        <button
          type="button"
          data-testid="onboarding-hide"
          onClick={() => {
            hide()
            setDismissed(true)
          }}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-200"
        >
          Hide
        </button>
      </div>
      <ol className="divide-y divide-line/[0.06]">
        {mode === 'hub' && (
          <Step id="laptop" done={done('laptop')} title="Connect your laptop">
            DoAide runs on your own computer, where your code is.{' '}
            {onSetup && (
              <button type="button" onClick={onSetup} className="text-sky-300 underline">
                Set up laptop
              </button>
            )}
          </Step>
        )}
        <Step id="model" done={done('model')} title="A model ready to answer">
          {steps.find((s) => s.id === 'model').checking ? (
            'Checking what your laptop can run…'
          ) : (
            <>
              Install Ollama (free) or sign in to the Claude or Codex CLI.{' '}
              {onModels && (
                <button type="button" onClick={onModels} className="text-sky-300 underline">
                  See what&apos;s missing
                </button>
              )}
            </>
          )}
        </Step>
        <Step id="project" done={done('project')} title="Point DoAide at your code">
          <ProjectStep loadProjects={loadProjects} onSwitchProject={onSwitchProject} onSend={onSend} />
        </Step>
      </ol>
    </section>
  )
}
