import { useEffect, useState } from 'react'
import FileTree from './FileTree.jsx'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function ConversationItem({ session, active, onClick }) {
  const title = session.title || 'New conversation'
  return (
    <button
      type="button"
      data-testid={`conv-${session.id}`}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? 'bg-sky-600/20 text-zinc-100'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span className="shrink-0 text-[11px] text-zinc-500">{formatTime(session.updated_at)}</span>
    </button>
  )
}

export default function ConversationSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  open,
  onClose,
  loading = false,
  // Optional: the project's file tree, on a second tab.
  loadFiles = null,
  onOpenFile = null,
  openFilePath = null,
  project = null,
}) {
  const [tab, setTab] = useState('chats') // chats | files
  const files = tab === 'files' && loadFiles
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Mobile overlay */}
      <div
        data-testid="sidebar-overlay"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/50 sm:hidden"
      />
      <aside
        data-testid="conversation-sidebar"
        className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line/[0.06] bg-surface sm:relative sm:z-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/[0.06] px-3 py-3">
          {loadFiles ? (
            <div role="tablist" className="flex gap-1">
              {[['chats', 'Chats'], ['files', 'Files']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  data-testid={`sidebar-tab-${id}`}
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    tab === id ? 'bg-zinc-800 font-semibold text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <h2 className="text-sm font-semibold text-zinc-200">Conversations</h2>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="new-chat-sidebar"
              onClick={onNewChat}
              title="New chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              data-testid="close-sidebar"
              onClick={onClose}
              title="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 sm:hidden"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {files ? (
          <div className="flex-1 overflow-y-auto p-2">
            <FileTree
              load={loadFiles}
              activePath={openFilePath}
              reloadKey={project}
              onOpen={(path) => {
                onOpenFile(path)
                if (window.innerWidth < 640) onClose()
              }}
            />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {loading && sessions.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">Loading...</div>
          )}
          {sessions.map((s) => (
            <ConversationItem
              key={s.id}
              session={s}
              active={s.id === activeSessionId}
              onClick={() => {
                onSelect(s.id)
                // On mobile, close the sidebar after selecting
                if (window.innerWidth < 640) onClose()
              }}
            />
          ))}
          {!loading && sessions.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">No conversations yet</div>
          )}
        </div>
        )}
      </aside>
    </>
  )
}
