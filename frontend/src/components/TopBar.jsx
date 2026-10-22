import { useEffect, useRef, useState } from 'react'
import { currentTheme, followSystem, onThemeChange, saveTheme } from '../theme.js'
import { usableTools } from '../store.js'
import ProjectSwitcher from './ProjectSwitcher.jsx'

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
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  sidebar: 'M4 6h16M4 12h16M4 18h16',
  newchat: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  bell: 'M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  bellOff: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0M1 1l22 22',
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

// An icon button on every screen size.
function IconButton({ testid, label, icon, onClick, hint = null }) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-label={label}
      title={hint ? `${label} (${hint})` : label}
      aria-keyshortcuts={hint ? hint.replace('⌘', 'Meta+') : undefined}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
    >
      <Icon name={icon} always />
    </button>
  )
}

// Flips dark/light and saves the choice; until then it follows the system setting.
function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => followSystem(setTheme), [])
  // A choice made on the settings page.
  useEffect(() => onThemeChange(setTheme), [])
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <IconButton
      testid="theme-toggle"
      label={`Switch to ${next} mode`}
      icon={theme === 'dark' ? 'sun' : 'moon'}
      onClick={() => setTheme(saveTheme(next))}
    />
  )
}

// Phones only: the header buttons that do not fit, as a menu of labelled rows.
function MoreMenu({ items }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => root.current && !root.current.contains(e.target) && setOpen(false)
    const escape = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])
  if (!items.length) return null
  return (
    <div ref={root} className="relative sm:hidden">
      <button
        type="button"
        data-testid="more-toggle"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
      >
        <Icon name="more" always />
      </button>
      {open && (
        <div
          role="menu"
          data-testid="more-menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-line/[0.08] bg-zinc-900 py-1 text-sm shadow-xl"
        >
          {items.map(({ id, label, icon, onClick }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              data-testid={`more-${id}`}
              onClick={() => {
                setOpen(false)
                onClick()
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-zinc-200 hover:bg-zinc-800"
            >
              <span className="text-zinc-400">
                <Icon name={icon} always />
              </span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Not a <span>: the readiness dot is the Models button's only span.
function Label({ children }) {
  return <em className="sr-only not-italic sm:not-sr-only">{children}</em>
}

// A chat header: DoAide's avatar with a presence dot, its name and the project; How it works,
// Models, Usage, a dark/light toggle and a refresh icon (it reloads the page) on the right.
export default function TopBar({
  project,
  color,
  busy,
  models = null,
  onModels = null,
  onUsage = null,
  onHow = null,
  onSettings = null,
  onExport = null,
  onPalette = null,
  localUrl = null,
  onRefresh = () => window.location.reload(),
  onToggleSidebar = null,
  onNewChat = null,
  newChatHint = null,
  onSearch = null,
  muted = true,
  onToggleMute = null,
  loadProjects = null,
  onSwitchProject = null,
}) {
  const ready = usableTools(models).length
  const more = [
    onPalette && { id: 'palette', label: 'Command palette', icon: 'search', onClick: onPalette },
    onSearch && { id: 'search', label: 'Search', icon: 'search', onClick: onSearch },
    onToggleMute && { id: 'mute', label: muted ? 'Unmute notifications' : 'Mute notifications', icon: muted ? 'bellOff' : 'bell', onClick: onToggleMute },
    onModels && { id: 'models', label: 'Models', icon: 'models', onClick: onModels },
    onUsage && { id: 'usage', label: 'Usage', icon: 'usage', onClick: onUsage },
    onHow && { id: 'how', label: 'How it works', icon: 'how', onClick: onHow },
    onExport && { id: 'export', label: 'Export chat (Markdown)', icon: 'download', onClick: onExport },
    onSettings && { id: 'settings', label: 'Settings', icon: 'settings', onClick: onSettings },
  ].filter(Boolean)
  const presence = busy && color === 'green' ? 'Working…' : PRESENCE[color]
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line/[0.06] bg-surface/90 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleSidebar && (
          <IconButton testid="sidebar-toggle" label="Conversations" icon="sidebar" onClick={onToggleSidebar} />
        )}
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-semibold text-white">
            D
          </div>
          <span
            data-testid="status-dot"
            data-color={color}
            aria-label={`status ${color}`}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${DOT[color]} ${busy && color === 'green' ? 'animate-pulse' : ''}`}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-zinc-100">DoAide Code</div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
            <span className="shrink-0">{presence}</span>
            <span aria-hidden="true">·</span>
            <ProjectSwitcher project={project} loadProjects={loadProjects} onSwitch={onSwitchProject} />
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
        {onNewChat && (
          <IconButton testid="new-chat" label="New chat" icon="newchat" onClick={onNewChat} hint={newChatHint} />
        )}
        {/* On phones these are in the More menu. */}
        <div className="hidden items-center gap-1 sm:flex">
          {onSearch && (
            <IconButton testid="search-toggle" label="Search" icon="search" onClick={onSearch} />
          )}
          {onToggleMute && (
            <IconButton testid="mute-toggle" label={muted ? 'Unmute notifications' : 'Mute notifications'} icon={muted ? 'bellOff' : 'bell'} onClick={onToggleMute} />
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
          {onExport && <IconButton testid="export-chat" label="Export chat as Markdown" icon="download" onClick={onExport} />}
          {onSettings && <IconButton testid="settings-toggle" label="Settings" icon="settings" onClick={onSettings} />}
        </div>
        <ThemeToggle />
        <MoreMenu items={more} />
        <IconButton testid="refresh" label="Refresh" icon="refresh" onClick={onRefresh} />
      </div>
    </header>
  )
}
