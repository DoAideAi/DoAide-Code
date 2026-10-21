// Hub only: shown while the laptop agent is offline. Prompts still queue; this explains
// why nothing answers yet and opens the one-click setup page.
export default function LaptopBanner({ onSetup }) {
  return (
    <div data-testid="laptop-banner" className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/60">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 text-xs text-zinc-400">
        <span>Your laptop is offline. Messages wait here until it reconnects.</span>
        <button
          type="button"
          onClick={onSetup}
          className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
        >
          Set up laptop
        </button>
      </div>
    </div>
  )
}
