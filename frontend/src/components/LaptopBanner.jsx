import { useState } from 'react'

// Hub only: shown while the laptop agent is offline. Prompts still queue; this explains
// why nothing answers yet and hands out the agent command once, on request.
export default function LaptopBanner({ onCreateToken }) {
  const [setup, setSetup] = useState(null)
  const [error, setError] = useState(null)

  const connect = async () => {
    try {
      setSetup(await onCreateToken())
      setError(null)
    } catch {
      setError('Could not create a laptop token.')
    }
  }

  const command = setup
    ? `DOAIDE_HUB_URL=${setup.hub_url} DOAIDE_HUB_TOKEN=${setup.token} doaide-code agent`
    : ''

  return (
    <div data-testid="laptop-banner" className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/60">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-2 text-xs text-zinc-400">
        <div className="flex items-center justify-between gap-3">
          <span>Your laptop is offline. Messages wait here until it reconnects.</span>
          {!setup && (
            <button
              type="button"
              onClick={connect}
              className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              Connect laptop
            </button>
          )}
        </div>
        {error && <span className="text-red-300">{error}</span>}
        {setup && (
          <>
            <span>Run this on your laptop, in the Doaide Code backend environment:</span>
            <code
              data-testid="agent-command"
              className="block select-all overflow-x-auto whitespace-pre rounded-md border border-zinc-800 bg-black/40 p-2 font-mono text-[11px] text-zinc-300"
            >
              {command}
            </code>
          </>
        )}
      </div>
    </div>
  )
}
