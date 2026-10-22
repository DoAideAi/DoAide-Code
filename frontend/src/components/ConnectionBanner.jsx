// Shown when the connection to DoAide dropped: it reconnects on its own with backoff; Retry
// tries again at once.
export default function ConnectionBanner({ connecting, onRetry }) {
  return (
    <div data-testid="connection-banner" role="alert" className="shrink-0 border-b border-red-500/20 bg-red-500/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 text-xs text-red-200">
        <span>{connecting ? 'Reconnecting to DoAide…' : 'Can’t reach DoAide. Retrying automatically.'}</span>
        <button
          type="button"
          onClick={onRetry}
          disabled={connecting}
          className="shrink-0 rounded-md border border-red-500/40 px-2 py-1 hover:bg-red-500/10 disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
