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

const titleOf = (session) => session.title || 'New conversation'

function ConversationItem({ session, active, onClick, onDelete }) {
  const title = titleOf(session)
  return (
    <div className="group relative">
      <button
        type="button"
        data-testid={`conv-${session.id}`}
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
          onDelete ? 'pr-10' : ''
        } ${
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
      {onDelete && (
        // Shown on hover or focus with a pointer; always on touch screens, which have no hover.
        <button
          type="button"
          data-testid={`delete-conv-${session.id}`}
          onClick={onDelete}
          title="Delete conversation"
          aria-label={`Delete conversation ${title}`}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-700/70 hover:text-red-400 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  )
}

function ConfirmDelete({ session, busy, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-conv-title"
        aria-describedby="delete-conv-body"
        data-testid="delete-conv-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-line/[0.08] bg-surface p-5 shadow-xl"
      >
        <h3 id="delete-conv-title" className="text-sm font-semibold text-zinc-100">Delete conversation?</h3>
        <p id="delete-conv-body" className="mt-2 text-sm text-zinc-400">
          “<span className="break-words text-zinc-200">{titleOf(session)}</span>” and all its messages will be
          deleted. This can’t be undone.
        </p>
        {error && (
          <p role="alert" data-testid="delete-conv-error" className="mt-3 text-sm text-red-400">{error}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            data-testid="delete-conv-cancel"
            onClick={onCancel}
            autoFocus
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="delete-conv-confirm"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConversationSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  open,
  onClose,
  // Optional: (sessionId) => Promise; a rejection's message is shown in the confirmation dialog.
  onDelete = null,
  loading = false,
  // Optional: the project's file tree, on a second tab.
  loadFiles = null,
  onOpenFile = null,
  openFilePath = null,
  project = null,
}) {
  const [tab, setTab] = useState('chats') // chats | files
  const files = tab === 'files' && loadFiles
  // The conversation awaiting confirmation: { session, busy, error }.
  const [confirm, setConfirm] = useState(null)
  // Close on Escape (the confirmation first, when it is open)
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (confirm) setConfirm(null)
      else onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, confirm])

  const confirmDelete = async () => {
    const { session } = confirm
    setConfirm({ session, busy: true, error: null })
    try {
      await onDelete(session.id)
      setConfirm(null)
    } catch (err) {
      setConfirm({ session, busy: false, error: err?.message || 'Could not delete the conversation.' })
    }
  }

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
              onDelete={onDelete ? () => setConfirm({ session: s, busy: false, error: null }) : null}
            />
          ))}
          {!loading && sessions.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">No conversations yet</div>
          )}
        </div>
        )}
      </aside>
      {confirm && (
        <ConfirmDelete
          session={confirm.session}
          busy={confirm.busy}
          error={confirm.error}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}
