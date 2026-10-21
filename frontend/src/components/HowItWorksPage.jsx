// Static: how DoAide answers a task. Figures are from the benchmark (docs/benchmarks.md,
// 2026-10-21); update them together.

const STEPS = [
  { name: 'Ollama', cost: 'free', detail: 'A local model on your laptop answers first.' },
  { name: 'Checks', cost: '', detail: 'The answer must be complete, on topic, and its edits must apply and pass lint.' },
  { name: 'Claude Sonnet', cost: '~$0.01', detail: 'Only if the local answer fails a check. You never see the failed one.' },
]

const MODELS = [
  ['qwen2.5-coder 7b', 'Ollama, on your laptop', 'Fast first try for simple tasks', 'free'],
  ['qwen2.5-coder 32b', 'Ollama, on your laptop', 'First try for harder tasks', 'free'],
  ['Claude Sonnet', 'Claude CLI, your login', 'Where failed local answers go', '~$0.012 / task'],
  ['Claude Opus', 'Claude CLI, your login', 'Complex tasks only', '~$0.026 / task'],
  ['Codex', 'Codex CLI, your login', 'Complex tasks only', 'not reported'],
]

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-zinc-400">{children}</div>
    </section>
  )
}

export default function HowItWorksPage({ onClose }) {
  return (
    <div data-testid="how-page" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-zinc-100">How it works</h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <Section title="Try free, then escalate">
          <ol data-testid="how-steps" className="flex flex-col gap-2 sm:flex-row">
            {STEPS.map((s, i) => (
              <li key={s.name} className="flex-1 rounded-lg border border-zinc-800 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-200">
                    {i + 1}. {s.name}
                  </span>
                  {s.cost && <span className="text-xs tabular-nums text-zinc-500">{s.cost}</span>}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{s.detail}</p>
              </li>
            ))}
          </ol>
          <p>
            Complex tasks skip the local try and go straight to Claude. Opus and Codex are kept for expert-level work,
            or used when Sonnet is not available.
          </p>
        </Section>

        <Section title="Runs on your laptop">
          <p>
            The models run on your laptop, inside your project folder. Prompts typed on the laptop never go through a
            server. The server only relays your phone: prompts sent from it are queued for the laptop, and replies sync
            back.
          </p>
        </Section>

        <Section title="Lean context">
          <p>
            Each model gets a conversation sized to its window. Local models keep the last 8–12 messages within about
            4–8k tokens, and Claude keeps up to 20 within 32k. Older messages are summarized, not dropped.
          </p>
        </Section>

        <Section title="Edits apply themselves">
          <p>
            Code changes are written to your files right away and shown as a short summary, with the diff one click
            away. There is no Apply or Discard step and no Undo button; type /undo in the chat to restore the files.
          </p>
        </Section>

        <Section title="What it costs">
          <p>
            Claude Pro and ChatGPT Plus (for Codex) are about $20 a month each. DoAide uses your own Claude and Codex
            logins, so it doesn't replace those plans. It answers most tasks for free on your laptop, so they last
            much longer. On the benchmark, routing answered 6 of 6 tasks locally for $0. A task Sonnet answers costs
            about $0.01 in API-equivalent usage, and DoAide alone on Claude used to cost $0.08.
          </p>
        </Section>

        <Section title="Supported models">
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table data-testid="how-models" className="w-full text-left text-xs">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-normal">Model</th>
                  <th className="px-3 py-2 font-normal">Runs via</th>
                  <th className="px-3 py-2 font-normal">Used for</th>
                  <th className="px-3 py-2 font-normal">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {MODELS.map(([name, via, use, cost]) => (
                  <tr key={name}>
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2 text-zinc-400">{via}</td>
                    <td className="px-3 py-2 text-zinc-400">{use}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-400">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">
            Costs are API-equivalent figures measured on this laptop. They count against your subscription, not a bill.
            Open Models for live numbers from your own tasks.
          </p>
        </Section>
      </div>
    </div>
  )
}
