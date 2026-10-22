import { usableTools } from '../store.js'

const DOT = {
  green: 'bg-emerald-400',
  red: 'bg-red-500',
  gray: 'bg-zinc-500',
}

// What the presence dot means, in words, under the name (like a messaging app's "online").
const PRESENCE = {
  green: 'Online',
  red: 'Disconnected',
  gray: 'Laptop offline',
}

const ICONS = {
  how: 'M12 18h.01M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.2-1.3 2.1V14',
  models: 'M4 7h16M4 12h16M4 17h10',
  usage: 'M5 19V11M12 19V5M19 19v-6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
}

function Icon({ name, always = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-[18px] w-[18px] ${always ? '' : 'sm:hidden'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

// A header button: an icon on phones, the word on wider screens (the word stays in the DOM for
// screen readers).
function Link({ testid, icon, onClick, children }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 sm:px-3"
    >
      {children}
      <Icon name={icon} />
    </button>
  )
}

// Not a <span>: the readiness dot is the Models button's only span.
function Label({ children }) {
  return <em className="sr-only not-italic sm:not-sr-only">{children}</em>
}

// A chat header: DoAide's avatar with a presence dot, its name and the project; How it works,
// Models, Usage and a refresh icon (it reloads the page, on phones and desktop) on the right.
export default function TopBar({
  project,
  color,
  busy,
  models = null,
  onModels = null,
  onUsage = null,
  onHow = null,
  localUrl = null,
  onRefresh = () => window.location.reload(),
}) {
  const ready = usableTools(models).length
  const presence = busy && color === 'green' ? 'Working…' : PRESENCE[color]
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0f1013]/90 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-semibold text-white">
            D
          </div>
          <span
            data-testid="status-dot"
            data-color={color}
            aria-label={`status ${color}`}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f1013] ${DOT[color]} ${busy && color === 'green' ? 'animate-pulse' : ''}`}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-zinc-100">Doaide Code</div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
            <span className="shrink-0">{presence}</span>
            <span aria-hidden="true">·</span>
            <span data-testid="project-pill" className="truncate">
              {project ?? 'no project'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        {localUrl && (
          <a
            data-testid="open-local"
            href={localUrl}
            title="This laptop runs DoAide: prompts there skip the server"
            className="mr-1 hidden shrink-0 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 sm:block"
          >
            Open on this laptop (faster)
          </a>
        )}
        {onHow && (
          <Link testid="how-toggle" icon="how" onClick={onHow}>
            <Label>How it works</Label>
          </Link>
        )}
        {onModels && (
          <Link testid="models-toggle" icon="models" onClick={onModels}>
            {models && <span className={`h-1.5 w-1.5 rounded-full ${ready ? DOT.green : DOT.red}`} />}
            <Label>Models</Label>
          </Link>
        )}
        {onUsage && (
          <Link testid="usage-toggle" icon="usage" onClick={onUsage}>
            <Label>Usage</Label>
          </Link>
        )}
        <button
          type="button"
          data-testid="refresh"
          aria-label="Refresh"
          title="Refresh"
          onClick={onRefresh}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
        >
          <Icon name="refresh" always />
        </button>
      </div>
    </header>
  )
}
